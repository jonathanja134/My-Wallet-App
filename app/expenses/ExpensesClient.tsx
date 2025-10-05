"use client"
import { Transaction } from "@/lib/supabase"
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



export default function ExpensesClient({ initialTransactions, user }: ExpensesClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
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
            {transactions.map((transaction) => {
              const IconComponent = getTransactionIcon(transaction.budget_categories?.name || "Non catégorisé")
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-background transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-gray-100" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">{transaction.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getCategoryColor(transaction.budget_categories?.name || "Non catégorisé")}>
                          {transaction.budget_categories?.name || "Non catégorisé"}
                        </Badge>
                        <span className="text-xs text-gray-500">{transaction.accounts?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.amount > 0 ? "text-green-600" : "text-foreground"}`}>
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount.toLocaleString("fr-FR")} €
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(transaction.transaction_date).toLocaleDateString("fr-FR")}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
