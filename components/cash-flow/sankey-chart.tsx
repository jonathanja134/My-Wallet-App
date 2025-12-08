"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, Sankey, Tooltip, Rectangle } from "recharts"
import { useState, useEffect } from "react"
import { Transaction, SankeyDataPoint, SankeyLink, SankeyNode, SankeyChartProps, ExtendedSankeyChartProps, SavedEntry  } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Plus, X } from "lucide-react"


const CustomNode = ({ x, y, width, height, payload, containerWidth }: any) => {
  const isLeft = x < containerWidth / 2
  const offset = 4
  const Delta = "Économies"

  return (
    <g>
      <Rectangle 
        x={x} 
        y={y - offset / 2} 
        width={width} 
        height={height + offset} 
        fill={payload.color || "#6366f1"} 
        fillOpacity="0.8" 
        radius={6}
      />
      <text
        x={isLeft ? x - 10 : x + width + 10}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        fill={payload.name === Delta ? "#ffffffff" : "#ffffffff"}
        fontWeight={payload.name === Delta ? "bold" : "400"}
        fontSize={payload.name === Delta ? 14 : 12}
      >
        {payload.name}
      </text>
      <text
        x={isLeft ? x - 10 : x + width + 10}
        y={y + height / 2 + 14}
        textAnchor={isLeft ? "end" : "start"}
        fill="#b4b4b4"
        fontSize="10"
      >
        {payload.value?.toLocaleString("fr-FR")} €
      </text>
      {payload.monthlyAverage !== undefined && (
        <text
          x={isLeft ? x - 10 : x + width + 10}
          y={y + height / 2 + 28}
          textAnchor={isLeft ? "end" : "start"}
          fill="#888888"
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

// Input Section Component
const EntryInputSection = ({ newEntry, setNewEntry, handleAddEntry, isLoading }: any) => {
  const isFormValid = newEntry.amount && newEntry.label && parseFloat(newEntry.amount) > 0

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-foreground">Ajouter une transaction</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1.5 block">Type</label>
          <select
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as 'revenue' | 'expense' })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="revenue">Revenu</option>
            <option value="expense">Dépense</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1.5 block">Montant (€)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={newEntry.amount}
            onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
            className="w-full text-sm"
            step="0.01"
            min="0"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1.5 block">Description</label>
          <Input
            type="text"
            placeholder="Ex: Salaire, Loyer..."
            value={newEntry.label}
            onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })}
            className="w-full text-sm"
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <Button
            onClick={handleAddEntry}
            disabled={!isFormValid || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  )
}

