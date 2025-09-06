"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const USER_ID = "550e8400-e29b-41d4-a716-446655440000" // Demo user ID

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const balance = Number.parseFloat(formData.get("balance") as string) || 0
  const is_connected = formData.get("is_connected") === "true"

  if (!name || !type) {
    return { error: "Nom et type requis" }
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert([
      {
        user_id: USER_ID,
        name,
        type,
        balance,
        is_connected,
      },
    ])
    .select()

  if (error) {
    return { error: error.message }
  }

  // Record initial balance in history
  if (data && data[0]) {
    await supabase.from("account_history").insert([
      {
        account_id: data[0].id,
        balance,
      },
    ])
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { success: true, data }
}

export async function getAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getAccountHistory(accountId: string) {
  const { data, error } = await supabase
    .from("account_history")
    .select("*")
    .eq("account_id", accountId)
    .order("recorded_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function syncAccount(accountId: string) {
  // Simulate bank sync - in real app, this would call banking API
  const randomChange = (Math.random() - 0.5) * 200 // Random change between -100 and +100

  const { data: account } = await supabase.from("accounts").select("balance").eq("id", accountId).single()

  if (account) {
    const newBalance = Math.max(0, account.balance + randomChange)

    const { error } = await supabase
      .from("accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)

    if (!error) {
      // Record in history
      await supabase.from("account_history").insert([
        {
          account_id: accountId,
          balance: newBalance,
        },
      ])
    }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { success: true }
}
