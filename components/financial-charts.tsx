"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, CalendarClock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Transaction } from "@/lib/supabase"
import { ExpenseHistoryChartProps } from "@/lib/supabase"
import { BudgetDonutChart } from "@/components/pie-budget-chart"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ExpenseHistoryChart({
  expenseHistory = [],
  budgetData = [],
  monthName,
  transactions = [],
}: ExpenseHistoryChartProps & { transactions?: Transaction[] }) {
  // Months as labels Jan..Dec
  const months = [ "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre" ]

  // Determine current academic start year (Sept -> Aug)
  const today = new Date()
  const todayMonth = today.getMonth() // 0..11
  const currentAcademicStartYear = todayMonth >= 8 ? today.getFullYear() : today.getFullYear() - 1

  // Selected academic year start (e.g., 2024 means academic year 2024-2025)
  const [selectedAcademicStartYear, setSelectedAcademicStartYear] = useState<number>(currentAcademicStartYear)

  // Academic months order: Sept (index 0) ... Aug (index 11)
  const academicMonths = months.slice(8).concat(months.slice(0, 8)) // ["septembre", ..., "août"]

  // Selected academic month index (0..11) where 0 => September, 11 => August
  const initialAcademicIndex = (today.getMonth() - 8 + 12) % 12
  const [selectedAcademicMonthIndex, setSelectedAcademicMonthIndex] = useState<number>(initialAcademicIndex)

  // Whether to show the full academic year (aggregated) or single month
  const [showAllYear, setShowAllYear] = useState(false)

  // Refs for scrollable selectors
  const monthScrollRef = useRef<HTMLDivElement>(null)
  const yearScrollRef = useRef<HTMLDivElement>(null)

  // Utility mapping: convert academicMonthIndex (0..11) -> calendar month (0..11)
  const academicIndexToCalendarMonth = (index: number) => (8 + index) % 12

  // Given selectedAcademicStartYear and calendarMonth -> calendarYear
  const calendarYearForAcademicMonth = (academicIndex: number, academicStartYear: number) => {
    const calendarMonth = academicIndexToCalendarMonth(academicIndex)
    // months 8..11 belong to academicStartYear; months 0..7 belong to academicStartYear + 1
    return calendarMonth >= 8 ? academicStartYear : academicStartYear + 1
  }

  // Create list of selectable academic years (start years) - show last 6 academic years including current
  const getSelectableAcademicYears = (count = 3) => {
    const years = []
    for (let i = 0; i < count; i++) {
      years.push(currentAcademicStartYear - (count - 1) + i)
    }
    return years
  }
  const selectableAcademicYears = getSelectableAcademicYears(6)

  // scroll month into view when selection changes (only when not showing whole year)
  useEffect(() => {
    if (showAllYear) return
    if (typeof window === "undefined") return
    if (!monthScrollRef.current) return
    const monthEl = monthScrollRef.current.children[selectedAcademicMonthIndex] as HTMLElement
    if (!monthEl) return
    const target = monthEl.offsetLeft - monthScrollRef.current.clientWidth / 2 + monthEl.clientWidth / 2
    monthScrollRef.current.scrollTo({ left: target, behavior: "smooth" })
  }, [selectedAcademicMonthIndex, showAllYear])

  // scroll academic year into view when selection changes
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!yearScrollRef.current) return
    const years = Array.from(yearScrollRef.current.children) as HTMLElement[]
    const idx = selectableAcademicYears.indexOf(selectedAcademicStartYear)
    const yearEl = years[idx]
    if (!yearEl) return
    const target = yearEl.offsetLeft - yearScrollRef.current.clientWidth / 2 + yearEl.clientWidth / 2
    yearScrollRef.current.scrollTo({ left: target, behavior: "smooth" })
  }, [selectedAcademicStartYear, selectableAcademicYears])

  // --- rework build functions to accept calendarMonth and calendarYear ---
  function buildExpenseHistory(transactions: Transaction[], calendarMonth: number, calendarYear: number) {
    const todayLocal = new Date()
    const currentMonth = todayLocal.getMonth()
    const currentYear = todayLocal.getFullYear()
    const currentDay = todayLocal.getDate()
    const daysInSelectedMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const daysToShow = calendarYear === currentYear && calendarMonth === currentMonth ? currentDay : daysInSelectedMonth

    const dayMap: Record<number, { amount: number; spent: number; date: number; transaction_date?: string }> = {}
    transactions
      .filter((t) => t.amount < 0)
      .filter((t) => {
        if (!t.transaction_date) return false
        const d = new Date(t.transaction_date)
        return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear
      })
      .forEach((t) => {
        const dateObj = new Date(t.transaction_date!)
        const day = dateObj.getDate()
        if (!dayMap[day]) {
          dayMap[day] = { amount: 0, spent: 0, date: day, transaction_date: t.transaction_date }
        }
        dayMap[day].amount += t.amount
        dayMap[day].spent += Math.abs(t.amount)
      })

    const result: ExpenseHistoryChartProps["expenseHistory"] = []
    for (let d = 1; d <= daysToShow; d++) {
      const entry = dayMap[d]
      result.push({
        date: d,
        day: d,
        amount: entry ? entry.amount : 0,
        spent: entry ? entry.spent : 0,
        transaction_date: entry ? entry.transaction_date || `${calendarYear}-${calendarMonth + 1}-${d}` : `${calendarYear}-${calendarMonth + 1}-${d}`,
      } as any)
    }
    return result
  }

  function buildAllYearExpenseHistory(transactions: Transaction[], academicStartYear: number) {
    // From September (academicStartYear) to August (academicStartYear+1), but stop at today if same academic year as current and current date earlier
    const startMonth = 8 // September
    const todayLocal = new Date()
    const endAcademicYearIsCurrent = academicStartYear === currentAcademicStartYear
    const endMonth = endAcademicYearIsCurrent ? todayLocal.getMonth() : 11
    const endYear = endAcademicYearIsCurrent ? todayLocal.getFullYear() : academicStartYear + 1
    const result: ExpenseHistoryChartProps["expenseHistory"] = []

    // iterate months from Sept (academicStartYear) to endMonth of endYear (stop at today if in current)
    const monthsSequence = []
    for (let i = 0; i < 12; i++) {
      const calMonth = (8 + i) % 12
      const calYear = calMonth >= 8 ? academicStartYear : academicStartYear + 1
      // if it's after endMonth/endYear break
      if (calYear > endYear || (calYear === endYear && calMonth > endMonth)) break
      monthsSequence.push({ calMonth, calYear })
    }

    monthsSequence.forEach(({ calMonth, calYear }) => {
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
      const lastDay = (calYear === todayLocal.getFullYear() && calMonth === todayLocal.getMonth() && academicStartYear === currentAcademicStartYear) ? todayLocal.getDate() : daysInMonth
      const dayMap: Record<number, { amount: number; spent: number; date: number; transaction_date?: string }> = {}
      transactions
        .filter((t) => t.amount < 0)
        .filter((t) => {
          if (!t.transaction_date) return false
          const d = new Date(t.transaction_date)
          return d.getMonth() === calMonth && d.getFullYear() === calYear
        })
        .forEach((t) => {
          const dateObj = new Date(t.transaction_date!)
          const day = dateObj.getDate()
          if (!dayMap[day]) {
            dayMap[day] = { amount: 0, spent: 0, date: day, transaction_date: t.transaction_date }
          }
          dayMap[day].amount += t.amount
          dayMap[day].spent += Math.abs(t.amount)
        })

      for (let d = 1; d <= lastDay; d++) {
        const entry = dayMap[d]
        result.push({
          date: `${calMonth + 1}/${d}`,
          day: d,
          amount: entry ? entry.amount : 0,
          spent: entry ? entry.spent : 0,
          transaction_date: entry ? entry.transaction_date || `${calYear}-${calMonth + 1}-${d}` : `${calYear}-${calMonth + 1}-${d}`,
          month: calMonth + 1,
        } as any)
      }
    })

    return result
  }

  // Chart data selection: compute calendar month and year from academic selection
  const calendarMonthSelected = academicIndexToCalendarMonth(selectedAcademicMonthIndex)
  const calendarYearSelected = calendarYearForAcademicMonth(selectedAcademicMonthIndex, selectedAcademicStartYear)

  const expenseHistoryRaw = showAllYear
    ? buildAllYearExpenseHistory(transactions, selectedAcademicStartYear)
    : buildExpenseHistory(transactions, calendarMonthSelected, calendarYearSelected)

  // --- totalBudget must be available before computing derived fields
  // Budget aggregation rules:
  // - If selectedAcademicStartYear is the current academic start year -> budget from Sept up to today
  // - If selectedAcademicStartYear is a past academic start year -> budget for full Sep->Aug (12 months)
  const totalBudgetPerMonth = budgetData.reduce((sum: any, i: any) => sum + i.budget, 0)

  // Number of months to consider for the selected academic year
  const monthsForSelectedAcademicYear = (() => {
    if (selectedAcademicStartYear === currentAcademicStartYear) {
      // from Sept (selectedAcademicStartYear) up to today
      const start = new Date(selectedAcademicStartYear, 8, 1)
      const end = new Date()
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
      // clip between 1 and 12
      months = Math.max(1, Math.min(12, months))
      return months
    } else {
      // past full academic year: Sep..Aug => 12 months
      return 12
    }
  })()

  // scaledTotalBudget: for whole academic-year view multiply monthly budgets by number of months considered
  const scaledTotalBudget = showAllYear ? totalBudgetPerMonth * monthsForSelectedAcademicYear : totalBudgetPerMonth

  // Precompute planned & possible values and cumulative spent to avoid using function signatures in `dataKey`
  const expenseHistoryWithCumulative = expenseHistoryRaw
    .map((item, index, arr) => {
      const cumulativeSpent = arr
        .slice(0, index + 1)
        .reduce((sum, t) => sum + (t.spent || 0), 0)

      const plannedValue = plannedExpenses(index, selectedAcademicMonthIndex, selectedAcademicStartYear)

      // compute possibleValue for both month and year modes:
      let possibleValue = 0
      const monthlyBudget = totalBudgetPerMonth

      if (showAllYear) {
        // cumulative budget from Sept 1 to this entry within selected academic year
        const startMonthLocal = 8 // Sept
        const entryMonth = typeof item.month === "number" ? item.month - 1 : calendarMonthSelected
        const entryDay = typeof item.day === "number" ? item.day : 1

        // monthsUpToNow (count of months from Sept to entryMonth inclusive)
        const entryCalYear = typeof item.month === "number" ? (entryMonth >= 8 ? selectedAcademicStartYear : selectedAcademicStartYear + 1) : calendarYearSelected
        let monthsUpToNow = (entryCalYear - selectedAcademicStartYear) * 12 + (entryMonth - 8) + 1
        monthsUpToNow = Math.max(0, Math.min(12, monthsUpToNow))

        if (monthsUpToNow > 0) {
          // number of days from Sept 1 to this entry within the months considered
          let totalDays = 0
          for (let m = 8; m < 8 + (monthsUpToNow - 1); m++) {
            const cm = m % 12
            const cy = cm >= 8 ? selectedAcademicStartYear : selectedAcademicStartYear + 1
            totalDays += new Date(cy, cm + 1, 0).getDate()
          }
          // add days of current month
          totalDays += entryDay

          // daysInPeriod for monthsUpToNow
          let daysInPeriod = 0
          for (let m = 8; m < 8 + monthsUpToNow; m++) {
            const cm = m % 12
            const cy = cm >= 8 ? selectedAcademicStartYear : selectedAcademicStartYear + 1
            daysInPeriod += new Date(cy, cm + 1, 0).getDate()
          }

          if (daysInPeriod > 0) {
            const budgetToDate = monthlyBudget * monthsUpToNow * (totalDays / daysInPeriod)
            possibleValue = budgetToDate - cumulativeSpent
          } else {
            possibleValue = 0
          }
        } else {
          possibleValue = 0
        }
      } else {
        // single month mode: budget to date (day) minus spent so far
        const day = typeof item.day === "number" ? item.day : index + 1
        const daysInMonth = new Date(calendarYearSelected, calendarMonthSelected + 1, 0).getDate()
        if (daysInMonth > 0) {
          const budgetToDate = (monthlyBudget / daysInMonth) * day
          possibleValue = budgetToDate - cumulativeSpent
        } else {
          possibleValue = 0
        }
      }

      return {
        ...item,
        cumulativeSpent,
        plannedExpenses: plannedValue,
        possibleExpenses: possibleValue,
      }
    })
    .sort((a, b) => {
      if (showAllYear) return 0
      return (a.date as number) - (b.date as number)
    })

  // Category spending: adapt to academic selection
  function getExpensesByCategory(transactions: Transaction[]) {
    return transactions
      .filter((t) => t.amount < 0)
      .filter((t) => {
        const d = new Date(t.transaction_date || "")
        if (!d || isNaN(d.getTime())) return false
        // If showAllYear -> include from Sept of selectedAcademicStartYear to current date (or Aug if past)
        if (showAllYear) {
          const start = new Date(selectedAcademicStartYear, 8, 1)
          const end = selectedAcademicStartYear === currentAcademicStartYear ? new Date() : new Date(selectedAcademicStartYear + 1, 7, 31)
          return d >= start && d <= end
        } else {
          // include only transactions that match the selected calendar month/year
          return d.getMonth() === calendarMonthSelected && d.getFullYear() === calendarYearSelected
        }
      })
      .reduce((acc, t) => {
        const category = t.budget_categories?.name ?? "Autres"
        const existing = acc.find((c) => c.category === category)
        if (existing) existing.total += Math.abs(t.amount)
        else acc.push({ category, total: Math.abs(t.amount) })
        return acc
      }, [] as { category: string; total: number }[])
  }

  const expensesByCategory = getExpensesByCategory(transactions)

  // monthsSinceSeptember used to scale budgets in year mode for display
  const monthsSinceSeptember = ((): number => {
    if (selectedAcademicStartYear === currentAcademicStartYear) {
      const start = new Date(selectedAcademicStartYear, 8, 1)
      const end = new Date()
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
      return Math.max(0, Math.min(12, months))
    }
    return 12
  })()

  // For the donut chart: scale budgets for year mode
  const categorySpending = budgetData.map((b) => {
    const expense = expensesByCategory.find((e) => e.category === b.category)
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

  // plannedExpenses: adapt to academic positions (index is index inside expenseHistoryRaw)
  function plannedExpenses(idx: number, selectedAcademicMonthIndexLocal: number, selectedAcademicStartYearLocal: number) {
    if (showAllYear) {
      const startMonth = 8 // September (0-based)
      const entry = expenseHistoryRaw[idx]
      if (!entry) return 0
      const entryMonth = typeof entry.month === "number" ? entry.month - 1 : calendarMonthSelected
      const entryDay = typeof entry.day === "number" ? entry.day : 1

      const monthsUpToNow = (() => {
        // entryMonth belongs to selectedAcademicStartYearLocal or +1
        const entryCalYear = entryMonth >= startMonth ? selectedAcademicStartYearLocal : selectedAcademicStartYearLocal + 1
        let months = (entryCalYear - selectedAcademicStartYearLocal) * 12 + (entryMonth - startMonth) + 1
        return Math.max(0, Math.min(12, months))
      })()

      if (monthsUpToNow < 1) return 0

      const monthlyBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)
      const budgetToDate = monthlyBudget * monthsUpToNow

      // days up to entry
      let totalDays = 0
      for (let m = 8; m < 8 + (monthsUpToNow - 1); m++) {
        const cm = m % 12
        const cy = cm >= 8 ? selectedAcademicStartYearLocal : selectedAcademicStartYearLocal + 1
        totalDays += new Date(cy, cm + 1, 0).getDate()
      }
      totalDays += entryDay

      let daysInPeriod = 0
      for (let m = 8; m < 8 + monthsUpToNow; m++) {
        const cm = m % 12
        const cy = cm >= 8 ? selectedAcademicStartYearLocal : selectedAcademicStartYearLocal + 1
        daysInPeriod += new Date(cy, cm + 1, 0).getDate()
      }

      if (daysInPeriod <= 0) return 0
      return (budgetToDate / daysInPeriod) * totalDays
    } else {
      const entry = expenseHistoryRaw[idx]
      const day = entry && typeof entry.day === "number" ? entry.day : idx + 1
      const daysInMonth = new Date(calendarYearSelected, calendarMonthSelected + 1, 0).getDate()
      if (daysInMonth <= 0) return 0
      const monthlyBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)
      return (monthlyBudget / daysInMonth) * day
    }
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
              <CardTitle className="text-lg font-semibold flex items-center">
                <CalendarClock className="h-5 w-5 mr-2" />
                Sélection du mois
              </CardTitle>
            </CardHeader>
          {/* Academic Year + Month Navigation */}
          <Card className="border-0 shadow-sm bg-card ">
            <div className="px-4 pb-3">
              {/* Single row: Year dropdown (left) | Month scroll (middle) | Total toggle (right) */}
              <div className="flex items-center gap-4 mb-3">
                {/* Year Dropdown - Left */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={selectedAcademicStartYear}
                    onChange={(e) => setSelectedAcademicStartYear(parseInt(e.target.value, 10))}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectableAcademicYears.map((startYear) => {
                      const label = `${startYear}-${(startYear + 1).toString().slice(2)}`
                      return (
                        <option key={startYear} value={startYear}>
                          {label}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Month scroll - Middle (only when not in year view) */}
                {(
                  <div className="relative flex-1 min-w-0">
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-card to-transparent z-20" />
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-card to-transparent z-10" />
                    <div className="flex space-x-2 overflow-x-auto scrollbar-hide px-2" ref={monthScrollRef}>
                      {academicMonths.map((m, idx) => {
                        const isSelected = idx === selectedAcademicMonthIndex
                        return (
                          <div
                            key={m + idx}
                            onClick={() => setSelectedAcademicMonthIndex(idx)}
                            className={`flex items-center justify-center rounded-full px-4 py-2 cursor-pointer transition-all duration-200 flex-shrink-0 ${isSelected ? `${ !showAllYear ? "bg-background text-foreground shadow-md" : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-500 hover:bg-background hover:text-foreground"}` : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-500 hover:bg-background hover:text-foreground"}`}
                            tabIndex={0}
                          >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Total Toggle - Right with label on top */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <button
                    className={`h-5 w-10 rounded-full border-1 transition-all flex items-center justify-center ${showAllYear ? "bg-gray-200 border-blue-500" : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"}`}
                    onClick={() => setShowAllYear((v) => !v)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white dark:bg-slate-800 shadow-md transition-transform ${showAllYear ? "translate-x-3" : "-translate-x-3"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                data={expenseHistoryWithCumulative}
                margin={{ top: 10, right: 20, bottom: -10, left: 0 }}
                >
                <XAxis
                  dataKey={showAllYear ? "date" : "day"}
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
                  Math.min(
                  ...expenseHistoryWithCumulative.map((d) => d.cumulativeSpent),
                  scaledTotalBudget
                  ) + 10,
                  ]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  
                  const rawDay = typeof label === "string"
                  ? parseInt(label.split("/").pop() || "0", 10)
                  : Number(label)
                  
                  if (Number.isNaN(rawDay)) return null
                  
                  const year = showAllYear
                  ? payload[0]?.payload?.calYear || selectedAcademicStartYear
                  : calendarYearSelected
                  
                  const month = showAllYear
                  ? (payload[0]?.payload?.month || 1) - 1
                  : calendarMonthSelected
                  
                  const date = new Date(year, month, rawDay)
                  
                  return (
                  <div className="bg-background p-2 rounded shadow">
                  <p className="font-bold flex justify-center items-center mb-2">
                    {date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    })}
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
                <Line
                  type="monotone"
                  dataKey="cumulativeSpent"
                  name="Cumulé"
                  stroke="#ffffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  dot={false}
                />
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
                <ReferenceLine
                  y={scaledTotalBudget}
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
