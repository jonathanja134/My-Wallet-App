"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Calendar, Trash2, Flame } from "lucide-react"
import { toggleHabitDay, deleteHabit } from "@/app/actions/habits"
import type { Habit } from "@/lib/supabase"

interface HabitsTrackerProps {
  habits: Habit[]
}

export function HabitsTracker({ habits }: HabitsTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [habitProgress, setHabitProgress] = useState(() => {
    const initial: Record<string, any> = {}
    for (const habit of habits) {
      initial[habit.id] = habit.progress || {}
    }
    return initial
  })

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ]

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate()

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)

  // ✅ Handle toggling of a day
  const handleDayToggle = async (habitId: string, dayIndex: number) => {
    const yearKey = String(selectedYear)
    const monthKey = String(selectedMonth)
    const days = getDaysInMonth(selectedMonth, selectedYear)

    // clone previous state
    const newProgress = structuredClone(habitProgress)
    if (!newProgress[habitId]) newProgress[habitId] = {}
    if (!newProgress[habitId][yearKey]) newProgress[habitId][yearKey] = {}
    if (!newProgress[habitId][yearKey][monthKey]) {
      newProgress[habitId][yearKey][monthKey] = Array(days).fill(false)
    }

    const current = newProgress[habitId][yearKey][monthKey][dayIndex]
    newProgress[habitId][yearKey][monthKey][dayIndex] = !current

    // update UI immediately
    setHabitProgress(newProgress)

    // save change to backend
    await toggleHabitDay(habitId, dayIndex, !current, selectedMonth, selectedYear)
  }

  const calculateStreak = (progress: boolean[]) => {
    let maxStreak = 0
    let currentStreak = 0
    for (let i = 0; i < progress.length; i++) {
      if (progress[i]) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
    return maxStreak
  }

  const calculateMonthlyProgress = (progress: boolean[]) => {
    const completed = progress.filter(Boolean).length
    return Math.round((completed / progress.length) * 100)
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

  async function handleDeleteHabit(habitId: string) {
    await deleteHabit(habitId)
  }

  return (
    <div className="space-y-6">
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

          <h2 className="text-center text-2xl font-bold text-foreground">
            {months[selectedMonth]} {selectedYear}
          </h2>
        </CardContent>
      </Card>

      {/* Habits */}
      <div className="space-y-4">
        {habits.map((habit) => {
          const yearKey = String(selectedYear)
          const monthKey = String(selectedMonth)
          const monthProgress =
            habitProgress[habit.id]?.[yearKey]?.[monthKey] || Array(daysInMonth).fill(false)

          const streak = calculateStreak(monthProgress)
          const monthlyProgress = calculateMonthlyProgress(monthProgress)

          return (
            <Card key={habit.id} className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: habit.color }} />
                    <div>
                      <CardTitle className="text-lg font-semibold">{habit.name}</CardTitle>
                      {habit.description && (
                        <p className="text-sm text-gray-500">{habit.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Flame className="w-4 h-4 text-red-500" />
                      <span>{streak} jour{streak > 1 ? "s" : ""} de suite</span>
                    </Badge>
                    <form action={handleDeleteHabit.bind(null, habit.id)}>
                      <Button variant="ghost" size="sm" type="submit">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Progression du mois</span>
                    <span className="text-sm font-medium text-gray-900">{monthlyProgress}%</span>
                  </div>
                  <Progress value={monthlyProgress} className="h-2" />
                </div>

                {/* Days Grid */}
                <div className="flex flex-wrap gap-1 justify-start max-w-fit mx-auto">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const isCompleted = monthProgress[i]
                    const isToday =
                      new Date().getDate() === i + 1 &&
                      new Date().getMonth() === selectedMonth &&
                      new Date().getFullYear() === selectedYear

                    return (
                      <button
                        key={i}
                        onClick={() => handleDayToggle(habit.id, i)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                          isCompleted
                            ? "border-green-500 bg-green-500 text-white"
                            : "bg-background"
                        } ${isToday ? "ring-2 ring-offset-2 ring-green-400" : ""}`}
                        title={`${i + 1} ${months[selectedMonth]} - ${isCompleted ? "Terminé" : "À faire"}`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Empty state */}
        {habits.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune habitude</h3>
              <p className="text-gray-500 mb-4">Ajoutez votre première habitude à suivre</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
