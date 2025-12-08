"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, Sankey, Tooltip, Rectangle } from "recharts"
import { useState } from "react"
import { SankeyDataPoint, SankeyLink, SankeyNode, SankeyChartProps } from "@/lib/supabase"

interface Transaction {
  amount: number
  transaction_date?: string
  date?: string
  category_id: string
}

interface ExtendedSankeyChartProps extends SankeyChartProps {
  transactions?: Transaction[]
}

const CustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
  const isLeft = x < containerWidth / 2
  const offset = 4

  return (
    <g>
      <Rectangle x={x} y={y-offset/2} width={width} height={height+offset} fill={payload.color || "#6366f1"} fillOpacity="0.8" radius={6}/>
      <text
        x={isLeft ? x - 10 : x + width + 10}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        
        fill="#ffffffff"
        fontSize="12"
        fontWeight="800"
      >
        {payload.name}
      </text>
      <text
        x={isLeft ? x - 10 : x + width + 10}
        y={y + height / 2 + 14}
        textAnchor={isLeft ? "end" : "start"}
        fill="#b4b4b4ff"
        fontSize="10"
      >
        {payload.value?.toLocaleString("fr-FR")} €
      </text>
      {payload.monthlyAverage !== undefined && (
        <text
          x={isLeft ? x - 10 : x + width + 10}
          y={y + height / 2 + 28}
          textAnchor={isLeft ? "end" : "start"}
          fill="#888888ff"
          fontSize="9"
        >
          Moy: {payload.monthlyAverage?.toLocaleString("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} €/mois
        </text>
      )}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-foreground">
          {data.source?.name} → {data.target?.name}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Montant: {data.value?.toLocaleString("fr-FR")} €
        </p>
        {data.source?.monthlyAverage !== undefined && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Source moyenne: {data.source.monthlyAverage?.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })} €/mois
          </p>
        )}
      </div>
    )
  }
  return null
}

