"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const USER_ID = "550e8400-e29b-41d4-a716-446655440000" // Your demo user ID

export async function createGoal(formData: FormData) {
  // Build the goal object
  const goal = {
    name: formData.get("name"),
    target_amount: Number(formData.get("target_amount")),
    current_amount: Number(formData.get("current_amount") || 0),
    target_date: formData.get("target_date"),
    category: formData.get("category"),
    color: formData.get("color"),
    user_id: USER_ID,
  };

  // Insert into Supabase
  const { error } = await supabase.from("goals").insert([goal]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateGoalProgress(id: string, amount: number) {
  // Get the goal for this user
  const { data: goal } = await supabase
    .from("goals")
    .select("current_amount")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .single();

  if (!goal) {
    return { error: "Objectif non trouvé" }
  }

  const newAmount = goal.current_amount + amount

  const { data, error } = await supabase
    .from("goals")
    .update({
      current_amount: newAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", USER_ID)
    .select()

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { success: true, data }
}

export async function deleteGoal(id: string) {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", USER_ID)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/goals")
  return { success: true }
}