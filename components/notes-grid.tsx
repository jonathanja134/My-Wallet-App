"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, Pin, PinOff, FileText, Calendar, Tag } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditNoteDialog } from "@/components/edit-note-dialog"
import { deleteNote, togglePinNote } from "@/app/actions/notes"
import type { Note } from "@/lib/supabase"

interface NotesGridProps {
  notes: Note[]
}

export function NotesGrid({ notes }: NotesGridProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Sort notes: pinned first, then by updated date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const handleEditNote = (note: Note) => {
    setSelectedNote(note)
    setEditDialogOpen(true)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      await deleteNote(noteId)
    }
  }

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    await togglePinNote(noteId, !isPinned)
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Personnel: "bg-blue-100 text-blue-800",
      Travail: "bg-green-100 text-green-800",
      Idées: "bg-purple-100 text-purple-800",
      Projets: "bg-orange-100 text-orange-800",
      Finances: "bg-yellow-100 text-yellow-800",
      Santé: "bg-red-100 text-red-800",
      Voyage: "bg-indigo-100 text-indigo-800",
      Recettes: "bg-pink-100 text-pink-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mb-1">$1</h3>')
      .replace(/\n/g, "<br>")
  }

  const getPreviewText = (content: string) => {
    // Remove markdown formatting for preview
    return (
      content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#{1,3} (.*$)/gm, "$1")
        .replace(/\n/g, " ")
        .substring(0, 150) + (content.length > 150 ? "..." : "")
    )
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune note</h3>
        <p className="text-gray-500 mb-4">Commencez par créer votre première note</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedNotes.map((note) => (
          <Card
            key={note.id}
            className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer relative ${
              note.is_pinned ? "ring-2 ring-yellow-200 bg-yellow-50" : "bg-background"
            }`}
            style={{ borderLeft: `4px solid ${note.color}` }}
          >
            {note.is_pinned && <Pin className="absolute top-2 right-2 h-4 w-4 text-yellow-600" />}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-foreground truncate mb-1"
                    dangerouslySetInnerHTML={{
                      __html: note.title.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(note.category)}>{note.category}</Badge>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Tag className="h-3 w-3 text-foreground" />
                        <span className="text-xs text-foreground">
                          {note.tags.slice(0, 2).join(", ")}
                          {note.tags.length > 2 && "..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditNote(note)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTogglePin(note.id, note.is_pinned)}>
                      {note.is_pinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Détacher
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Épingler
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteNote(note.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div
                className="text-sm text-foreground mb-3 line-clamp-4"
                dangerouslySetInnerHTML={{ __html: renderContent(getPreviewText(note.content)) }}
              />

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(note.updated_at).toLocaleDateString("fr-FR")}
                </div>
                <span>{note.content.length} caractères</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedNote && <EditNoteDialog note={selectedNote} open={editDialogOpen} onOpenChange={setEditDialogOpen} />}
    </>
  )
}