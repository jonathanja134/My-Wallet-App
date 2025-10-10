import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Wallet, ArrowLeft, TrendingUp, Trash2, Target, PiggyBank, Home, Car, Plane, GraduationCap, Plus } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { AddGoalDialog } from "@/components/add-goal-dialog"
import { AddSavingsDialog } from "@/components/add-savings-dialog"
import { CustomizeSimulationDialog } from "@/components/customize-simulation-dialog"
import { getGoals, deleteGoal } from "@/app/actions/goals"
import { ThemeProvider } from "next-themes"

export const dynamic = "force-dynamic";

export default async function Goals(token: string) {
  const goalsResult = await getGoals()
  const goals = goalsResult.data || []

  const totalTargets = goals.reduce((sum, goal) => sum + goal.target_amount, 0)
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0)
  const overallProgress = totalTargets > 0 ? Math.round((totalSaved / totalTargets) * 100) : 0

  async function handleDeleteGoal(id: string) {
    "use server"
    await deleteGoal(id, token)
  }

  const getStatusBadge = (current: number, target: number, deadline?: string) => {
    const progress = (current / target) * 100

    if (!deadline) {
      if (progress >= 100) return { text: "Atteint", variant: "default" as const, color: "text-green-600" }
      if (progress >= 75) return { text: "En bonne voie", variant: "default" as const, color: "text-green-600" }
      return { text: "En cours", variant: "secondary" as const, color: "text-yellow-600" }
    }

    const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    if (progress >= 100) return { text: "Atteint", variant: "default" as const, color: "text-green-600" }
    if (daysLeft < 30 && progress < 80)
      return { text: "Urgent", variant: "destructive" as const, color: "text-red-600" }
    if (progress >= 75) return { text: "En bonne voie", variant: "default" as const, color: "text-green-600" }
    return { text: "En cours", variant: "secondary" as const, color: "text-yellow-600" }
  }

  const getDaysLeft = (deadline?: string) => {
    if (!deadline) return "Pas d'échéance"

    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return "Échéance dépassée"
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Demain"
    if (days < 30) return `${days} jours`
    if (days < 365) return `${Math.round(days / 30)} mois`
    return `${Math.round(days / 365)} ans`
  }

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "immobilier":
        return Home
      case "transport":
        return Car
      case "loisirs":
        return Plane
      case "éducation":
        return GraduationCap
      case "épargne":
        return PiggyBank
      default:
        return Target
    }
  }

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="min-h-screen bg-background">
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
              <Link href="/" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Tableau de bord
              </Link>
              <Link href="/budget" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Budget
              </Link>
              <Link href="/expenses" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Dépenses
              </Link>
              <Link href="/goals" className="font-semibold text-card-foreground hover:text-accent-foreground">
                Objectifs
              </Link>
              <Link href="/task" className="font-semibold text-secondary-foreground hover:text-accent-foreground hover:bg-card">
                Habitudes
              </Link>
              <Link href="/notes" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                notes
              </Link>
              
            </nav>
           <AddGoalDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Objectifs totaux</p>
                  <p className="text-2xl font-bold text-foreground">{totalTargets.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Épargné</p>
                  <p className="text-2xl font-bold text-green-600">{totalSaved.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Progression globale</p>
                  <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Progression vers tous les objectifs</span>
                  <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const IconComponent = getCategoryIcon(goal.category)
            const progress = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
            const remaining = goal.target_amount - goal.current_amount
            const status = getStatusBadge(goal.current_amount, goal.target_amount, goal.target_date || undefined)

            return (
              <Card key={goal.id} className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: goal.color }}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{goal.name}</CardTitle>
                        <p className="text-sm text-gray-500">{goal.category}</p>
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Épargné</span>
                      <span className="font-semibold text-gray-900">
                        {goal.current_amount.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Objectif</span>
                      <span className="font-semibold text-gray-900">
                        {goal.target_amount.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Restant</span>
                      <span className="font-semibold text-blue-600">{remaining.toLocaleString("fr-FR")} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Échéance</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getDaysLeft(goal.target_date || undefined)}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">Progression</span>
                        <span className="text-sm font-medium text-gray-900">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="pt-2 flex space-x-2">
                      <AddSavingsDialog goalId={goal.id} goalName={goal.name}>
                        <Button size="sm" variant="outline" className="flex-1 bg-white text-gray-700 border-gray-200">
                          Ajouter de l'épargne
                        </Button>
                      </AddSavingsDialog>
                      <form action={handleDeleteGoal.bind(null, goal.id)}>
                        <Button size="sm" variant="outline" type="submit" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Financial Independence Simulator */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Simulateur d'indépendance financière
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-3">Vos paramètres actuels</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Épargne mensuelle moyenne :</span>
                      <span className="font-medium">1 200 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rendement annuel estimé :</span>
                      <span className="font-medium">7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dépenses annuelles cibles :</span>
                      <span className="font-medium">30 000 €</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-3">Projection</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capital nécessaire (règle 4%) :</span>
                      <span className="font-medium">750 000 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Temps estimé :</span>
                      <span className="font-medium text-blue-600">28 ans</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Âge d'indépendance :</span>
                      <span className="font-medium text-green-600">58 ans</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <CustomizeSimulationDialog />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </ThemeProvider>
  )
}
