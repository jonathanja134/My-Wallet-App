"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, CalendarClock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Transaction } from "@/lib/supabase"
import { getTransactions } from "@/app/actions/expenses"
import { BudgetItem ,ExpenseHistoryChartProps} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


function getExpensesByCategory(
  transactions: Transaction[],
  month?: number,
  year?: number
) {
  return transactions
    .filter((t) => t.amount < 0)
    .filter((t) => {
      if (month === undefined || year === undefined) return true
      const d = new Date(t.transaction_date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .reduce((acc, t) => {
      const category = t.budget_categories?.name ?? "Autres"
      const existing = acc.find((c) => c.category === category)
      if (existing) {
        existing.total += Math.abs(t.amount)
      } else {
        acc.push({ category, total: Math.abs(t.amount) })
      }
      return acc
    }, [] as { category: string; total: number }[])
}

export function ExpenseHistoryChart({
  expenseHistory = [],
  budgetData = [],
  monthName,
  transactions = [],
}: ExpenseHistoryChartProps & { transactions?: Transaction[] }) {

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

  function buildExpenseHistory(transactions: Transaction[]): ExpenseHistoryChartProps["expenseHistory"] {
    
    return transactions
    .filter((t) => t.amount < 0)
    .filter((t) => {
      if (selectedMonth === undefined || selectedYear === undefined) return true
      const d = new Date(t.transaction_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
      .map(t => {
        const dateObj = new Date(t.transaction_date)
        const day = dateObj.getDate().toString() // day of month
        return {
          amount: t.amount,
          day,
          transaction_date: t.transaction_date,
          date: day,
          spent: Math.abs(t.amount),
        }
      })
  }

  const navigateMonth = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else setSelectedMonth(selectedMonth - 1)
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else setSelectedMonth(selectedMonth + 1)
    }
  }

  // Remove client-side data fetching - use props instead
  const [mounted, setMounted] = useState(false)
  
  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {setMounted(true)}, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border-0 shadow-sm rounded-lg p-6">
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-gray-500">Chargement...</p>
            </div>
          </div>
        </div>
        <div className="border-0 shadow-sm rounded-lg p-6">
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-gray-500">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const expensesByCategory = getExpensesByCategory(
    transactions,
    selectedMonth,
    selectedYear
  )

  // Show loading state if no data
  if (!transactions.length && !expenseHistory.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <CalendarClock className="h-5 w-5 mr-2" />
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-500">Chargement des données...</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Budget vs Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-500">Chargement des données...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expenseHistoryWithCumulative = buildExpenseHistory(transactions)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item, index, arr) => {
      const cumulativeSpent = arr
        .slice(0, index + 1)
        .reduce((sum, t) => sum + t.spent, 0)
      return { ...item, cumulativeSpent }
    })

  const totalBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)

  function plannedExpenses(day: number, totalBudget: number): number {
    const T = new Date()
    const daysInMonth = new Date(T.getFullYear(), T.getMonth() + 1, 0).getDate()
    return (totalBudget / daysInMonth) * day
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Courbe des dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          {/* Month Navigation */}
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-4">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(Number(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={expenseHistoryWithCumulative}
                  margin={{ top: 10, right: 10, bottom: 10, left: -20 }}
                >
                  <XAxis dataKey="date" axisLine={false} tickLine={false} domain={[0, 31]} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={[
                      0,
                      Math.max(
                        ...expenseHistoryWithCumulative.map((d) => d.cumulativeSpent)
                      ) + 10,
                    ]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      const day = label
                      return (
                        <div className="bg-background p-2 rounded shadow">
                          <p className="font-bold">{`${day} ${monthName}`}</p>
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }}>
                              {entry.name} :{" "}
                              {entry.value !== undefined
                                ? entry.value.toLocaleString("fr-FR") + " €"
                                : "-"}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  {/* Limite planifiée */}
                  <Line
                    type="monotone"
                    dataKey={(data) => plannedExpenses(parseInt(data.date, 10), totalBudget)}
                    strokeDasharray="5 5"
                    name="Limite planifiée"
                    stroke="#ffeed4ba"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                  />
                  {/* Dépenses journalières */}
                  <Line
                    type="monotone"
                    dataKey="spent"
                    name="Montant journalier"
                    stroke="#a200ffff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {/* Dépenses cumulées */}
                  <Line
                    type="monotone"
                    dataKey="cumulativeSpent"
                    name="Cumulé"
                    stroke="#ff9500ff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                  />
                  <ReferenceLine
                    y={totalBudget}
                    stroke="#888888"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* Budget vs Dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Budget vs Dépenses
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
              <div className="space-y-4">
                {budgetData.slice(0, 5).map((item, index) => {
                  const categoryExpense = expensesByCategory.find(
                    (e: any) => e.category === item.category
                  )
                  const spent = categoryExpense?.total ?? 0
                  const percentage =
                    item.budget > 0 ? (spent / item.budget) * 100 : 0
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-gray-500">
                          {spent.toLocaleString("fr-FR")} /{" "}
                          {item.budget.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            percentage > 100
                              ? "bg-red-500"
                              : percentage > 80
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
