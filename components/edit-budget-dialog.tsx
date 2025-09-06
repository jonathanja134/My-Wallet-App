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
import { Edit } from "lucide-react"
import { updateBudgetCategory } from "@/app/actions/budget"
import type { BudgetCategory } from "@/lib/supabase"

interface EditBudgetDialogProps {
  category: BudgetCategory
}

export function EditBudgetDialog({ category }: EditBudgetDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await updateBudgetCategory(category.id, formData)

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
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la catégorie</DialogTitle>
          <DialogDescription>Modifiez les paramètres de votre catégorie budgétaire.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie</Label>
            <Input id="name" name="name" defaultValue={category.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_amount">Budget mensuel (€)</Label>
            <Input
              id="budget_amount"
              name="budget_amount"
              type="number"
              step="0.01"
              defaultValue={category.budget_amount}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <Input id="color" name="color" type="color" defaultValue={category.color} />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
