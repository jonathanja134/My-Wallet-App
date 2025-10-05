"use server"

import { revalidatePath } from "next/cache"
import {createClient} from "@/lib/supabaseServer"

export async function createNote(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const category = formData.get("category") as string
  const color = formData.get("color") as string
  const tagsString = formData.get("tags") as string

  if (!title || !content || !category) {
    return { error: "Titre, contenu et catégorie requis" }
  }

  const tags = tagsString
    ? tagsString.split(",").map((tag) => tag.trim()).filter(Boolean)
    : []

  const { data, error } = await supabase
    .from("notes")
    .insert([
      {
        user_id: user.id,
        title,
        content,
        category,
        color: color || "#3B82F6",
        tags,
        is_pinned: false,
      },
    ])
    .select()

  if (error) return { error: error.message }

  revalidatePath("/notes")
  revalidatePath("/")
  return { success: true, data }
}

export async function getNotes() {
    const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return { error: error.message }

  return { data }
}

export async function updateNote(id: string, formData: FormData) {
    const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const category = formData.get("category") as string
  const color = formData.get("color") as string
  const tagsString = formData.get("tags") as string

  const tags = tagsString
    ? tagsString.split(",").map((tag) => tag.trim()).filter(Boolean)
    : []

  const { data, error } = await supabase
    .from("notes")
    .update({
      title,
      content,
      category,
      color,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()

  if (error) return { error: error.message }

  revalidatePath("/notes")
  return { success: true, data }
}

export async function deleteNote(id: string) {
    const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/notes")
  revalidatePath("/")
  return { success: true }
}

export async function togglePinNote(id: string, isPinned: boolean) {
    const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase
    .from("notes")
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/notes")
  revalidatePath("/")
  return { success: true }
}
