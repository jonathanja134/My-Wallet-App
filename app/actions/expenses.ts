"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { Transaction } from "@/app/types/transaction"

const USER_ID = "550e8400-e29b-41d4-a716-446655440000" // Demo user ID

export async function searchTransactions(query: string): Promise<Transaction[]> {
  const all = await getTransactions() // récupère toutes les transactions
  return all.data?.filter(t =>
    t.description.toLowerCase().includes(query.toLowerCase())
  ) || []
}

export async function getTransactions(): Promise<{ data?: Transaction[]; error?: string }> {
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      accounts(id, name),
      budget_categories(id, name)
    `)
    .eq("user_id", USER_ID)
    .order("transaction_date", { ascending: false })
    .limit(50)

  if (error) return { error: error.message }

  return { data }
}

export async function createTransaction(formData: FormData) {
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
        user_id: USER_ID,
        description,
        amount,
        account_id,
        category_id: category_id || null,
        transaction_date,
        is_recurring,
      },
    ])
    .select()

  if (error) return { error: error.message }

  // Update account balance
  const { data: account } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", account_id)
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

export async function deleteTransaction(id: string) {
  // Get transaction details first
  const { data: transaction } = await supabase
    .from("transactions")
    .select("amount, account_id")
    .eq("id", id)
    .single()

  if (transaction) {
    // Update account balance (reverse the transaction)
    const { data: account } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", transaction.account_id)
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
    }
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", USER_ID)

  if (error) return { error: error.message }

  revalidatePath("/expenses")
  revalidatePath("/")
  return { success: true }
}
