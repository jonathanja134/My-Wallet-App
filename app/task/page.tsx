"use client";

import { useEffect, useState } from "react";
import { Task } from "@/lib/supabase";
import { addTask, deleteTask, toggleTask, getTasks } from "@/app/actions/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type HabitTrackerProps = {
  userId: string;
};

export default function HabitTracker({ userId }: HabitTrackerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean[]>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks(userId);
      setTasks(data);

      const initialChecked: Record<string, boolean[]> = {};
      data.forEach((task) => {
        initialChecked[task.id] = Array(31).fill(task.is_complete);
      });
      setChecked(initialChecked);
    };
    fetchTasks();
  }, [userId]);

  const handleCheck = async (taskId: string, dayIndex: number) => {
    const newValue = !checked[taskId][dayIndex];
    setChecked((prev) => ({
      ...prev,
      [taskId]: prev[taskId].map((val, i) => (i === dayIndex ? newValue : val)),
    }));
    await toggleTask(taskId, newValue);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const task = await addTask(userId, newTaskTitle.trim());
    setTasks((prev) => [...prev, task]);
    setChecked((prev) => ({ ...prev, [task.id]: Array(31).fill(false) }));
    setNewTaskTitle("");
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setChecked((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="mb-4 flex items-center space-x-4">
        <label className="font-semibold">Mois :</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="border rounded px-2 py-1"
        >
          {months.map((month, i) => (
            <option key={i} value={i}>{month}</option>
          ))}
        </select>
      </div>

      {/* Ajouter tâche */}
      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Nouvelle tâche"
          className="border rounded px-2 py-1 flex-1"
        />
        <Button onClick={handleAddTask}>Ajouter</Button>
      </div>

      {/* Liste des tâches */}
      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="border-0 shadow-sm">
            <CardHeader className="flex justify-between items-center">
              <CardTitle>{task.title}</CardTitle>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                Supprimer
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="table-auto border-collapse border border-gray-300 w-full">
                  <thead>
                    <tr>
                      {Array.from({ length: 31 }, (_, i) => (
                        <th key={i} className="border border-gray-300 px-2 py-1">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Array.from({ length: 31 }, (_, i) => (
                        <td key={i} className="border border-gray-300 px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={checked[task.id]?.[i] ?? false}
                            onChange={() => handleCheck(task.id, i)}
                            className="w-4 h-4"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
