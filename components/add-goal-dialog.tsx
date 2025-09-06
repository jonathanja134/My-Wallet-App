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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createGoal } from "@/app/actions/goals"

export function AddGoalDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createGoal(formData)

    if (result.success) {
      setOpen(false)
    } else {
      alert(result.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-black text-white hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel objectif
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un objectif financier</DialogTitle>
          <DialogDescription>
            Définissez un nouvel objectif d'épargne avec un montant cible et une échéance.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'objectif</Label>
            <Input id="name" name="name" placeholder="Ex: Vacances, Voiture..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Montant cible (€)</Label>
            <Input id="target_amount" name="target_amount" type="number" step="0.01" placeholder="0.00" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_amount">Montant actuel (€)</Label>
            <Input
              id="current_amount"
              name="current_amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              defaultValue="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Date cible</Label>
            <Input id="target_date" name="target_date" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select name="category">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Immobilier">Immobilier</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Loisirs">Loisirs</SelectItem>
                <SelectItem value="Éducation">Éducation</SelectItem>
                <SelectItem value="Épargne">Épargne</SelectItem>
                <SelectItem value="Santé">Santé</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <Input id="color" name="color" type="color" defaultValue="#3B82F6" />
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
