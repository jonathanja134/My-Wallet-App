"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, CalendarClock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Transaction } from "@/lib/supabase"
import { ExpenseHistoryChartProps } from "@/lib/supabase"
import { BudgetDonutChart } from "@/components/pie-budget-chart"

export function ExpenseHistoryChart({
  expenseHistory = [],
  budgetData = [],
  monthName,
  transactions = [],
}: ExpenseHistoryChartProps & { transactions?: Transaction[] }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())
  const [showAllYear, setShowAllYear] = useState(false)
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ]
  const scrollRef = useRef<HTMLDivElement>(null)

  // Only scroll when a month is selected, not when toggling year
  useEffect(() => {
    if (showAllYear) return
    if (typeof window === "undefined") return
    if (!scrollRef.current) return
    const monthEl = scrollRef.current.children[selectedMonth + 1] as HTMLElement // +1 because button is first
    if (!monthEl) return
    const target = monthEl.offsetLeft - scrollRef.current.clientWidth / 2 + monthEl.clientWidth / 2
    scrollRef.current.scrollTo({ left: target, behavior: "smooth" })
  }, [selectedMonth])

  // Group transactions by month and day for monthly view
  function buildExpenseHistory(transactions: Transaction[], month: number, year: number) {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const currentDay = today.getDate()
    const daysInSelectedMonth = new Date(year, month + 1, 0).getDate()
    const daysToShow = year === currentYear && month === currentMonth ? currentDay : daysInSelectedMonth

    // Aggregate by day
    const dayMap: Record<number, { amount: number; spent: number; date: number; transaction_date?: string }> = {}
    transactions
      .filter((t) => t.amount < 0)
      .filter((t) => {
        const d = new Date(t.transaction_date)
        return d.getMonth() === month && d.getFullYear() === year
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
          }
        }
        dayMap[day].amount += t.amount
        dayMap[day].spent += Math.abs(t.amount)
      })

    // Fill all days up to daysToShow
    const result: ExpenseHistoryChartProps["expenseHistory"] = []
    for (let d = 1; d <= daysToShow; d++) {
      const entry = dayMap[d]
      result.push({
        date: d,
        day: d,
        amount: entry ? entry.amount : 0,
        spent: entry ? entry.spent : 0,
        transaction_date: entry ? entry.transaction_date || `${year}-${month + 1}-${d}` : `${year}-${month + 1}-${d}`,
      } as any)
    }
    return result
  }

  // Group transactions by day for the whole year (all months)
  function buildAllYearExpenseHistory(transactions: Transaction[], year: number) {
    // From September 1st to today (or Dec 31 if past)
    const startMonth = 8 // September (0-based)
    const today = new Date()
    const endMonth = today.getFullYear() === year ? today.getMonth() : 11
    const endDay = today.getFullYear() === year ? today.getDate() : 31

    const result: ExpenseHistoryChartProps["expenseHistory"] = []
    for (let month = startMonth; month <= endMonth; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const lastDay = (month === endMonth) ? endDay : daysInMonth
      const dayMap: Record<number, { amount: number; spent: number; date: number; transaction_date?: string }> = {}
      transactions
        .filter((t) => t.amount < 0)
        .filter((t) => {
          const d = new Date(t.transaction_date)
          return d.getMonth() === month && d.getFullYear() === year
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
            }
          }
          dayMap[day].amount += t.amount
          dayMap[day].spent += Math.abs(t.amount)
        })
      for (let d = 1; d <= lastDay; d++) {
        const entry = dayMap[d]
        result.push({
          date: `${month + 1}/${d}`,
          day: d,
          amount: entry ? entry.amount : 0,
          spent: entry ? entry.spent : 0,
          transaction_date: entry ? entry.transaction_date || `${year}-${month + 1}-${d}` : `${year}-${month + 1}-${d}`,
          month: month + 1,
        } as any)
      }
    }
    return result
  }

  // Chart data selection
  const expenseHistoryRaw = showAllYear
    ? buildAllYearExpenseHistory(transactions, selectedYear)
    : buildExpenseHistory(transactions, selectedMonth, selectedYear)

  // --- totalBudget must be available before computing derived fields
  const totalBudget = budgetData.reduce((sum: any, i: any) => sum + i.budget, 0)

  // Precompute planned & possible values and cumulative spent to avoid using function signatures in `dataKey`
  const expenseHistoryWithCumulative = expenseHistoryRaw
    .map((item, index, arr) => {
      const cumulativeSpent = arr
        .slice(0, index + 1)
        .reduce((sum, t) => sum + (t.spent || 0), 0)

      const plannedValue = plannedExpenses(index, selectedMonth, selectedYear)
      const possibleValue = !showAllYear
        ? possibleExpenseDays(typeof item.day === "number" ? item.day : index + 1, totalBudget, selectedMonth, selectedYear, transactions)
        : 0

      return {
        ...item,
        cumulativeSpent,
        plannedExpenses: plannedValue,
        possibleExpenses: possibleValue,
      }
    })
    // ensure stable ordering
    .sort((a, b) => {
      // for year mode `date` is "M/D", keep original order from buildAllYear (already sequential)
      if (showAllYear) return 0
      return (a.date as number) - (b.date as number)
    })

  // Category spending: use all year or month
  function getExpensesByCategory(
    transactions: Transaction[], month?: number, year?: number
  ) {
    return transactions
      .filter((t) => t.amount < 0)
      .filter((t) => {
        if (showAllYear) {
          // Only from September to now
          const d = new Date(t.transaction_date)
          return d.getFullYear() === selectedYear && d.getMonth() >= 8 && d <= new Date()
        }
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

  const expensesByCategory = getExpensesByCategory(
    transactions,
    selectedMonth,
    selectedYear
  )

  // --- Calculate the number of months from September to now ---
  const startMonth = 8 // September (0-based)
  const today = new Date()
  const monthsSinceSeptember =
    today.getFullYear() === selectedYear
      ? today.getMonth() - startMonth + 1
      : 12 - startMonth

  // --- For the donut chart: scale budgets for year mode ---
  const categorySpending = budgetData.map((b) => {
    const expense = expensesByCategory.find((e) => e.category === b.category)
    // In year mode, multiply budget by months since September
    const scaledBudget = showAllYear ? b.budget * monthsSinceSeptember : b.budget
    return {
      name: b.category,
      value: expense ? expense.total : 0,
      budget: scaledBudget,
      percentage: scaledBudget > 0 ? ((expense ? expense.total : 0) / scaledBudget) * 100 : 0,
    }
  })

  function getColor(index: number) {
    const colors = ["#ff0000ff", "#ff00eeff", "#c02cffff", "#29e038ff", "#4caf50", "#2196f3"]
    return colors[index % colors.length]
  }

  // --- For the planned line: cumulative budget from September 1st ---
  function plannedExpenses(idx: number, selectedMonth: number, selectedYear: number) {
    if (showAllYear) {
      // Cumulative from September 1st to this point
      const startMonth = 8 // September (0-based)
      const entry = expenseHistoryRaw[idx]
      if (!entry) return 0
      const entryMonth = typeof entry.month === "number" ? entry.month - 1 : selectedMonth
      const entryDay = typeof entry.day === "number" ? entry.day : 1

      // Total months from September to entryMonth (inclusive)
      const monthsUpToNow = entryMonth - startMonth + 1
      if (monthsUpToNow < 1) return 0

      // Total budget for all those months
      const monthlyBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)
      const budgetToDate = monthlyBudget * monthsUpToNow

      // Total days from September 1st to this entry
      let totalDays = 0
      for (let m = startMonth; m < entryMonth; m++) {
        totalDays += new Date(selectedYear, m + 1, 0).getDate()
      }
      totalDays += entryDay

      // Total days in all those months
      let daysInPeriod = 0
      for (let m = startMonth; m <= entryMonth; m++) {
        daysInPeriod += new Date(selectedYear, m + 1, 0).getDate()
      }

      if (daysInPeriod <= 0) return 0

      // Planned cumulative budget up to this day
      return (budgetToDate / daysInPeriod) * totalDays
    } else {
      // Month mode
      const entry = expenseHistoryRaw[idx]
      const day = entry && typeof entry.day === "number" ? entry.day : idx + 1
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      if (daysInMonth <= 0) return 0
      const monthlyBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)
      return (monthlyBudget / daysInMonth) * day
    }
  }

  function possibleExpenseDays(day: number, totalBudget: number, selectedMonth: number, selectedYear: number, transactions: Transaction[]) {
    if (showAllYear) return 0 // Not relevant in year mode
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const spentSoFar = buildExpenseHistory(transactions, selectedMonth, selectedYear)
      .filter((t) => t.day <= day)
      .reduce((sum, t) => sum + t.spent, 0)
    const totalBudgetToDate = (totalBudget / daysInMonth) * day
    const possibleExpense = (totalBudgetToDate - spentSoFar)
    return possibleExpense ? possibleExpense : 0
  }

  // Hydration fix
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Loading state
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Courbe des dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          {/* Month Navigation */}
          <Card className="border-0 shadow-sm bg-card ">
            <CardHeader>
              <CardTitle className="text-lg font-semibold mb-2 flex items-center">
                <CalendarClock className="h-5 w-5 mr-2" />
                Sélection du mois
                <button
                    className={` ml-8 text-sm text-gray-500 z-10 px-4 py-2 rounded-full border ${showAllYear ? "bg-foreground text-background" : ""}`}
                    onClick={() => setShowAllYear((v) => !v)}
                    tabIndex={0}
                  >
                    {showAllYear ? "Mois" : "Total"}
              </button>
              </CardTitle>
              </CardHeader>
              
              <div className="flex relative w-50 overflow-hidden justify-end">
                {/* Left Blur */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-60 bg-gradient-to-r from-card to-transparent z-50" />
                {/* Right Blur */}
                <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-card to-transparent z-10" />
                <div className="flex space-x-2 overflow-x-auto scroll-smooth scrollbar-hide px-2 py-2 w-full" ref={scrollRef}>
                  {!showAllYear && months.map((month, index) => {
                    const isSelected = index === selectedMonth
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedMonth(index)}
                        className={`
                          flex items-center justify-center rounded-full px-4 py-2 cursor-pointer transition-all duration-300
                          ${isSelected ? "bg-background text-foreground shadow-lg" : "bg-black-100 text-gray-700 hover:bg-background hover:text-foreground hover:animate-pulse "}
                        `}
                        tabIndex={0}
                      >
                        {month.charAt(0).toUpperCase() + month.slice(1)}
                      </div>
                    )
                  })}
                  {showAllYear && months.map((month, index) => {
                    const isSelected = index === selectedMonth
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedMonth(index)}
                        className={`
                          flex items-center justify-center rounded-full px-4 py-2 cursor-pointer transition-all duration-300 text-black
                        `}
                        tabIndex={0}
                      >
                        {month.charAt(0).toUpperCase() + month.slice(1)}
                      </div>
                    )
                  })}
                </div>
              </div>
            
          </Card>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={expenseHistoryWithCumulative}
                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              >
                <XAxis
                  dataKey={showAllYear ? "date" : "date"}
                  axisLine={false}
                  tickLine={false}
                  domain={showAllYear ? undefined : [0, 31]}
                />
                <YAxis
                  tickFormatter={(value) => value.toFixed(0)}
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
                          {showAllYear
                            ? `${day}`
                            : `${day} ${new Date(selectedYear, selectedMonth).toLocaleString("FR-fr", { month: "long" })}`}
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
                {!showAllYear && (
                  <Line
                    type="monotone"
                    dataKey="possibleExpenses"
                    name="Dépenses restantes"
                    stroke="#ff6a00ff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {/* Limite planifiée */}
                <Line
                  type="monotone"
                  dataKey="plannedExpenses"
                  strokeDasharray="5 5"
                  name="Limite planifiée"
                  stroke="#9cb8ffba"
                  strokeWidth={3}
                  strokeLinecap="round"
                  dot={false}
                  connectNulls={true}
                />
                {!showAllYear && (
                  <ReferenceLine
                    y={totalBudget}
                    stroke="#ff7373ff"
                    strokeDasharray="5 5"
                  />
                )}
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
