import { Button } from "@/components/ui/button"
import { Wallet, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { NotesGrid } from "@/components/notes-grid"
import { AddNoteDialog } from "@/components/add-note-dialog"
import { getNotes } from "@/app/actions/notes"
import { ThemeProvider } from "next-themes"


export default async function Notes() {
  const notesResult = await getNotes()
  const notes = notesResult.data || []

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <Link href="/" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Mes Notes</h1>
            </div>
            <AddNoteDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotesGrid notes={notes} />
      </main>
    </div>
    </ThemeProvider>
  )
}
