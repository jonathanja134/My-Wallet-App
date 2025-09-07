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
import { getTransactions, deleteTransaction } from "@/app/actions/expenses"
import { getAccounts } from "@/app/actions/accounts"
import { getBudgetCategories } from "@/app/actions/budget"



export default async function Expenses() {
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getBudgetCategories(),
  ])

  const transactions = transactionsResult.data || []
  const accounts = accountsResult.data || []
  const categories = categoriesResult.data || []

  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)


  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Alimentation: "bg-blue-100 text-blue-800",
      Logement: "bg-green-100 text-green-800",
      Transport: "bg-yellow-100 text-yellow-800",
      Loisirs: "bg-purple-100 text-purple-800",
      Santé: "bg-red-100 text-red-800",
      Revenus: "bg-emerald-100 text-emerald-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
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
    "use server"
    await deleteTransaction(id)
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <Link href="/" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Dépenses</h1>
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
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Rechercher une transaction..." className="pl-10 border-gray-200" />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-white text-gray-700 border-gray-200">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {transactions.map((transaction) => {
                const IconComponent = getTransactionIcon(transaction.budget_categories?.name || "Non catégorisé")
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
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
                        <p className={`font-semibold ${transaction.amount > 0 ? "text-green-600" : "text-gray-900"}`}>
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toLocaleString("fr-FR")} €
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(transaction.transaction_date).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <form action={handleDeleteTransaction.bind(null, transaction.id)}>
                        <Button variant="ghost" size="sm" type="submit">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

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