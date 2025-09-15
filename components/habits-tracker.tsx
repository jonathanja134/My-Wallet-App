"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react"
import { toggleHabitDay, deleteHabit } from "@/app/actions/habits"
import type { Habit } from "@/lib/supabase"

import { Flame } from "lucide-react";

interface HabitsTrackerProps {
  habits: Habit[]
}

export function HabitsTracker({ habits }: HabitsTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [habitProgress, setHabitProgress] = useState<{ [key: string]: boolean[] }>({})

  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ]

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)

  // Initialize habit progress
  useEffect(() => {
    const progress: { [key: string]: boolean[] } = {}
    habits.forEach((habit) => {
      // Initialize with stored progress or empty array
      const storedProgress = habit.progress || []
      progress[habit.id] = Array(31)
        .fill(false)
        .map((_, index) => (index < storedProgress.length ? storedProgress[index] : false))
    })
    setHabitProgress(progress)
  }, [habits, selectedMonth, selectedYear])

  const handleDayToggle = async (habitId: string, dayIndex: number) => {
    const newProgress = { ...habitProgress }
    if (!newProgress[habitId]) {
      newProgress[habitId] = Array(31).fill(false)
    }
    newProgress[habitId][dayIndex] = !newProgress[habitId][dayIndex]
    setHabitProgress(newProgress)

    // Update in database
    await toggleHabitDay(habitId, dayIndex, newProgress[habitId][dayIndex])
  }

const calculateStreak = (progress: boolean[]) => {
  let maxStreak = 0
  let currentStreak = 0
  const monthProgress = progress.slice(0, daysInMonth)
  for (let i = 0; i < monthProgress.length; i++) {
    if (monthProgress[i]) {
      currentStreak++
      if (currentStreak > maxStreak) maxStreak = currentStreak
    } else {
      currentStreak = 0
    }
  }
  return maxStreak
}

  const calculateMonthlyProgress = (progress: boolean[]) => {
    const completedDays = progress.slice(0, daysInMonth).filter(Boolean).length
    return Math.round((completedDays / daysInMonth) * 100)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  async function handleDeleteHabit(habitId: string) {
    await deleteHabit(habitId)
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card className="border-0 shadow-sm bg-card">
        <CardContent className="p-6  mb-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {months[selectedMonth]} {selectedYear}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Habits List */}
      <div className="space-y-4">
        {[...habits].sort((a, b) => a.name.localeCompare(b.name)).map((habit) => {
          const progress = habitProgress[habit.id] || Array(31).fill(false)
          const streak = calculateStreak(progress)
          const monthlyProgress = calculateMonthlyProgress(progress)

          return (
            <Card key={habit.id} className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: habit.color }}></div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{habit.name}</CardTitle>
                      <p className="hidden sm:block text-sm text-gray-500">
                       {habit.description}
                     </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <span className="sm:hidden">{streak}</span>
                      <Flame className="w-4 h-4 text-red-500" />
                      <span className="hidden sm:inline">
                        {streak} jour{streak > 1 ? "s" : ""} de suite
                      </span>
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
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <Progress value={monthlyProgress} className="h-2" />
                  </div>

                  {/* Daily Checkboxes */}
                  <div className="flex flex-wrap gap-1 justify-start max-w-fit mx-auto">
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const isCompleted = progress[dayIndex]
                      const isToday =
                        new Date().getDate() === dayIndex + 1 &&
                        new Date().getMonth() === selectedMonth &&
                        new Date().getFullYear() === selectedYear

                      return (
                        <button
                          key={dayIndex}
                          onClick={() => handleDayToggle(habit.id, dayIndex)}
                          className={`
                            w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110
                            ${
                              isCompleted
                                ? "border-green-500 bg-green-500 text-white"
                                : " bg-background"
                            }
                            ${isToday ? "ring-0  ring-offset-2" : ""}
                          `}
                          title={`${dayIndex + 1} ${months[selectedMonth]} - ${isCompleted ? "Terminé" : "À faire"}`}
                        >
                        {dayIndex + 1}
                          {isCompleted && (
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                          )}
                        </button>
                      )
                    })}
                    {/* Fill remaining slots for visual consistency */}
                    {Array.from({ length: 31 - daysInMonth }, (_, i) => (
                      <div key={`empty-${i}`} className="w-8 h-8"></div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap justify-center gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {progress.slice(0, daysInMonth).filter(Boolean).length}
                      </p>
                      <p className="text-xs text-gray-500">Jours réussis</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{streak}</p>
                      <p className="text-xs text-gray-500">Série actuelle</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">{monthlyProgress}%</p>
                      <p className="text-xs text-gray-500">Taux de réussite</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {habits.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune habitude</h3>
            <p className="text-gray-500 mb-4">Commencez par ajouter votre première habitude à suivre</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}