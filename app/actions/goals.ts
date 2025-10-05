"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// Helper: get user from access token
async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function createGoal(formData: FormData, token: string) {
  const user = await getUserFromToken(token)
  if (!user) return { success: false, error: "Not authenticated" }

  const goal = {
    name: formData.get("name"),
    target_amount: Number(formData.get("target_amount")),
    current_amount: Number(formData.get("current_amount") || 0),
    target_date: formData.get("target_date"),
    category: formData.get("category"),
    color: formData.get("color") || "#3B82F6",
    user_id: user.id,
  }

  const { error, data } = await supabase.from("goals").insert([goal]).select()
  if (error) return { success: false, error: error.message }

  revalidatePath("/goals")
  return { success: true, data }
}

export async function updateGoalProgress(id: string, amount: number, token: string) {
  const user = await getUserFromToken(token)
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: goal } = await supabase
    .from("goals")
    .select("current_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!goal) return { success: false, error: "Goal not found or access denied" }

  const newAmount = goal.current_amount + amount

  const { error, data } = await supabase
    .from("goals")
    .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()

  if (error) return { success: false, error: error.message }

  revalidatePath("/goals")
  return { success: true, data }
}

export async function getGoals(token: string) {
  const user = await getUserFromToken(token)
  if (!user) return { success: false, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteGoal(id: string, token: string) {
  const user = await getUserFromToken(token)
  if (!user) return { success: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/goals")
  return { success: true }
}
