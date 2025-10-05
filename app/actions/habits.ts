"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabaseServer"


export async function createHabit(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const color = formData.get("color") as string

  if (!name || !category) return { error: "Nom et catégorie requis" }

  const { data, error } = await supabase
    .from("habits")
    .insert([
      {
        user_id: userId,
        name,
        description: description || null,
        category,
        color: color || "#3B82F6",
        progress: {}, // initialize as empty JSON
      },
    ])
    .select()

  if (error) return { error: error.message }

  revalidatePath("/habits")
  revalidatePath("/")
  return { success: true, data }
}

export async function getHabits() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function toggleHabitDay(
  habitId: string,
  dayIndex: number,
  newValue: boolean,
  month: number,
  year: number
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }
  const userId = user.id

  // Fetch current progress
  const { data: habit, error: getError } = await supabase
    .from("habits")
    .select("progress")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single()

  if (getError || !habit) return { error: "Habitude non trouvée" }

  // Ensure progress is initialized
  const progress = habit.progress || {}

  // Normalize month key (remove potential leading zeros)
  const monthKey = String(month)
  const yearKey = String(year)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  if (!progress[yearKey]) progress[yearKey] = {}
  if (!progress[yearKey][monthKey]) {
    progress[yearKey][monthKey] = Array(daysInMonth).fill(false)
  } else if (progress[yearKey][monthKey].length !== daysInMonth) {
    const arr = progress[yearKey][monthKey]
    progress[yearKey][monthKey] =
      arr.length < daysInMonth
        ? [...arr, ...Array(daysInMonth - arr.length).fill(false)]
        : arr.slice(0, daysInMonth)
  }

  // Update specific day
  progress[yearKey][monthKey][dayIndex] = newValue

  // Save back to DB
  const { error } = await supabase
    .from("habits")
    .update({
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitId)
    .eq("user_id", userId)

  if (error) return { error: error.message }

  revalidatePath("/habits")
  revalidatePath("/")
  return { success: true }
}

// ✅ Delete a habit and its progress
export async function deleteHabit(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const userId = user.id

  // Delete habit only (no longer need habit_progress table)
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: error.message }

  revalidatePath("/habits")
  revalidatePath("/")
  return { success: true }
}
