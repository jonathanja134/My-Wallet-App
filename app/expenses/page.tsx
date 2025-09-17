import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  CreditCard,
  ShoppingCart,
  Car,
  Home,
  Heart,
  Gamepad2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import ExpensesClient from "./ExpensesClient"
import { getTransactions, deleteTransaction } from "@/app/actions/expenses"
import { getAccounts } from "@/app/actions/accounts"
import { getBudgetCategories } from "@/app/actions/budget"



export default async function Expenses() {
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getBudgetCategories(),
  ])

  //get transaction from research query


  const transactions = transactionsResult.data || []
  const accounts = accountsResult.data || []
  const categories = categoriesResult.data || []

  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <Link href="/" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Dépenses</h1>
            </div>
            <AddExpenseDialog accounts={accounts} categories={categories} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Dépenses ce mois</p>
              <p className="text-2xl font-bold text-red-600">-{totalExpenses.toLocaleString("fr-FR")} €</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Revenus ce mois</p>
              <p className="text-2xl font-bold text-green-600">+{totalIncome.toLocaleString("fr-FR")} €</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Solde net</p>
              <p
                className={`text-2xl font-bold ${(totalIncome - totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {totalIncome - totalExpenses >= 0 ? "+" : ""}
                {(totalIncome - totalExpenses).toLocaleString("fr-FR")} €
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div>
                <div>
                  <div className="relative">
                    <ExpensesClient initialTransactions={transactions} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Export Options */}
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white text-gray-700 border-gray-200">
              Exporter CSV
            </Button>
            <Button variant="outline" className="bg-white text-gray-700 border-gray-200">
              Exporter PDF
            </Button>
          </div>
        </div>
      </main>
    </div>
  )

}