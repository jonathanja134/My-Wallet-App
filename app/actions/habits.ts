"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const USER_ID = "550e8400-e29b-41d4-a716-446655440000" // Demo user ID

export async function createHabit(formData: FormData) {
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const color = formData.get("color") as string

  if (!name || !category) {
    return { error: "Nom et catégorie requis" }
  }

  const { data, error } = await supabase
    .from("habits")
    .insert([
      {
        user_id: USER_ID,
        name,
        description: description || null,
        category,
        color: color || "#3B82F6",
        progress: Array(31).fill(false), // Initialize with 31 days of false
      },
    ])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/habits")
  return { success: true, data }
}

export async function getHabits() {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function toggleHabitDay(habitId: string, dayIndex: number, completed: boolean) {
  // First get the current progress
  const { data: habit } = await supabase.from("habits").select("progress").eq("id", habitId).single()

  if (!habit) {
    return { error: "Habitude non trouvée" }
  }

  // Update the progress array
  const progress = habit.progress || Array(31).fill(false)
  progress[dayIndex] = completed

  const { error } = await supabase
    .from("habits")
    .update({
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteHabit(id: string) {
  const { error } = await supabase.from("habits").delete().eq("id", id).eq("user_id", USER_ID)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/habits")
  return { success: true }
}