// Entry List Component
const EntryList = ({ savedEntries, editingId, editEntry, setEditEntry, handleEditEntry, handleSaveEdit, handleCancelEdit, handleDeleteEntry }: any) => {
  if (savedEntries.length === 0) return null

  const revenueEntries = savedEntries.filter((e: SavedEntry) => e.type === 'revenue')
  const expenseEntries = savedEntries.filter((e: SavedEntry) => e.type === 'expense')

  return (
    <div className=" mt-6 space-y-4 gap-6">
      <div>
        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Transactions enregistrées</h4>
        
        {revenueEntries.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 font-medium mb-1.5 ">Revenus</p>
            <div className="space-x-3 gap-2 grid grid-cols-2">
              {revenueEntries.map((entry: SavedEntry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  isEditing={editingId === entry.id}
                  editEntry={editEntry}
                  setEditEntry={setEditEntry}
                  onEdit={() => handleEditEntry(entry)}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  onDelete={() => handleDeleteEntry(entry.id)}
                />
              ))}
            </div>
          </div>
        )}

        {expenseEntries.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1.5">Dépenses</p>
            <div className="space-x-3 grid grid-cols-2 gap-2">
              {expenseEntries.map((entry: SavedEntry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  isEditing={editingId === entry.id}
                  editEntry={editEntry}
                  setEditEntry={setEditEntry}
                  onEdit={() => handleEditEntry(entry)}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  onDelete={() => handleDeleteEntry(entry.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Single Entry Item Component
const EntryItem = ({ entry, isEditing, editEntry, setEditEntry, onEdit, onSave, onCancel, onDelete }: any) => {
  if (isEditing) {
    return (
      <div className="flex gap-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <select
          value={editEntry?.type || 'expense'}
          onChange={(e) => setEditEntry({ ...editEntry!, type: e.target.value as 'revenue' | 'expense' })}
          className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="revenue">Revenu</option>
          <option value="expense">Dépense</option>
        </select>
        <Input
          type="number"
          value={editEntry?.amount || ''}
          onChange={(e) => setEditEntry({ ...editEntry!, amount: e.target.value })}
          className="flex-1 text-xs"
          step="0.01"
          min="0"
        />
        <Input
          type="text"
          value={editEntry?.label || ''}
          onChange={(e) => setEditEntry({ ...editEntry!, label: e.target.value })}
          className="flex-1 text-xs"
        />
        <Button onClick={onSave} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs px-2">Sauvegarder</Button>
        <Button onClick={onCancel} size="sm" variant="outline" className="text-xs px-2">Annuler</Button>
      </div>
    )
  }



  return (
    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-2 h-8 rounded-full flex-shrink-0 ${entry.type === 'revenue' ? 'bg-green-500' : 'bg-red-500'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold flex-shrink-0 ${entry.type === 'revenue' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {entry.type === 'revenue' ? '+' : '-'}{parseFloat(entry.amount).toLocaleString("fr-FR")} €
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{entry.label}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-0.5 ml-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Éditer"
        >
          <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        </button>
      </div>
    </div>
  )
}

export function SankeyChart({
  categories,
  totalIncome,
  totalExpenses,
  transactions = [],
}: ExtendedSankeyChartProps) {
  const [newEntry, setNewEntry] = useState<Omit<SavedEntry, 'id'>>({ type: 'revenue', amount: '', label: '' })
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('sankeyEntries')
    return saved ? JSON.parse(saved) : []
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<SavedEntry | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)

  const generateId = () => Date.now().toString() + Math.random().toString(36)

  const handleAddEntry = () => {
    if (newEntry.amount && newEntry.label && parseFloat(newEntry.amount) > 0) {
      const entryWithId: SavedEntry = { ...newEntry, id: generateId() }
      const updatedEntries = [...savedEntries, entryWithId]
      setSavedEntries(updatedEntries)
      localStorage.setItem('sankeyEntries', JSON.stringify(updatedEntries))
      setNewEntry({ type: 'revenue', amount: '', label: '' })
    }
  }

  const handleDeleteEntry = (id: string) => {
    const updatedEntries = savedEntries.filter(entry => entry.id !== id)
    setSavedEntries(updatedEntries)
    localStorage.setItem('sankeyEntries', JSON.stringify(updatedEntries))
  }

  const handleEditEntry = (entry: SavedEntry) => {
    setEditingId(entry.id || null)
    setEditEntry({ ...entry })
  }

  const handleSaveEdit = () => {
    if (editEntry && editingId) {
      const updatedEntries = savedEntries.map(entry =>
        entry.id === editingId ? editEntry : entry
      )
      setSavedEntries(updatedEntries)
      localStorage.setItem('sankeyEntries', JSON.stringify(updatedEntries))
      setEditingId(null)
      setEditEntry(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditEntry(null)
  }

  // Calculate monthly averages
  const calculateMonthlyAverages = () => {
    const monthlyCashFlow: Record<string, number> = {}
    const monthlyByCategory: Record<string, Record<string, number>> = {}
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    transactions.forEach((t) => {
      const dateStr = t.transaction_date || t.transaction_date
      if (!dateStr) return

      const date = new Date(dateStr)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (t.category_id && t.amount < 0) {
        if (!monthlyByCategory[t.category_id]) monthlyByCategory[t.category_id] = {}
        monthlyByCategory[t.category_id][monthKey] =
          (monthlyByCategory[t.category_id][monthKey] || 0) + Math.abs(t.amount)
      }

      monthlyCashFlow[monthKey] = (monthlyCashFlow[monthKey] || 0) + t.amount
    })

    const monthKeys = Object.keys(monthlyCashFlow).sort()
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
    const hasCurrent = monthKeys.includes(currentMonthKey)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const categoryAverages: Record<string, number> = {}
    Object.entries(monthlyByCategory).forEach(([catId, months]) => {
      let total = 0
      let categoryMonthCount = 0

      Object.entries(months).forEach(([monthKey, amount]) => {
        total += amount
        if (monthKey === currentMonthKey) {
          categoryMonthCount += currentDay / daysInCurrentMonth
        } else {
          categoryMonthCount += 1
        }
      })

      categoryAverages[catId] = categoryMonthCount > 0 ? total / categoryMonthCount : 0
    })

    let totalIncomeValue = 0
    let totalExpensesValue = 0
    const expenseMonths: Record<string, boolean> = {}
    const incomeMonths: Record<string, boolean> = {}

    transactions.forEach((t) => {
      const dateStr = t.transaction_date || t.transaction_date
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

    let incomeMonthCount = Object.keys(incomeMonths).filter((key) => key !== currentMonthKey).length
    let expenseMonthCount = Object.keys(expenseMonths).filter((key) => key !== currentMonthKey).length

    if (hasCurrent) {
      if (incomeMonths[currentMonthKey]) incomeMonthCount += currentDay / daysInCurrentMonth
      if (expenseMonths[currentMonthKey]) expenseMonthCount += currentDay / daysInCurrentMonth
    }

    const totalIncomeAverage = incomeMonthCount > 0 ? totalIncomeValue / incomeMonthCount : 0
    const totalExpensesAverage = expenseMonthCount > 0 ? totalExpensesValue / expenseMonthCount : 0

    return { totalIncomeAverage, totalExpensesAverage, categoryAverages }
  }

  const { totalIncomeAverage, totalExpensesAverage, categoryAverages } = calculateMonthlyAverages()

  const customRevenueTotal = savedEntries
    .filter(entry => entry.type === 'revenue')
    .reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0)

  const customExpenseTotal = savedEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0)

  const totalIncomeAverageWithCustom = totalIncomeAverage + customRevenueTotal
  const totalExpensesAverageWithCustom = totalExpensesAverage + customExpenseTotal

  const createSankeyData = (): SankeyDataPoint => {
    const nodes: SankeyNode[] = []
    const links: SankeyLink[] = []

    // Left column: Income sources
    const customRevenueEntries = savedEntries.filter((entry: any) => entry.type === 'revenue')
    const totalCustomRevenue = customRevenueEntries.reduce((sum, entry: any) => sum + parseFloat(entry.amount || '0'), 0)
    
    // Add main income node (left side)
    nodes.push({
      name: "Revenus",
      color: "#10b981",
      monthlyAverage: totalIncomeAverage,
      value: totalIncomeAverage,
    })

    // Add individual custom revenue nodes (left side)
    const customRevenueStartIndex = nodes.length
    customRevenueEntries.forEach((entry: any) => {
      nodes.push({
        name: entry.label,
        color: "#34d399",
        monthlyAverage: 0,
        value: parseFloat(entry.amount) || 0,
      })
    })

    // Middle column: Total expenses aggregator
    const expenseCategories = categories.filter((cat) => categoryAverages[cat.id] && categoryAverages[cat.id] > 0)
    const customExpenseEntries = savedEntries.filter((entry: any) => entry.type === 'expense')
    const totalExpensesMonthly = expenseCategories.reduce((sum, cat) => sum + (categoryAverages[cat.id] || 0), 0) + 
                                 customExpenseEntries.reduce((sum, entry: any) => sum + parseFloat(entry.amount || '0'), 0)

    let expenseAggregatorIndex = nodes.length
    nodes.push({
      name: "Dépenses",
      color: "#ef4444",
      monthlyAverage: 0,
      value: totalExpensesMonthly,
    })

    // Right column: Individual expense categories
    const expenseCategoryStartIndex = nodes.length
    expenseCategories.forEach((cat) => {
      nodes.push({
        name: cat.name,
        color: cat.color,
        monthlyAverage: categoryAverages[cat.id],
        value: categoryAverages[cat.id],
      })
    })

    // Right column: Custom expense nodes
    const customExpenseStartIndex = nodes.length
    customExpenseEntries.forEach((entry: any) => {
      nodes.push({
        name: entry.label,
        color: "#fca5a5",
        monthlyAverage: 0,
        value: parseFloat(entry.amount) || 0,
      })
    })

    // Right column: Savings node
    const savings = totalIncomeAverage + totalCustomRevenue - totalExpensesMonthly
    let savingsIndex = -1
    if (savings > 0) {
      savingsIndex = nodes.length
      nodes.push({
        name: "Économies",
        color: "#404040ff",
        monthlyAverage: savings,
        value: savings,
      })
    }
    

    // Create links
    // From main income to expenses aggregator
    links.push({
      source: 0,
      target: expenseAggregatorIndex,
      value: totalIncomeAverage,
    })

    // From individual custom revenues to expenses aggregator
    for (let i = 0; i < customRevenueEntries.length; i++) {
      links.push({
        source: customRevenueStartIndex + i,
        target: expenseAggregatorIndex,
        value: parseFloat(customRevenueEntries[i].amount || '0'),
      })
    }

    // From expenses aggregator to individual expense categories
    let nodeIndex = expenseCategoryStartIndex
    expenseCategories.forEach((cat) => {
      links.push({
        source: expenseAggregatorIndex,
        target: nodeIndex,
        value: categoryAverages[cat.id],
      })
      nodeIndex++
    })

    // From expenses aggregator to custom expenses
    nodeIndex = customExpenseStartIndex
    customExpenseEntries.forEach((entry: any) => {
      links.push({
        source: expenseAggregatorIndex,
        target: nodeIndex,
        value: parseFloat(entry.amount),
      })
      nodeIndex++
    })

    // From expenses aggregator to savings
    if (savings > 0) {
      links.push({
        source: expenseAggregatorIndex,
        target: savingsIndex,
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
      <CardContent className="space-y-6">
        <EntryInputSection
          newEntry={newEntry}
          setNewEntry={setNewEntry}
          handleAddEntry={handleAddEntry}
          isLoading={false}
        />

        <EntryList
          savedEntries={savedEntries}
          editingId={editingId}
          editEntry={editEntry}
          setEditEntry={setEditEntry}
          handleEditEntry={handleEditEntry}
          handleSaveEdit={handleSaveEdit}
          handleCancelEdit={handleCancelEdit}
          handleDeleteEntry={handleDeleteEntry}
        />

        <div className="h-[550px] w-full rounded-lg overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<CustomNode />}
              nodePadding={50}
              margin={{ top: 20, right: 150, bottom: 50, left: 150 }}
              link={{ stroke: "#c1d5ffff", strokeOpacity: 0.05 }}
              onMouseEnter={(data: any , index:any) => setHoveredLink(index)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">Revenus moyens</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{totalIncomeAverageWithCustom.toLocaleString("fr-FR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })} €
            </p>
            <p className="text-xs text-gray-500">par mois</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">Dépenses moyennes</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              - {totalExpensesAverageWithCustom.toLocaleString("fr-FR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })} €
            </p>
            <p className="text-xs text-gray-500">par mois</p>
          </div>
        </div>

        {Object.keys(categoryAverages).length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Dépenses mensuelles par catégorie</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {categories
                .filter((cat) => categoryAverages[cat.id] && categoryAverages[cat.id] > 0)
                .sort((a, b) => (categoryAverages[b.id] || 0) - (categoryAverages[a.id] || 0))
                .map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{cat.name}</span>
                    </div>
                    <div className="ml-2 flex-shrink-0 text-right">
                      <span className="text-xs font-bold text-foreground block">
                        {(categoryAverages[cat.id] || 0).toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })} €
                      </span>
                      <span className="text-xs text-gray-500">par mois</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
