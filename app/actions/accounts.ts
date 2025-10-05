"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabaseServer"

// Get currently authenticated user ID
async function getCurrentUserId(token?: string): Promise<string | null> {
  if (token) {
    // If token is provided, use it to get the user
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.log("Error getting user with token:", error)
      return null
    }
    return user.id
  } else {
    // For client-side calls, use the current session
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.log("Error getting current user:", error)
      return null
    }
    return user.id
  }
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const balance = Number.parseFloat(formData.get("balance") as string) || 0
  const is_connected = formData.get("is_connected") === "true"

  if (!name || !type) return { error: "Nom et type requis" }

  const { data, error } = await supabase
    .from("accounts")
    .insert([
      {
        user_id: userId,
        name,
        type,
        balance,
        is_connected,
      },
    ])
    .select()

  if (error) return { error: error.message }

  // Record initial balance in history
  if (data && data[0]) {
    await supabase.from("account_history").insert([
      { account_id: data[0].id, balance },
    ])
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { success: true, data }
}

export async function getAccounts() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function getAccountHistory(accountId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  // Ensure account belongs to current user
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single()

  if (!account) return { error: "Account not found or access denied" }

  const { data, error } = await supabase
    .from("account_history")
    .select("*")
    .eq("account_id", accountId)
    .order("recorded_at", { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function syncAccount(accountId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  // Ensure account belongs to current user
  const { data: accountData } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single()

  if (!accountData) return { error: "Account not found or access denied" }

  // Simulate bank sync
  const randomChange = (Math.random() - 0.5) * 200
  const newBalance = Math.max(0, accountData.balance + randomChange)

  const { error } = await supabase
    .from("accounts")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", accountId)

  if (!error) {
    await supabase.from("account_history").insert([
      { account_id: accountId, balance: newBalance },
    ])
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { success: true }
}
