"use server"

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

export async function createBudgetCategory(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const name = formData.get("name") as string
  const budget_amount = Number.parseFloat(formData.get("budget_amount") as string)
  const color = formData.get("color") as string

  if (!name || !budget_amount) {
    return { error: "Nom et montant requis" }
  }

  const { data, error } = await supabase
    .from("budget_categories")
    .insert([
      {
        user_id: user.id,
        name,
        budget_amount,
        color: color || "#3B82F6",
      },
    ])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budget")
  return { success: true, data }
}

export async function updateBudgetCategory(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const name = formData.get("name") as string
  const budget_amount = Number.parseFloat(formData.get("budget_amount") as string)
  const color = formData.get("color") as string

  const { data, error } = await supabase
    .from("budget_categories")
    .update({
      name,
      budget_amount,
      color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budget")
  return { success: true, data }
}

export async function deleteBudgetCategory(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("budget_categories").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budget")
  return { success: true }
}

export async function getBudgetCategories() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié", data: [] }
  }

  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}