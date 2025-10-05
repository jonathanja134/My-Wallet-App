"use client"

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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Bold, Italic, Hash } from "lucide-react"
import { createNote } from "@/app/actions/notes"

export function AddNoteDialog() {
  
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")

  const categories = [
    { name: "Personnel", color: "#3B82F6" },
    { name: "Travail", color: "#10B981" },
    { name: "Idées", color: "#8B5CF6" },
    { name: "Projets", color: "#F59E0B" },
    { name: "Finances", color: "#EF4444" },
    { name: "Santé", color: "#EC4899" },
    { name: "Voyage", color: "#6366F1" },
    { name: "Recettes", color: "#84CC16" },
  ]

  const insertFormatting = (format: string) => {
    const textarea = document.getElementById("note-content") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let newText = ""
    let cursorOffset = 0

    switch (format) {
      case "bold":
        newText = `**${selectedText}**`
        cursorOffset = selectedText ? 0 : 2
        break
      case "italic":
        newText = `*${selectedText}*`
        cursorOffset = selectedText ? 0 : 1
        break
      case "h1":
        newText = `# ${selectedText}`
        cursorOffset = selectedText ? 0 : 2
        break
      case "h2":
        newText = `## ${selectedText}`
        cursorOffset = selectedText ? 0 : 3
        break
      case "h3":
        newText = `### ${selectedText}`
        cursorOffset = selectedText ? 0 : 4
        break
    }

    const newContent = content.substring(0, start) + newText + content.substring(end)
    setContent(newContent)

    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + newText.length - cursorOffset
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    // Add content and title to formData
    formData.set("content", content)
    formData.set("title", title)

    const result = await createNote(formData)

    if (result.success) {
      setOpen(false)
      setContent("")
      setTitle("")
    } else {
      alert(result.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-black text-white hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle note</DialogTitle>
          <DialogDescription>
            Utilisez les outils de formatage pour styliser votre note comme dans Notion.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de votre note..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <div className="grid grid-cols-8 gap-1">
                {categories.map((category) => (
                  <label key={category.color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={category.color}
                      className="sr-only"
                      defaultChecked={category.color === "#3B82F6"}
                    />
                    <div
                      className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                      style={{ backgroundColor: category.color }}
                    ></div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
            <Input id="tags" name="tags" placeholder="tag1, tag2, tag3..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-content">Contenu</Label>

            {/* Formatting Toolbar */}
            <div className="flex items-center space-x-2 p-2 border rounded-t-md bg-gray-50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("bold")}
                title="Gras (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("italic")}
                title="Italique (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-gray-300"></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting("h1")} title="Titre 1">
                <Hash className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting("h2")} title="Titre 2">
                <Hash className="h-3 w-3" />
                <Hash className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting("h3")} title="Titre 3">
                <Hash className="h-2 w-2" />
                <Hash className="h-2 w-2" />
                <Hash className="h-2 w-2" />
              </Button>
            </div>

            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrivez votre note ici... Utilisez **gras**, *italique*, # Titre 1, ## Titre 2, ### Titre 3"
              rows={12}
              className="rounded-t-none font-mono text-sm"
              required
            />

            {/* Preview */}
            {content && (
              <div className="p-3 border rounded-md bg-gray-50">
                <Label className="text-xs text-gray-500 mb-2 block">Aperçu :</Label>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-2">$1</h1>')
                      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-2">$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mb-1">$1</h3>')
                      .replace(/\n/g, "<br>"),
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
