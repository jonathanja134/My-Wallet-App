"use client"

import type React from "react"

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
import { updateGoalProgress } from "@/app/actions/goals"

interface AddSavingsDialogProps {
  goalId: string
  goalName: string
  children: React.ReactNode
}

export function AddSavingsDialog({ goalId, goalName, children }: AddSavingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const amount = Number.parseFloat(formData.get("amount") as string)

    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant valide")
      setLoading(false)
      return
    }

    const result = await updateGoalProgress(goalId, amount)

    if (result.success) {
      setOpen(false)
    } else {
      alert(result.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter de l'épargne</DialogTitle>
          <DialogDescription>Ajoutez un montant à votre objectif "{goalName}"</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant à ajouter (€)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required autoFocus />
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
