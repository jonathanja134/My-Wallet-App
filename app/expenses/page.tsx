"use server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import ExpensesClient from "./ExpensesClient"
import { getTransactions } from "@/app/actions/expenses"
import { getBudgetCategories } from "@/app/actions/budget"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ThemeProvider } from "next-themes"
import { PageHeader } from "@/components/page-header"

export default async function Expenses() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let transactionsForMonth: any[] = []
  let categories: any[] = []

  if (user) {
    try {
      const [transactionsResult, categoriesResult] = await Promise.all([
        getTransactions(),
        getBudgetCategories(),
      ])

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const allTransactions = transactionsResult?.data || []

      transactionsForMonth = allTransactions.filter((t: any) => {
        if (!t.transaction_date) return false
        const date = new Date(t.transaction_date)
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      })

      categories = categoriesResult?.data || []
    } catch (err) {
      console.error("Error fetching data:", err)
    }
  }

  const totalExpenses = transactionsForMonth
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = transactionsForMonth
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <ThemeProvider attribute="class" enableSystem>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <PageHeader actionButton={<AddExpenseDialog categories={categories} />} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!user && (
            <div className="text-center py-8">
              <p className="text-lg mb-4">Veuillez vous connecter pour voir vos dépenses</p>
            </div>
          )}

          {user && (
            <>
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
                    <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {totalIncome - totalExpenses >= 0 ? "+" : ""}
                      {(totalIncome - totalExpenses).toLocaleString("fr-FR")} €
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <ExpensesClient
                    initialTransactions={transactionsForMonth}
                    user={user}
                    categories={categories}
                  />
                </CardContent>
              </Card>

              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" className="bg-white text-gray-700 border-gray-200">
                  Exporter CSV
                </Button>
                <Button variant="outline" className="bg-white text-gray-700 border-gray-200">
                  Exporter PDF
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
