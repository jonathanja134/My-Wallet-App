"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"

export function CustomizeSimulationDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    monthlyIncome: 3500,
    monthlyExpenses: 2300,
    currentAge: 30,
    targetAge: 60,
    expectedReturn: 7,
    currentSavings: 50000,
  })

  const [results, setResults] = useState({
    monthlyNeeded: 0,
    totalNeeded: 0,
    feasible: true,
  })

  function calculateSimulation() {
    const yearsToRetirement = formData.targetAge - formData.currentAge
    const monthsToRetirement = yearsToRetirement * 12
    const annualExpenses = formData.monthlyExpenses * 12
    const capitalNeeded = annualExpenses * 25 // Règle des 4%

    const monthlySavings = formData.monthlyIncome - formData.monthlyExpenses
    const futureValue = formData.currentSavings * Math.pow(1 + formData.expectedReturn / 100, yearsToRetirement)
    const additionalNeeded = Math.max(0, capitalNeeded - futureValue)

    // Calcul de l'épargne mensuelle nécessaire
    const monthlyRate = formData.expectedReturn / 100 / 12
    const monthlyNeeded =
      additionalNeeded > 0 ? (additionalNeeded * monthlyRate) / (Math.pow(1 + monthlyRate, monthsToRetirement) - 1) : 0

    setResults({
      monthlyNeeded: Math.round(monthlyNeeded),
      totalNeeded: Math.round(capitalNeeded),
      feasible: monthlyNeeded <= monthlySavings,
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    calculateSimulation()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Calculator className="h-4 w-4 mr-2" />
          Personnaliser la simulation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simulateur d'indépendance financière</DialogTitle>
          <DialogDescription>Personnalisez vos paramètres pour calculer votre stratégie d'épargne</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Revenus mensuels (€)</Label>
              <Input
                id="monthlyIncome"
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyExpenses">Dépenses mensuelles (€)</Label>
              <Input
                id="monthlyExpenses"
                type="number"
                value={formData.monthlyExpenses}
                onChange={(e) => setFormData({ ...formData, monthlyExpenses: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentAge">Âge actuel</Label>
              <Input
                id="currentAge"
                type="number"
                value={formData.currentAge}
                onChange={(e) => setFormData({ ...formData, currentAge: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAge">Âge cible</Label>
              <Input
                id="targetAge"
                type="number"
                value={formData.targetAge}
                onChange={(e) => setFormData({ ...formData, targetAge: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedReturn">Rendement annuel (%)</Label>
              <Input
                id="expectedReturn"
                type="number"
                step="0.1"
                value={formData.expectedReturn}
                onChange={(e) => setFormData({ ...formData, expectedReturn: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentSavings">Épargne actuelle (€)</Label>
              <Input
                id="currentSavings"
                type="number"
                value={formData.currentSavings}
                onChange={(e) => setFormData({ ...formData, currentSavings: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Calculer
          </Button>
        </form>

        {results.monthlyNeeded > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Résultats de la simulation</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Capital nécessaire :</span>
                <span className="font-medium">{results.totalNeeded.toLocaleString("fr-FR")} €</span>
              </div>
              <div className="flex justify-between">
                <span>Épargne mensuelle requise :</span>
                <span className={`font-medium ${results.feasible ? "text-green-600" : "text-red-600"}`}>
                  {results.monthlyNeeded.toLocaleString("fr-FR")} €
                </span>
              </div>
              <div className="flex justify-between">
                <span>Capacité d'épargne actuelle :</span>
                <span className="font-medium">
                  {(formData.monthlyIncome - formData.monthlyExpenses).toLocaleString("fr-FR")} €
                </span>
              </div>
              <div className="pt-2 border-t">
                <p className={`text-sm ${results.feasible ? "text-green-600" : "text-red-600"}`}>
                  {results.feasible
                    ? "✅ Objectif réalisable avec votre capacité d'épargne actuelle"
                    : "⚠️ Vous devez augmenter vos revenus ou réduire vos dépenses"}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
