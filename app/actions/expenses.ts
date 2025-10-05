"use server"

import { revalidatePath } from "next/cache"
import { Transaction } from "@/lib/supabase"
import { createClient } from "@/lib/supabaseServer"


export async function getTransactions() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      accounts(name, type),
      budget_categories(name, color)
    `)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })


  if (error) {
    return { error: error.message }
  }

  return { data }
}


// Search transactions by description
export async function searchTransactions(query: string): Promise<Transaction[]> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Utilisateur non authentifié:", authError)
    return [] // always return an array to match the Promise<Transaction[]> type
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      accounts(name, type),
      budget_categories(name, color)
    `)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })

  if (error) {
    console.error("Erreur lors de la récupération des transactions:", error)
    return []
  }

  // Defensive check: ensure description exists
  return (data || []).filter(t =>
    t.description?.toLowerCase().includes(query.toLowerCase())
  )
}

// Create a new transaction
export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const description = formData.get("description") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const account_id = formData.get("account_id") as string
  const category_id = formData.get("category_id") as string
  const transaction_date = formData.get("transaction_date") as string
  const is_recurring = formData.get("is_recurring") === "true"

  if (!description || !amount || !transaction_date) {
    return { error: "Tous les champs requis doivent être remplis" }
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert([
      {
        user_id: user.id,
        description,
        amount,
        account_id: account_id || null,
        category_id: category_id || null,
        transaction_date,
        is_recurring,
      },
    ])
    .select()

  if (error) {
    return { error: error.message }
  }

  // Update account balance
  const { data: account } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .single()

  if (account) {
    const newBalance = account.balance + amount
    await supabase
      .from("accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account_id)
      .eq("user_id", user.id)

    // Record balance history
    await supabase.from("account_history").insert([
      {
        account_id,
        balance: newBalance,
      },
    ])
  }

  revalidatePath("/expenses")
  revalidatePath("/")
  return { success: true, data }
}

// Delete a transaction
export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  // Get transaction details first
  const { data: transaction } = await supabase
    .from("transactions")
    .select("amount, account_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (transaction) {
    // Update account balance (reverse the transaction)
    const { data: account } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", transaction.account_id)
      .eq("user_id", user.id)
      .single()

    if (account) {
      const newBalance = account.balance - transaction.amount
      await supabase
        .from("accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.account_id)
        .eq("user_id", user.id)
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/expenses")
  revalidatePath("/")
  return { success: true }
}
