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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { createAccount } from "@/app/actions/accounts"

interface AddAccountDialogProps {
  children?: React.ReactNode
  accountType?: string
}

export function AddAccountDialog({ children, accountType }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createAccount(formData)

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
        {children || (
          <Button size="sm" className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter compte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un compte</DialogTitle>
          <DialogDescription>Ajoutez un nouveau compte à votre portefeuille financier.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du compte</Label>
            <Input id="name" name="name" placeholder="Ex: Compte Courant BNP..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de compte</Label>
            <Select name="type" defaultValue={accountType} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Compte courant">Compte courant</SelectItem>
                <SelectItem value="Épargne">Épargne</SelectItem>
                <SelectItem value="Investissement">Investissement</SelectItem>
                <SelectItem value="Assurance">Assurance</SelectItem>
                <SelectItem value="Cryptomonnaies">Cryptomonnaies</SelectItem>
                <SelectItem value="Immobilier">Immobilier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Solde initial (€)</Label>
            <Input id="balance" name="balance" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="is_connected" name="is_connected" value="true" />
            <Label htmlFor="is_connected">Compte connecté automatiquement</Label>
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
