"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, PieChart } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { BudgetCategory, Transaction } from "@/lib/supabase"

interface BudgetItem {
  category: string
  budget: number
  spent: number
}

interface ExpenseHistoryChartProps {
  expenseHistory: Array<{
    date: string
    spent: number
  }>
  budgetData: BudgetItem[]
}

export function ExpenseHistoryChart({
  expenseHistory = [],
  budgetData = [],
}: ExpenseHistoryChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Historique des dépenses -
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseHistory} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString("fr-FR")} €`} 
                  contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "none", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="spent" 
                  stroke="#0088ff" 
                  strokeWidth={3}
                  strokeLinecap="round" // ← makes line ends rounded
                  dot={false} 
                  activeDot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {/* Budget vs Expenses */}
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
              {(budgetData || []).slice(0, 5).map((item, index) => {
                const percentage = item.budget > 0 ? (item.spent / item.budget) * 100 : 0
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-gray-500">
                        {item.spent.toLocaleString("fr-FR")} / {item.budget.toLocaleString("fr-FR")} €
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