"use client"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  CreditCard,
  ShoppingCart,
  Car,
  Home,
  Heart,
  Gamepad2,
  Trash2,
  Filter,
} from "lucide-react"
import { ExpensesClientProps, Session } from "@/lib/supabase"
import { deleteTransaction } from "@/app/actions/expenses"
import { EditExpenseInline } from "@/components/edit-expense-inline"
import type { Transaction, BudgetCategory } from "@/lib/supabase"



export default function ExpensesClient({ initialTransactions, user, categories }: ExpensesClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
  const timeout = setTimeout(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search-transactions?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${user}`, // envoie le token dans l'en-tête
        },
      })

      if (!res.ok) {
        console.error('API error', res.status)
        setLoading(false)
        return
      }

      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, 500)

  return () => clearTimeout(timeout)
}, [searchQuery, user])

  if (!user) return <p>Not authenticated</p>

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Alimentation: "bg-blue-100 text-blue-800",
      Logement: "bg-green-100 text-green-800",
      Transport: "bg-yellow-100 text-yellow-800",
      Loisirs: "bg-purple-100 text-purple-800",
      Santé: "bg-red-100 text-red-800",
      Revenus: "bg-emerald-100 text-emerald-800",
    }
    return colors[category] || "bg-gray-400 text-gray-900"
  }

  const getTransactionIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "alimentation":
        return ShoppingCart
      case "transport":
        return Car
      case "logement":
        return Home
      case "santé":
        return Heart
      case "loisirs":
        return Gamepad2
      default:
        return CreditCard
    }
  }

   async function handleDeleteTransaction(id: string) {
    await deleteTransaction(id)
  }

  const handleTransactionUpdated = (updated: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    )
  }

  return (
    <div className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Transactions récentes</CardTitle>
      </CardHeader>

      <div className="flex items-center justify-between">
        <Input
          type="text"
          placeholder="Rechercher une transaction..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4 m-2 w-full pl-5 border-gray-800"
        />
        <Button
          variant="outline"
          size="sm"
          className="bg-background m-4 text-gray-500 border-border"
        >
          <Filter className="h-4 w-4 m-2" />Filtres
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="space-y-0">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune dépense ce mois</p>
            ) : (
              transactions
                .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                .map((transaction) => (
                  <EditExpenseInline
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    onUpdated={handleTransactionUpdated}
                  />
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
