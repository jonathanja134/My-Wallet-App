import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Target,
  CreditCard,
  Building,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { getAccounts } from "@/app/actions/accounts"
import { getTransactions } from "@/app/actions/expenses"
import { getBudgetCategories } from "@/app/actions/budget"
import { ExpenseHistoryChart } from "@/components/financial-charts"
import { getTotalExpenses, getTotalIncome,getTotalBudget } from "@/lib/utils"


export default async function Dashboard() {
  const [accountsResult, transactionsResult, budgetResult] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getBudgetCategories(),
  ])

  const accounts = accountsResult.data || []
  const transactions = transactionsResult.data || []
  const budgetCategories = budgetResult.data || []
  const totalExpenses = getTotalExpenses(transactions)
  const totalIncome = getTotalIncome(transactions)
  const totalBudget = getTotalBudget(budgetCategories)

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const monthlyChange = 2.4 // This would be calculated from historical data
  const savingsGoal = 75

  const recentTransactions = transactions.slice(0, 4).map((transaction) => ({
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.budget_categories?.name || "Non catégorisé",
    date: new Date(transaction.transaction_date).toLocaleDateString("fr-FR"),
  }))

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "compte courant":
        return <CreditCard className="h-4 w-4" />
      case "épargne":
        return <PiggyBank className="h-4 w-4" />
      case "investissement":
        return <TrendingUp className="h-4 w-4" />
      case "assurance":
        return <Building className="h-4 w-4" />
      case "cryptomonnaies":
        return <Coins className="h-4 w-4" />
      case "immobilier":
        return <Building className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

// Get month name for the card title
const monthName = transactions[0]
  ? new Date(transactions[0].transaction_date).toLocaleString("fr-FR", { month: "long" })
  : "Mois"

// Group expenses by day
const expenseHistory = transactions
  .filter((t) => t.amount < 0)
  .reduce((acc, t) => {
    const dateObj = new Date(t.transaction_date)
    const day = dateObj.getDate()
    const dateStr = day.toString() // keep `date` as string for TypeScript

    const existing = acc.find((e:any) => e.date === dateStr)
    if (existing) {
      existing.spent += Math.abs(t.amount)
    } else {
      acc.push({ date: dateStr, spent: Math.abs(t.amount) })
    }

    return acc
  }, [] as { date: string; spent: number }[])

// Sort days in ascending order
expenseHistory.sort((a:any, b:any) => Number(a.date) - Number(b.date))

// Prepare budget data
const budgetData = budgetCategories.map((cat) => ({
  category: cat.name,
  budget: cat.budget_amount || 0,
  spent: transactions
    .filter((t) => t.category_id === cat.id && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0),
}))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">My Wallet</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-900 font-medium">
                Tableau de bord
              </Link>
              <Link href="/budget" className="text-gray-500 hover:text-gray-900">
                Budget
              </Link>
              <Link href="/expenses" className="text-gray-500 hover:text-gray-900">
                Dépenses
              </Link>
              <Link href="/goals" className="text-gray-500 hover:text-gray-900">
                Objectifs
              </Link>
              <Link href="/accounts" className="text-gray-500 hover:text-gray-900">
                Comptes
              </Link>
            </nav>
            <Link href="/expenses">
              <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Net Worth Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Depense mensuel / Objectif</p>
                  <p className="text-3xl font-bold text-gray-900">{totalExpenses.toLocaleString("fr-FR")} € / {totalBudget.toLocaleString("fr-FR")}  </p>
                  <div className="flex items-center mt-2">
                    {monthlyChange > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${monthlyChange > 0 ? "text-green-600" : "text-red-600"}`}>
                      {monthlyChange > 0 ? "+" : ""}
                      {monthlyChange}% ce mois
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Objectif d'épargne</p>
                  <div className="w-32">
                    <Progress value={savingsGoal} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">{savingsGoal}% atteint</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts Overview */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Mes comptes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {accounts.map((account, index) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.name}</p>
                          <p className="text-sm text-gray-500">{account.balance.toLocaleString("fr-FR")} €</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">+1.2%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div>
            <Card className="border-0 shadow-sm mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Transactions récentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {recentTransactions.map((transaction, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-gray-900 text-sm">{transaction.description}</p>
                        <p
                          className={`font-semibold text-sm ${transaction.amount > 0 ? "text-green-600" : "text-gray-900"}`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toLocaleString("fr-FR")} €
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Financial Charts */}
        <ExpenseHistoryChart expenseHistory={expenseHistory} budgetData={budgetData} n ={monthName} />
        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/budget">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <PiggyBank className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-gray-900">Gérer le budget</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/expenses">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-gray-900">Ajouter dépense</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/goals">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-gray-900">Mes objectifs</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/accounts">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-gray-900">Ajouter compte</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
