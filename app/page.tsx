import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Wallet,
  PiggyBank,
  Target,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CheckCircle,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { getTotalBudget } from "@/lib/utils"
import { ThemeProvider } from "next-themes"
import { formatCurrency } from "@/lib/utils"
import { BlurredAmount } from "@/components/BlurredAmount"
import { createClient } from "@/lib/supabaseServer"
import { MobileNav } from "@/components/mobile-nav"
import { getTransactions } from "@/app/actions/expenses"
import { getBudgetCategories } from "@/app/actions/budget"
import dynamic from "next/dynamic"
import {Transaction} from "@/lib/supabase"

// Lazy load the heavy chart component
const ExpenseHistoryChart = dynamic(() => import("@/components/financial-charts").then(mod => ({ default: mod.ExpenseHistoryChart })), {
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border-0 shadow-sm rounded-lg p-6">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-gray-500">Chargement des graphiques...</p>
          </div>
        </div>
      </div>
      <div className="border-0 shadow-sm rounded-lg p-6">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-gray-500">Chargement des graphiques...</p>
          </div>
        </div>
      </div>
    </div>
  )
})


export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Optimize: Only fetch essential data for dashboard
  const [transactionsResult, budgetResult] = await Promise.all([
    getTransactions(),
    getBudgetCategories()
  ])

  // Use a consistent date for SSR to prevent hydration mismatch
  const now = new Date() // Fallback date for SSR
  const currentMonth = now.getMonth() 
  const currentYear = now.getFullYear()
  const transactions = transactionsResult.data || []
  const budgetCategories = budgetResult.data || []
  const CurrentMonthtransactions = transactions.filter((t) => {
      if (!t.transaction_date) return false
      const date = new Date(t.transaction_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
  const totalExpenses = CurrentMonthtransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = CurrentMonthtransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalBudget = getTotalBudget(budgetCategories)

  if (!user) {
    console.log("Please log in to view your dashboard.")
  }
  const savingsGoal = Math.round(totalExpenses / totalBudget * 100)

  const recentTransactions = transactions.slice(0, 4).map((transaction) => ({
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.budget_categories?.name || "Non catégorisé",
    date: new Date(transaction.transaction_date),
  }))

  const monthsOrder = [
    "janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"
  ];

  const sortedMonthlyExpenses = Array.from(groupTransactionsByMonth(transactions))
    .sort((a, b) => monthsOrder.indexOf(a[0]) - monthsOrder.indexOf(b[0]));


  function groupTransactionsByMonth(transactions: Transaction[]) {
    const map = new Map<string, number>()

    transactions
      .filter((t) => t.amount < 0)
      .forEach(t => {
        const date = new Date(t.transaction_date)
        const monthNamesFR = [
          "janvier", "février", "mars", "avril", "mai", "juin",
          "juillet", "août", "septembre", "octobre", "novembre", "décembre"
        ];
        const monthName = monthNamesFR[date.getMonth()];      
        const current = map.get(monthName) || 0
        map.set(monthName, current + Math.abs(t.amount))
      })

    return map
  }

  const currentMonthExpenses = transactions
    .filter(t => {
      const date = new Date(t.transaction_date)
      return t.amount < 0 && date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const pastMonthExpenses = transactions
    .filter(t => {
      const date = new Date(t.transaction_date)
      return t.amount < 0 && date.getMonth() === currentMonth - 1 && date.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const monthlyChange = pastMonthExpenses === 0 ? NaN : Math.round(((currentMonthExpenses - pastMonthExpenses) / pastMonthExpenses) * 100);

  const monthName =
    transactions.length > 0
      ? new Date(transactions[0].transaction_date).toLocaleString("fr-FR", { month: "long" })
      : "Mois"

  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.transaction_date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const expenseHistory = filteredTransactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => {
      const day = new Date(t.transaction_date).getDate()
      const dateStr = day.toString()
      const existing = acc.find((e: any) => e.date === dateStr)

      if (existing) {
        existing.spent += Math.abs(t.amount)
      } else {
        acc.push({ date: dateStr, spent: Math.abs(t.amount) })
      }
      return acc
    }, [] as { date: string; spent: number }[])
    .sort((a: any, b: any) => Number(a.date) - Number(b.date))

  const budgetData = budgetCategories.map((cat:any) => ({
    category: cat.name,
    budget: cat.budget_amount || 0,
    spent: transactions
      .filter((t) => t.category_id === cat.id && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
  }))

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="min-h-screen bg-background text-foreground text-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold whitespace-nowrap px-2 text-card-foreground">My Wallet</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="font-semibold flex whitespace-nowrap text-card-foreground">
                Tableau de bord
              </Link>
              <Link href="/budget" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Budget
              </Link>
              <Link href="/expenses" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Dépenses
              </Link>
              <Link href="/goals" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Objectifs
              </Link>
              <Link href="/task" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Habitudes
              </Link>
              <Link href="/notes" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                notes
              </Link>
              
            </nav>
            <Link href="/expenses">
              <Button size="sm" className="bg-background text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lcp-optimize">
        {/* Net Worth Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex sm:flex-row flex-col sm:items-center sm:justify-between w-full">
                <div className="sm:w-auto w-full">
                  <p className="text-sm text-gray-500 mb-1">Dépense mensuelle / Objectif</p>
                  <BlurredAmount totalExpenses={totalExpenses} totalBudget={totalBudget} />
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
                <div className="text-right whitespace-nowrap">
                   <div className="w-64 flex items-center justify-end mt-2">
                   <Progress value={savingsGoal} className="h-2" />
                   <p className="text-xs text-gray-500 p-4">{savingsGoal}% atteint</p>
                 </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Financial Charts */}
        <ExpenseHistoryChart 
          expenseHistory={expenseHistory} 
          budgetData={budgetData}
          monthName={monthName}
          transactions={transactions}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Recent Transactions */}
          <div className="flex-1">
            <CardContent className="p-0">
            <Card className="border-0 shadow-sm h-full">
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-0">
                {recentTransactions.map((transaction, index) => (
                  <div key={index} className="p-4 hover:bg-gray-800 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-foreground text-sm">{transaction.description}</p>
                      <p
                        className={`font-semibold text-sm ${
                          transaction.amount > 0 ? "text-green-600" : "text-foreground"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {formatCurrency(transaction.amount)} €
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category}
                      </Badge>
                      <p className="text-xs text-foreground">
                        {transaction.date.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          </CardContent>
              
          </div>    
          {/* Historical Expenses */}
          <div className="flex-1">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Historique des dépenses par mois</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-sm font-medium text-foreground">Mois</th>
                      <th className="py-2 px-4 text-sm font-medium text-foreground">Dépense (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMonthlyExpenses.map(([month, amount]) => (
                      <tr key={month} className="hover:bg-gray-800 ">
                        <td className="py-2 px-4 text-sm text-foreground">{month}</td>
                        <td className="py-2 px-4 text-sm text-foreground">-{formatCurrency(amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          {/* Historical Income */}
          <div className="flex-1">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Historique des revenus par mois</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-sm font-medium text-foreground">Mois</th>
                      <th className="py-2 px-4 text-sm font-medium text-foreground">Revenus (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      transactions
                        .filter(t => t.amount > 0)
                        .reduce((map, t) => {
                          const monthName = new Date(t.transaction_date).toLocaleString("fr-FR", { month: "long" })
                          map.set(monthName, (map.get(monthName) || 0) + t.amount)
                          return map
                        }, new Map<string, number>())as [string, number][]).map(([month, amount]) => (
                      <tr key={month} className="hover:bg-gray-800">
                        <td className="py-2 px-4 text-sm text-foreground">{month}</td>
                        <td className="py-2 px-4 text-sm text-foreground">{formatCurrency(amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/budget">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <PiggyBank className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Gérer le budget</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/expenses">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Ajouter dépense</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/goals">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Mes objectifs</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/task">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Ajouter habitude</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/notes">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Ajouter note</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div> 
    </ThemeProvider>
  )
}
