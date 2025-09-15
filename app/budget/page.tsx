import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Wallet, ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, Trash2 } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { AddBudgetDialog } from "@/components/add-budget-dialog"
import { EditBudgetDialog } from "@/components/edit-budget-dialog"
import { getBudgetCategories, deleteBudgetCategory } from "@/app/actions/budget"
import { getTransactions } from "@/app/actions/expenses"
import { formatCurrency } from "@/lib/utils"

export default async function Budget() {
  const [budgetResult, transactionsResult] = await Promise.all([getBudgetCategories(), getTransactions()])

  const budgetCategories = budgetResult.data || []
  const transactions = transactionsResult.data || []

  // Calculate spent amounts per category
  const categorySpending = budgetCategories.map((category) => {
    const spent = transactions
      .filter((t) => t.category_id === category.id && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      ...category,
      budget: category.budget_amount,
      spent,
    }
  })

  const totalBudget = categorySpending.reduce((sum, cat) => sum + cat.budget_amount, 0)
  const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.spent, 0)

  const remainingBudget = totalBudget - totalSpent

  const getStatusIcon = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100
    if (percentage > 100) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (percentage > 80) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStatusColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100
    if (percentage > 100) return "text-red-600"
    if (percentage > 80) return "text-yellow-600"
    return "text-green-600"
  }

  async function handleDeleteCategory(id: string) {
    "use server"
    await deleteBudgetCategory(id)
  }

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
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Budget</h1>
            </div>
            <AddBudgetDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budget Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-foreground mb-1">Budget total</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)} €</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-foreground mb-1">Dépensé</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpent)} €</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-foreground mb-1">Restant</p>
                  <p className={`text-2xl font-bold ${remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(remainingBudget)} €
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Progression globale</span>
                  <span className="text-sm font-medium text-gray-900">
                    {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
                  </span>
                </div>
                <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categorySpending.map((category) => {
            const percentage =
              category.budget_amount > 0 ? Math.round((category.spent / category.budget_amount) * 100) : 0
            const remaining = category.budget_amount - category.spent

            return (
              <Card key={category.id} className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: category.color }}></div>
                      {category.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(category.spent, category.budget_amount)}
                      <EditBudgetDialog category={category} />
                      <form action={handleDeleteCategory.bind(null, category.id)}>
                        <Button variant="ghost" size="sm" type="submit">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Dépensé</span>
                      <span className="font-semibold text-foreground">{formatCurrency(category.spent)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Budget</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(category.budget_amount)} €
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Restant</span>
                      <span className={`font-semibold ${getStatusColor(category.spent, category.budget_amount)}`}>
                        {formatCurrency(remaining)} €
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">Progression</span>
                        <Badge variant={percentage > 100 ? "destructive" : percentage > 80 ? "secondary" : "default"}>
                          {percentage}%
                        </Badge>
                      </div>
                      <Progress value={Math.min(percentage, 100)} className="h-2" />
                      {percentage > 100 && (
                        <p className="text-xs text-red-600 mt-1">Dépassement de {percentage - 100}%</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Budget Tips */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Conseils d'optimisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categorySpending
                  .map((category) => {
                    const percentage = (category.spent / category.budget_amount) * 100
                    if (percentage > 100) {
                      return (
                        <div key={category.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          <p className="text-sm text-foreground">
                            <strong>{category.name} :</strong> Vous avez dépassé votre budget de{" "}
                            {(percentage - 100).toFixed(1)}%. Considérez réduire les dépenses dans cette catégorie.
                          </p>
                        </div>
                      )
                    } else if (percentage < 50) {
                      return (
                        <div key={category.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <p className="text-sm text-gray-700">
                            <strong>{category.name} :</strong> Vous économisez{" "}
                            {(category.budget_amount - category.spent).toFixed(2)}€ sur cette catégorie. Vous pourriez
                            réallouer ce montant.
                          </p>
                        </div>
                      )
                    }
                    return null
                  })
                  .filter(Boolean)}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
