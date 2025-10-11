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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { createTransaction } from "@/app/actions/expenses"
import type { Account, BudgetCategory } from "@/lib/supabase"

interface AddExpenseDialogProps {
  categories: BudgetCategory[]
}

export function AddExpenseDialog({ categories }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createTransaction(formData)

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
          Ajouter dépense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une dépense</DialogTitle>
          <DialogDescription>Ajoutez une nouvelle transaction à votre historique.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Ex: Courses, Restaurant..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Catégorie</Label>
            <Select name="category_id">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_date">Date</Label>
            <Input
              id="transaction_date"
              name="transaction_date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="is_recurring" name="is_recurring" value="true" />
            <Label htmlFor="is_recurring">Transaction récurrente</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
