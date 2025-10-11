"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { PieChartIcon } from "lucide-react"
import { BudgetDonutChartProps } from "@/lib/supabase"


export function BudgetDonutChart({ categories, pageName }: BudgetDonutChartProps) {
  // Prepare data for the chart
  const chartData = categories.map((category) => ({
    name: category.name,
    value: category.spent,
    budget: category.budget_amount,
    color: category.color,
    percentage: category.budget_amount > 0 ? (category.spent / category.budget_amount) * 100 : 0,
  }))

  // Calculate totals
  const totalSpent = chartData.reduce((sum, item) => sum + item.value, 0)
  const totalBudget = chartData.reduce((sum, item) => sum + item.budget, 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground mb-1">{data.name}</p>
          <p className="text-sm text-foreground">Dépensé: {data.value.toLocaleString("fr-FR")} €</p>
          <p className="text-sm text-foreground">Budget: {data.budget.toLocaleString("fr-FR")} €</p>
          <p className="text-sm font-medium text-foreground">{data.percentage.toFixed(1)}% utilisé</p>
        </div>
      )
    }
    return null
  }

  // Custom label for center of donut
  const CenterLabel = () => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-0.5em" className="text-2xl font-bold fill-foreground">
        {totalSpent.toLocaleString("fr-FR")} €
      </tspan>
      <tspan x="50%" dy="1.5em" className="text-sm fill-foreground">
        / {totalBudget.toLocaleString("fr-FR")} €
      </tspan>
      <tspan x="50%" dy="1.2em" className="text-xs fill-foreground">
        {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% utilisé
      </tspan>
    </text>
  )

  if (categories.length === 0) {
    return (
      <Card className=" shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2" />
            Répartition du budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <PieChartIcon className="h-12 w-12 mb-4 text-gray-400" />
            <p className="text-center">Aucune catégorie de budget disponible</p>
            <p className="text-sm text-center mt-1">Ajoutez des catégories pour voir la répartition</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <PieChartIcon className="h-5 w-5 mr-2" />
          Répartition des dépenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pageName !== "budget" && (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="95%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <CenterLabel />
            </PieChart>
          </ResponsiveContainer>
        </div>)}
        {pageName === "budget" && (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="95%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <CenterLabel />
            </PieChart>
          </ResponsiveContainer>
        </div>)}

        {/* Budget Status Bars */}
        {pageName !== "budget" && (
        <div className="mt-6 space-y-3">
          {chartData.map((category, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <span className="font-medium text-foreground">{category.name}</span>
                </div>
                <span className="text-gray-500">
                  {category.value.toLocaleString("fr-FR")} / {category.budget.toLocaleString("fr-FR")} €
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    category.percentage > 100
                      ? "bg-red-500"
                      : category.percentage > 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(category.percentage, 100)}%`,
                    backgroundColor: category.percentage <= 100 ? category.color : undefined,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}