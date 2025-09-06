"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const USER_ID = "550e8400-e29b-41d4-a716-446655440000" // Demo user ID

export async function createBudgetCategory(formData: FormData) {
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
        user_id: USER_ID,
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
    .eq("user_id", USER_ID)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budget")
  return { success: true, data }
}

export async function deleteBudgetCategory(id: string) {
  const { error } = await supabase.from("budget_categories").delete().eq("id", id).eq("user_id", USER_ID)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budget")
  return { success: true }
}

export async function getBudgetCategories() {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}
