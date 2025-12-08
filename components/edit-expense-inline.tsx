"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { updateTransaction, deleteTransaction } from "@/app/actions/expenses"
import { Trash2, Edit2, ShoppingCart, Car, Home, Heart, Gamepad2, DollarSign } from "lucide-react"
import type { Transaction, BudgetCategory } from "@/lib/supabase"

interface EditExpenseInlineProps {
  transaction: Transaction
  categories: BudgetCategory[]
  onUpdated?: (updated: Transaction) => void
  onDeleted?: (id: string) => void
}

const getCategoryIcon = (categoryName?: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    "Alimentation": <ShoppingCart className="h-5 w-5" />,
    "Transport": <Car className="h-5 w-5" />,
    "Logement": <Home className="h-5 w-5" />,
    "Santé": <Heart className="h-5 w-5" />,
    "Loisirs": <Gamepad2 className="h-5 w-5" />,
    "Revenus": <DollarSign className="h-5 w-5" />,
  }
  return iconMap[categoryName || ""] || <ShoppingCart className="h-5 w-5" />
}

export function EditExpenseInline({ transaction, categories, onUpdated, onDeleted }: EditExpenseInlineProps) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(transaction.description ?? "")
  const [amount, setAmount] = useState(String(transaction.amount ?? ""))
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "")
  const [date, setDate] = useState((transaction.transaction_date ?? "").split("T")[0] || new Date().toISOString().slice(0, 10))
  const [isRecurring, setIsRecurring] = useState(!!transaction.is_recurring)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryName = categories.find((c) => c.id === categoryId)?.name || transaction.budget_categories?.name || "Autres"
  const categoryIcon = getCategoryIcon(categoryName)

  async function save() {
    setLoading(true)
    const payload: any = {
      description,
      amount: parseFloat(amount),
      category_id: categoryId || null,
      transaction_date: date,
      is_recurring: isRecurring || false,
    }

    const res = await updateTransaction(transaction.id, payload)
    setLoading(false)

    if (res.success) {
      setEditing(false)
      onUpdated?.(res.data)
    } else {
      alert(res.error || "Update failed")
    }
  }

  function cancel() {
    setDescription(transaction.description ?? "")
    setAmount(String(transaction.amount ?? ""))
    setCategoryId(transaction.category_id ?? "")
    setDate((transaction.transaction_date ?? "").split("T")[0] || new Date().toISOString().slice(0, 10))
    setIsRecurring(!!transaction.is_recurring)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette transaction?")) return
    setDeleting(true)
    const res = await deleteTransaction(transaction.id)
    setDeleting(false)
    if (res.success) {
      onDeleted?.(transaction.id)
    } else {
      alert(res.error || "Delete failed")
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border hover:bg-accent/50 transition">
      {!editing ? (
        <>
          <div className="flex-1 flex items-center space-x-8">
            <div className="text-foreground">
              {categoryIcon}
            </div>
            <div>
              <div className="font-medium">{transaction.description}</div>
              <div className="text-sm text-gray-500">
                {categoryName} • {new Date(transaction.transaction_date).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
          <div className="w-28 text-right font-semibold px-4">
            {(transaction.amount ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 grid grid-cols-1 gap-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={transaction.description || "Description"}
            />
            <div className="flex space-x-2">
              <Input
                className="w-32"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.01"
              />
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center space-x-2">
                        <span>{getCategoryIcon(c.name)}</span>
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`rec-${transaction.id}`}
                  checked={isRecurring}
                  onCheckedChange={(v) => setIsRecurring(!!v)}
                />
                <label htmlFor={`rec-${transaction.id}`} className="text-sm">
                  Récurrente
                </label>
              </div>
            </div>
            <br/>
            <Button className="w-1/2" size="sm" variant="outline" onClick={cancel} disabled={loading}>
              Annuler
            </Button>
            <Button className="w-1/2" size="sm" onClick={save} disabled={loading}>
              {loading ? "..." : "Enregistrer"}
            </Button>
          </div>
          

          <div className="flex items-center space-x-2 ml-4">
            
          </div>
        </>
      )}
    </div>
  )
}