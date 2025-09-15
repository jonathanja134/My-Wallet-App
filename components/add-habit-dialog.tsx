"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createHabit } from "@/app/actions/habits"

export function AddHabitDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState("#3B82F6")

  const habitCategories = [
    { name: "Santé", color: "#10B981" },
    { name: "Fitness", color: "#F59E0B" },
    { name: "Productivité", color: "#3B82F6" },
    { name: "Apprentissage", color: "#8B5CF6" },
    { name: "Bien-être", color: "#EC4899" },
    { name: "Social", color: "#06B6D4" },
    { name: "Créativité", color: "#F97316" },
    { name: "Finance", color: "#84CC16" },
  ]

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createHabit(formData)

    if (result.success) {
      setOpen(false)
    } else {
      alert(result.error)
    }
    setLoading(false)
  }
  const [active, setActive] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-background text-white hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle habitude
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une habitude</DialogTitle>
          <DialogDescription>Créez une nouvelle habitude à suivre quotidiennement.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'habitude</Label>
            <Input id="name" name="name" placeholder="Ex: Boire 2L d'eau, Méditer 10min..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea id="description" name="description" placeholder="Décrivez votre habitude..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select name="category" required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {habitCategories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <div className="grid grid-cols-8 gap-2">
              {habitCategories.map((category) => (
                <label key={category.color} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={category.color}
                    className="sr-only"
                    defaultChecked={category.color === "#3B82F6"}
                    onChange={() => setSelectedColor(category.color)}
                  />
                  <div
                    className={`w-8 h-8 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors`}
                    style={{ backgroundColor: category.color }}
                  ></div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
