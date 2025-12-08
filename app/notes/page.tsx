import { Wallet } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { NotesGrid } from "@/components/notes-grid"
import { AddNoteDialog } from "@/components/add-note-dialog"
import { getNotes } from "@/app/actions/notes"
import { ThemeProvider } from "next-themes"
import { PageHeader } from "@/components/page-header"


export default async function Notes() {
  const notesResult = await getNotes()
  const notes = notesResult.data || []

  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="min-h-screen bg-card">
      {/* Header */}
      <PageHeader actionButton={<AddNoteDialog />} />
      {/* Notes Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotesGrid notes={notes} />
      </main>
    </div>
    </ThemeProvider>
  )
}
