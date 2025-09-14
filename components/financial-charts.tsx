"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, PieChart, Calendar, CalendarArrowUp, CalendarXIcon, CalendarClock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Transaction } from "@/app/types/transaction"
import { getTransactions } from "@/app/actions/expenses"
import { ReferenceLine } from "recharts"

interface BudgetItem {
  category: string
  budget: number
  spent: number
}

interface ExpenseHistoryChartProps {
  expenseHistory: Array<{ date: string; spent: number }>
  budgetData: BudgetItem[]
  monthName: string
}

function getExpensesByCategory(
  transactions: Transaction[],
  month?: number,
  year?: number
) {
  return transactions
    .filter((t) => t.amount < 0) // uniquement les dépenses
    .filter((t) => {
      if (month === undefined || year === undefined) return true
      const d = new Date(t.transaction_date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .reduce((acc, t) => {
      const category = t.budget_categories?.name ?? "Autres"
      const existing = acc.find((c: any) => c.category === category)
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
}: ExpenseHistoryChartProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Charger les transactions depuis Supabase
  useEffect(() => {
    getTransactions().then((res) => {
      if (res.data) setTransactions(res.data)
    })
  }, [])

  const now = new Date()
  const expensesByCategory = getExpensesByCategory(
    transactions,
    now.getMonth(),
    now.getFullYear()
  )
  const expenseHistoryWithCumulative = expenseHistory
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .map((item, index, arr) => {
    const cumulativeSpent = arr
      .slice(0, index + 1)
      .reduce((sum, t) => sum + t.spent, 0)
    
    return { ...item, cumulativeSpent }
  })
  /* Limite budgétaire cumulée */
const totalBudget = budgetData.reduce((sum, i) => sum + i.budget, 0)

function plannedExpenses(day: number, totalBudget: number): number {
    const T = new Date();
    const daysInMonth = new Date(T.getFullYear(), T.getMonth() + 1, 0).getDate();

    // Linear calculation: y = (totalBudget / daysInMonth) * day
    const todayExpenses = (totalBudget / daysInMonth) * day;

    return todayExpenses;
}

const PlannedExpenseData = [];
for (let day = 1; day <= 31; day++) {
    PlannedExpenseData.push({
        date: day.toString(),
        planned: plannedExpenses(day, totalBudget)
    });
}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Courbe des dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CalendarClock className="h-5 w-5 mr-2" />
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseHistoryWithCumulative} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <XAxis dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       domain={[0,31]}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, Math.max(totalBudget, ...expenseHistoryWithCumulative.map(d => d.cumulativeSpent))+10]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                  
                      const day = label
                  
                    return (
                      <div className="bg-white p-2 rounded shadow">
                        {/* Bold day + month */}
                        <p className="font-bold">{`${day} ${monthName}`}</p>
                    
                        {/* Values */}
                        {payload.map((entry, index) => (
                          <p key={index} style={{ color: entry.color }}>
                            {entry.name}:{entry.value !== undefined ? entry.value.toLocaleString("fr-FR") + " €" : "-"}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                {/* Limite budgétaire planifiée */}
                <Line
                  type="monotone"
                  dataKey={(data) => {
                    const day = parseInt(data.date, 10);
                    const planned = plannedExpenses(day, totalBudget);
                    return planned;
                  }}
                  strokeDasharray="5 5" 
                  name="Limite planifiée"
                  stroke="#ffeed4ff"
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
                {/* limite cumulées */}
                <ReferenceLine
                  y={budgetData.reduce((sum, item) => sum + item.budget, 0)}
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
                const categoryExpense = expensesByCategory.find((e:any) => e.category === item.category)
                const spent = categoryExpense?.total ?? 0
                const percentage = item.budget > 0 ? (spent / item.budget) * 100 : 0
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-gray-500">
                        {spent.toLocaleString("fr-FR")} / {item.budget.toLocaleString("fr-FR")} €
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
