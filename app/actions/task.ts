import { supabase } from "@/lib/supabase";
import { Task } from "@/lib/supabase";

// Récupérer toutes les tâches
export const getTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Task[];
};

// Ajouter une tâche
export const addTask = async (userId: string, title: string): Promise<Task> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ user_id: userId, title, is_complete: false })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
};

// Supprimer une tâche
export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
};

// Mettre à jour le statut d’une tâche (case cochée)
export const toggleTask = async (taskId: string, isComplete: boolean): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ is_complete: isComplete })
    .eq("id", taskId);
  if (error) throw error;
};
