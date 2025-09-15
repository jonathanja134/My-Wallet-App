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
import { ThemeProvider } from "next-themes"
import { formatCurrency } from "@/lib/utils"



export default async function Dashboard() {
  const [accountsResult, transactionsResult, budgetResult] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getBudgetCategories(),
  ])
  const now = new Date()
  const currentMonth = now.getMonth() 
  const currentYear = now.getFullYear()
  const accounts = accountsResult.data || []
  const transactions = transactionsResult.data || []
  const budgetCategories = budgetResult.data || []
  const totalExpenses = getTotalExpenses(transactions, now.getMonth(), now.getFullYear())
  const totalIncome = getTotalIncome(transactions)
  const totalBudget = getTotalBudget(budgetCategories)

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const savingsGoal = Math.round(totalExpenses/totalBudget*100)

  const recentTransactions = transactions.slice(0, 4).map((transaction) => ({
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.budget_categories?.name || "Non catégorisé",
    date: new Date(transaction.transaction_date),
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

  const monthsOrder = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre"
];

const sortedMonthlyExpenses = Array.from(groupTransactionsByMonth(transactions))
  .sort((a, b) => monthsOrder.indexOf(a[0]) - monthsOrder.indexOf(b[0]));

  type Transaction = {
  id: string
  amount: number
  transaction_date: string
  category_id?: string
  budget_categories?: { name: string }
  accounts?: { name: string }
  description: string
}

function groupTransactionsByMonth(transactions: Transaction[]) {
  const map = new Map<string, number>()

  transactions
    .filter((t) => {return t.amount < 0})
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
// get this month sum of expenses
const currentMonthExpenses = transactions
  .filter(t => {
    const date = new Date(t.transaction_date)
    return t.amount < 0 && date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // get past month sum of expenses
const pastMonthExpenses = transactions
  .filter(t => {
    const date = new Date(t.transaction_date)
    return t.amount < 0 && date.getMonth() === currentMonth-1 && date.getFullYear() === currentYear
  })
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)

const monthlyChange = pastMonthExpenses === 0 ? NaN : Math.round(((currentMonthExpenses - pastMonthExpenses) / pastMonthExpenses) * 100);


// Get month name for the card title
const monthName =
  transactions.length > 0
    ? new Date(transactions[0].transaction_date).toLocaleString("fr-FR", { month: "long" })
    : "Mois"


const filteredTransactions = transactions.filter((t) => {
  const date = new Date(t.transaction_date)
  return date.getMonth() === currentMonth && date.getFullYear() === currentYear
})

// Group expenses by day uniquement sur les transactions du mois courant
const expenseHistory = filteredTransactions
  .filter((t) => t.amount < 0)
  .reduce((acc, t) => {
    const day = new Date(t.transaction_date).getDate()
    const dateStr = day.toString()
    const existing = acc.find((e) => e.date === dateStr)

    if (existing) {
      existing.spent += Math.abs(t.amount)
    } else {
      acc.push({ date: dateStr, spent: Math.abs(t.amount) })
    }
    return acc
  }, [] as { date: string; spent: number }[])
  .sort((a, b) => Number(a.date) - Number(b.date))

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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <div className="min-h-screen bg-background text-foreground text-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-card-foreground">My Wallet</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-card-foreground font-medium">
                Tableau de bord
              </Link>
              <Link href="/budget" className="text-secondary-foreground hover:text-accent-foreground">
                Budget
              </Link>
              <Link href="/expenses" className="text-secondary-foreground hover:text-accent-foreground">
                Dépenses
              </Link>
              <Link href="/goals" className="text-secondary-foreground hover:text-accent-foreground">
                Objectifs
              </Link>
              <Link href="/task" className="text-secondary-foreground hover:text-accent-foreground">
                Task
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Net Worth Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex sm:flex-row flex-col sm:items-center sm:justify-between w-full">
                <div className="sm:w-auto w-full">
                  <p className="text-sm text-gray-500 mb-1">Dépense mensuelle / Objectif</p>
                  <p className="text-2xl md:text-3xl font-bold test-secondary-foreground">
                    {formatCurrency(totalExpenses)} / {formatCurrency(totalBudget)}
                  </p>
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
        <ExpenseHistoryChart expenseHistory={expenseHistory} budgetData={budgetData} monthName={monthName}/>
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
                        }, new Map<string, number>())
                    ).map(([month, amount]) => (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <Link href="/accounts">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="font-medium text-foreground">Ajouter compte</p>
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
