
import { Wallet } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { HabitsTracker } from "@/components/habits-tracker"
import { AddHabitDialog } from "@/components/add-habit-dialog"
import { getHabits } from "@/app/actions/habits"
import { ThemeProvider } from "next-themes"
import { PageHeader } from "@/components/page-header"

export default async function Habits() {
  const habitsResult = await getHabits()
  const habits = habitsResult.data || []

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="bg-background min-h-screen">
       {/* Header */}
      <PageHeader actionButton={<AddHabitDialog />} />
      {/* Habits Tracker */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HabitsTracker habits={habits} />
      </main>
    </div>
    </ThemeProvider>
  )
}