export function SankeyChart({
  categories,
  totalIncome,
  totalExpenses,
  transactions = [],
}: ExtendedSankeyChartProps) {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)

  // Calculate monthly averages
  const calculateMonthlyAverages = () => {
    const monthlyCashFlow: Record<string, number> = {}
    const monthlyByCategory: Record<string, Record<string, number>> = {}
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    transactions.forEach((t) => {
      const dateStr = t.transaction_date || t.date
      if (!dateStr) return

      const date = new Date(dateStr)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      // Monthly by category (absolute value for expenses only)
      if (t.category_id && t.amount < 0) {
        if (!monthlyByCategory[t.category_id]) {
          monthlyByCategory[t.category_id] = {}
        }
        monthlyByCategory[t.category_id][monthKey] =
          (monthlyByCategory[t.category_id][monthKey] || 0) + Math.abs(t.amount)
      }

      // Total monthly cash flow
      monthlyCashFlow[monthKey] = (monthlyCashFlow[monthKey] || 0) + t.amount
    })

    // Get all unique months from transactions
    const monthKeys = Object.keys(monthlyCashFlow).sort()
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
    const hasCurrent = monthKeys.includes(currentMonthKey)

    // Calculate number of days in current month
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Global month count for total income/expenses (all months with any transactions)
    let globalMonthCount = monthKeys.filter((key) => key !== currentMonthKey).length
    if (hasCurrent) {
      globalMonthCount += currentDay / daysInCurrentMonth
    }

    const categoryAverages: Record<string, number> = {}
    Object.entries(monthlyByCategory).forEach(([catId, months]) => {
      let total = 0
      let categoryMonthCount = 0

      // Count only months where this category has transactions
      Object.entries(months).forEach(([monthKey, amount]) => {
        total += amount
        if (monthKey === currentMonthKey) {
          // Current month counts as fraction
          categoryMonthCount += currentDay / daysInCurrentMonth
        } else {
          // Past months count as 1
          categoryMonthCount += 1
        }
      })

      categoryAverages[catId] = categoryMonthCount > 0 ? total / categoryMonthCount : 0
    })

    // Calculate totals - count only expense months for expenses
    let totalIncomeValue = 0
    let totalExpensesValue = 0
    const expenseMonths: Record<string, boolean> = {}
    const incomeMonths: Record<string, boolean> = {}

    transactions.forEach((t) => {
      const dateStr = t.transaction_date || t.date
      if (!dateStr) return
      const date = new Date(dateStr)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (t.amount > 0) {
        totalIncomeValue += t.amount
        incomeMonths[monthKey] = true
      } else {
        totalExpensesValue += Math.abs(t.amount)
        expenseMonths[monthKey] = true
      }
    })

    // Calculate month counts for income and expenses separately
    let incomeMonthCount = Object.keys(incomeMonths).filter((key) => key !== currentMonthKey).length
    let expenseMonthCount = Object.keys(expenseMonths).filter((key) => key !== currentMonthKey).length

    if (hasCurrent) {
      if (incomeMonths[currentMonthKey]) {
        incomeMonthCount += currentDay / daysInCurrentMonth
      }
      if (expenseMonths[currentMonthKey]) {
        expenseMonthCount += currentDay / daysInCurrentMonth
      }
    }

    const totalIncomeAverage = incomeMonthCount > 0 ? totalIncomeValue / incomeMonthCount : 0
    const totalExpensesAverage = expenseMonthCount > 0 ? totalExpensesValue / expenseMonthCount : 0

    return { totalIncomeAverage, totalExpensesAverage, categoryAverages }
  }

  const { totalIncomeAverage, totalExpensesAverage, categoryAverages } = calculateMonthlyAverages()

  // Create Sankey data structure
  const createSankeyData = (): SankeyDataPoint => {
    const nodes: SankeyNode[] = []
    const links: SankeyLink[] = []

    // Add income node
    nodes.push({
      name: "Revenus",
      color: "#10b981",
      monthlyAverage: totalIncomeAverage,
    })

    // Add category nodes (expenses)
    const expenseCategories = categories.filter((cat) => cat.expenses > 0)
    expenseCategories.forEach((cat) => {
      nodes.push({
        name: cat.name,
        color: cat.color,
        monthlyAverage: categoryAverages[cat.id] || 0,
      })
    })

    // Add savings node if there's remaining money
    const savings = totalIncome - totalExpenses
    if (savings > 0) {
      const savingsAverage = totalIncomeAverage - totalExpensesAverage
      nodes.push({
        name: "Épargne",
        color: "#3b82f6",
        monthlyAverage: savingsAverage > 0 ? savingsAverage : 0,
      })
    }

    // Create links from income to categories
    expenseCategories.forEach((cat, index) => {
      links.push({
        source: 0, // Income node
        target: index + 1, // Category node
        value: cat.expenses,
      })
    })

    // Create link from income to savings
    if (savings > 0) {
      links.push({
        source: 0,
        target: nodes.length - 1,
        value: savings,
      })
    }

    return { nodes, links }
  }

  const sankeyData = createSankeyData()

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Flux de trésorerie</CardTitle>
        <CardDescription>Visualisation des flux financiers de vos revenus vers vos dépenses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<CustomNode />}
              nodePadding={50}
              margin={{ top: 20, right: 150, bottom: 20, left: 150 }}
              link={{ stroke: "#c1d5ffff", strokeOpacity: 0.2 }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>

        {/* Monthly Averages Summary */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg ">
          <h4 className="text-sm font-semibold text-foreground mb-4">Moyennes mensuelles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Revenus moyens</p>
              <p className="text-lg font-semibold text-green-600">
                +{totalIncomeAverage.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} € / mois
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Dépenses moyennes</p>
              <p className="text-lg font-semibold text-red-600">
                -{totalExpensesAverage.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} € / mois
              </p>
            </div>
          </div>

          {/* Category monthly averages */}
          {Object.keys(categoryAverages).length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-xs text-gray-500 mb-3 font-medium">Par catégorie</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categories
                  .filter((cat) => categoryAverages[cat.id] && categoryAverages[cat.id] > 0)
                  .sort((a, b) => (categoryAverages[b.id] || 0) - (categoryAverages[a.id] || 0))
                  .map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-sm p-2 rounded bg-slate-100 dark:bg-slate-800">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {(categoryAverages[cat.id] || 0).toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })} €/mois
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-foreground mb-3">Légende</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">Revenus</span>
            </div>
            {categories
              .filter((cat) => cat.expenses > 0)
              .map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-sm text-gray-400">{cat.name}</span>
                </div>
              ))}
            {totalIncome - totalExpenses > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-400">Épargne</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
