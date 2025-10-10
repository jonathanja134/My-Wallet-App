import { Button } from "@/components/ui/button"
import { Wallet, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { HabitsTracker } from "@/components/habits-tracker"
import { AddHabitDialog } from "@/components/add-habit-dialog"
import { getHabits } from "@/app/actions/habits"
import { ThemeProvider } from "next-themes"

export default async function Habits() {
  const habitsResult = await getHabits()
  const habits = habitsResult.data || []

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="bg-background min-h-screen">
       {/* Header */}
       <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-card-foreground">My Wallet</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Tableau de bord
              </Link>
              <Link href="/budget" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Budget
              </Link>
              <Link href="/expenses" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Dépenses
              </Link>
              <Link href="/goals" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                Objectifs
              </Link>
              <Link href="/task" className="font-semibold text-card-foreground hover:text-accent-foreground">
                Habitudes
              </Link>
              <Link href="/notes" className="font-semibold text-secondary-foreground hover:text-accent-foreground">
                notes
              </Link>
              
            </nav>
            <AddHabitDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HabitsTracker habits={habits} />
      </main>
    </div>
    </ThemeProvider>
  )
}