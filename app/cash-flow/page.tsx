import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { getBudgetCategories } from "@/app/actions/budget"
import { getTransactions } from "@/app/actions/expenses"
import { SankeyChart } from "@/components/cash-flow/sankey-chart"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabaseServer"
import { PageHeader } from "@/components/page-header"
import { AddBudgetDialog } from "@/components/add-budget-dialog"

export default async function CashFlowPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const [budgetResult, transactionsResult] = await Promise.all([getBudgetCategories(), getTransactions()])

  const budgetCategories = budgetResult.data || []
  const transactions = transactionsResult.data || []

  // Calculate income and expenses per category
  const categoryData = budgetCategories.map((category) => {
    const income = transactions
      .filter((t) => t.category_id === category.id && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter((t) => t.category_id === category.id && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      id: category.id,
      name: category.name,
      color: category.color,
      income,
      expenses,
    }
  })

  // Calculate totals
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const netCashFlow = totalIncome - totalExpenses

  // Top income categories
  const topIncomeCategories = categoryData
    .filter((cat) => cat.income > 0)
    .sort((a, b) => b.income - a.income)
    .slice(0, 5)

  // Top expense categories
  const topExpenseCategories = categoryData
    .filter((cat) => cat.expenses > 0)
    .sort((a, b) => b.expenses - a.expenses)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader actionButton={<AddBudgetDialog />} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cash Flow Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-gray-500">Revenus</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">+{totalIncome.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-gray-500">Dépenses</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">-{totalExpenses.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Minus className="h-5 w-5 text-blue-500 mr-2" />
                    <p className="text-sm text-gray-500">Flux net</p>
                  </div>
                  <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {netCashFlow >= 0 ? "+" : ""}
                    {netCashFlow.toLocaleString("fr-FR")} €
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sankey Diagram */}
        <div className="mb-8">
          <SankeyChart 
            categories={categoryData} 
            totalIncome={totalIncome} 
            totalExpenses={totalExpenses}
            transactions={transactions}
          />
        </div>

        {/* Top Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Income Categories */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Principales sources de revenus
              </h3>
              <div className="space-y-3">
                {topIncomeCategories.length > 0 ? (
                  topIncomeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-sm font-medium text-foreground/50">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">
                        +{cat.income.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground/50 text-center py-4">Aucun revenu enregistré</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Expense Categories */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                Principales catégories de dépenses
              </h3>
              <div className="space-y-3">
                {topExpenseCategories.length > 0 ? (
                  topExpenseCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-sm font-medium text-foreground/50">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        -{cat.expenses.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground/50 text-center py-4">Aucune dépense enregistrée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Insights */}
        <div className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Analyse du flux de trésorerie</h3>
              <div className="space-y-3">
                {netCashFlow > 0 ? (
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Flux de trésorerie positif</p>
                      <p className="text-sm text-green-700">
                        Excellent ! Vous économisez {netCashFlow.toLocaleString("fr-FR")} € ce mois. Continuez à
                        maintenir ce rythme d'épargne.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-orange-700">Flux de trésorerie négatif</p>
                      <p className="text-sm text-foreground/50">
                        Attention ! Vos dépenses dépassent vos revenus de{" "}
                        {Math.abs(netCashFlow).toLocaleString("fr-FR")} €. Considérez réduire certaines dépenses.
                      </p>
                    </div>
                  </div>
                )}

                {totalExpenses > 0 && totalIncome > 0 && (
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Taux d'épargne</p>
                      <p className="text-sm text-foreground/50">
                        Vous épargnez {((netCashFlow / totalIncome) * 100).toFixed(1)}% de vos revenus.
                        {(netCashFlow / totalIncome) * 100 >= 20
                          ? " Excellent taux d'épargne !"
                          : " Essayez d'atteindre un taux d'épargne de 20%."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
