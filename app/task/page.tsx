import { Button } from "@/components/ui/button"
import { Wallet, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { HabitsTracker } from "@/components/habits-tracker"
import { AddHabitDialog } from "@/components/add-habit-dialog"
import { getHabits } from "@/app/actions/habits"

export default async function Habits() {
  const habitsResult = await getHabits()
  const habits = habitsResult.data || []

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card border-border border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <Link href="/" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Suivi des Habitudes</h1>
            </div>
            <AddHabitDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HabitsTracker habits={habits} />
      </main>
    </div>
  )
}