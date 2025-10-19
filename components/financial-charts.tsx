"use client"

import { useEffect, useState,useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, CalendarClock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Transaction } from "@/lib/supabase"
import {ExpenseHistoryChartProps} from "@/lib/supabase"
import {BudgetDonutChart} from "@/components/pie-budget-chart"




export function ExpenseHistoryChart({
  expenseHistory = [],
  budgetData = [],
  monthName,
  transactions = [],
}: ExpenseHistoryChartProps & { transactions?: Transaction[] }) {

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())
  // Create repeated months for infinite scroll
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

  const loopedMonths = [...months] // 3x loop
  const scrollRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const scrollToCurrentMonth = () => {
    if (scrollRef.current) {
      const monthEl = scrollRef.current.children[selectedMonth] as HTMLElement
      if (monthEl) {
        scrollRef.current.scrollTo({
          left: monthEl.offsetLeft - scrollRef.current.clientWidth / 2 + monthEl.clientWidth / 2,
          behavior: "smooth",
        })
      }
    }
  }

  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(scrollToCurrentMonth)
}, [selectedMonth])

  function getExpensesByCategory(
  transactions: Transaction[], selectedMonth?: number, selectedYear?: number
) {
  return transactions
    .filter((t) => t.amount < 0)
    .filter((t) => {
      if (selectedMonth === undefined || selectedYear === undefined) return true
      const d = new Date(t.transaction_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
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

  function buildExpenseHistory(transactions: Transaction[]): ExpenseHistoryChartProps["expenseHistory"] {
  // Aggregate by day
  const dayMap: { [day: number]: { amount: number; spent: number; date: number; transaction_date: string; budgetData: any[] } } = {}

  transactions
    .filter((t) => t.amount < 0)
    .filter((t) => {
      if (selectedMonth === undefined || selectedYear === undefined) return true
      const d = new Date(t.transaction_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
    .forEach((t) => {
      const dateObj = new Date(t.transaction_date)
      const day = dateObj.getDate()
      if (!dayMap[day]) {
        dayMap[day] = {
          amount: 0,
          spent: 0,
          date: day,
          transaction_date: t.transaction_date,
          budgetData: []
        }
      }
      dayMap[day].amount += t.amount
      dayMap[day].spent += Math.abs(t.amount)
      // Optionally, you can aggregate budgetData if needed
    })
  // Convert to array, add 'day' property, and sort by day
  return Object.values(dayMap)
    .map((item) => ({
      ...item,
      day: item.date, // Add 'day' property to match the expected type
    }))
    .sort((a, b) => a.date - b.date)
}

const handleMonthClick = (index: number) => {
  setSelectedMonth(index % 12)
  if (scrollRef.current) {
    const monthEl = scrollRef.current.children[index] as HTMLElement
    scrollRef.current.scrollTo({
      left: monthEl.offsetLeft - scrollRef.current.clientWidth / 2 + monthEl.clientWidth / 2,
      behavior: "smooth",
    })
  }
}

// Calculate possible expense ( budget - spent  ) daily
function possibleExpenseDays(day: number, totalBudget: number, selectedMonth: number, selectedYear: number, transactions: Transaction[]) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const spentSoFar = buildExpenseHistory(transactions)
    .filter((t) => t.date <= day)
    .reduce((sum, t) => sum + t.spent, 0)
  const totalBudgetToDate = (totalBudget / daysInMonth) * day
  const possibleExpense = (totalBudgetToDate - spentSoFar)
  return possibleExpense > 0 ? possibleExpense : 0
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

  const categorySpending = budgetData.map((b) => {
    const expense = expensesByCategory.find((e) => e.category === b.category)
    return {
      name: b.category,
      value: expense ? expense.total : 0,
      budget: b.budget,
      percentage: b.budget > 0 ? ((expense ? expense.total : 0) / b.budget) * 100 : 0,
    }
  })
//get colors from the category index

  function getColor(index: number) {
    const colors = ["#ff0000ff", "#ff00eeff", "#c02cffff", "#29e038ff", "#4caf50", "#2196f3"]
    return colors[index % colors.length]
  }

  const expenseHistoryWithCumulative = buildExpenseHistory(transactions)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item, index, arr) => {
      const cumulativeSpent = arr
        .slice(0, index + 1)
        .reduce((sum, t) => sum + t.spent, 0)
      return { ...item, cumulativeSpent }
    })

  const totalBudget = budgetData.reduce((sum:any, i:any) => sum + i.budget, 0)
  

function plannedExpenses(day: number , totalBudget: number, selectedMonth: number, selectedYear: number) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  return (totalBudget / daysInMonth) * day
}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Courbe des dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          {/* Month Navigation */}
          <Card className="border-0 shadow-sm bg-card">
            <CardHeader>
                <CardTitle className="text-lg font-semibold mb-2 flex items-center">
                    <CalendarClock className="h-5 w-5 mr-2" />
                    Sélection du mois
                  </CardTitle>
                  <div className="relative w-50 overflow-hidden">
                  {/* Left Blur */}
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-card to-transparent z-50" />
                  {/* Right Blur */}
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-card to-transparent z-10" />

                  <div
                    className="flex space-x-2 overflow-x-auto scroll-smooth scrollbar-hide px-4 py-2 w-full"
                    ref={scrollRef}
                  >
                    {loopedMonths.map((month, index) => {
                      const isSelected = index % 12 === selectedMonth
                      return (
                        <div
                          key={index}
                          onClick={() => handleMonthClick(index)}
                          className={`
                            flex items-center justify-center rounded-full px-4 py-2 cursor-pointer transition-all duration-300
                            ${isSelected ? "bg-background text-foreground shadow-lg" : "bg-black-100 text-gray-700 hover:bg-background hover:text-foreground hover:animate-pulse "}
                          `}
                        >
                          {month.charAt(0).toUpperCase() + month.slice(1)}
                        </div>
                      )
                    })}
                  </div>
                </div>
                </CardHeader>
          </Card>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={expenseHistoryWithCumulative}
                  margin={{ top: 10, right: 20, bottom: 10, left:0 }}
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
                          <p className="font-bold flex justify-center items-center mb-2">
                            {`${day} ${new Date(selectedYear, selectedMonth).toLocaleString("FR-fr", {month: "long"})}`}
                          </p>
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
                    dataKey={(data) => plannedExpenses(parseInt(data.date, 10), totalBudget, selectedMonth, selectedYear)}
                    strokeDasharray="5 5"
                    name="Limite planifiée"
                    stroke="#9cb8ffba"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                  />
                  {/* Dépenses cumulées */}
                  <Line
                    type="monotone"
                    dataKey="cumulativeSpent"
                    name="Cumulé"
                    stroke="#ffffffff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                  />
                  {/* Dépenses restante */}
                  <Line
                    type="monotone"
                    dataKey={(data) => possibleExpenseDays(parseInt(data.date, 10), totalBudget, selectedMonth, selectedYear, transactions)}
                    name="Dépenses restantes"
                    stroke="#ff6a00ff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <ReferenceLine
                    y={totalBudget}
                    stroke="#ff7373ff"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* Budget vs Dépenses */}
      <Card className="border-0 shadow-sm">
        <BudgetDonutChart
          categories={categorySpending.map((c, i) => ({
            id: i.toString(),
            name: c.name,
            budget_amount: c.budget,
            spent: c.value,
            color: getColor(i),
          }))}
        pageName="home"
        />
      </Card>
    </div>
  )
}
