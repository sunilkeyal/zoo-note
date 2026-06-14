"use client"

import React, { useCallback, useRef, useState, useEffect } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { FontSize } from "@/extensions/FontSize"
import { useNotes } from "@/contexts/NoteContext"
import NoteEditor from "./NoteEditor"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from "lucide-react"

const FONT_SIZES = ["13", "14", "15", "16", "17", "18", "20", "24", "30"]
const HEADINGS = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
]

export default function MainArea() {
  const { activeNote, activeNoteId, updateNote } = useNotes()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const activeNoteIdRef = useRef(activeNoteId)
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId
  }, [activeNoteId])
  const [title, setTitle] = useState("")
  const [, setSelectionVersion] = useState(0)

  const handleUpdate = useCallback((id: string, content: string) => {
    pendingUpdate.current = { id, content }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (pendingUpdate.current) {
        updateNote(pendingUpdate.current.id, { content: pendingUpdate.current.content })
        pendingUpdate.current = null
      }
    }, 1000)
  }, [updateNote])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontSize,
    ],
    content: activeNote?.content || "<p></p>",
    editorProps: {
      attributes: { class: "note-editor" },
    },
    onUpdate: ({ editor: ed }) => {
      const id = activeNoteIdRef.current
      if (id) handleUpdate(id, ed.getHTML())
    },
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1)
    },
  })

  useEffect(() => {
    if (editor && activeNote && activeNote.content !== editor.getHTML()) {
      editor.commands.setContent(activeNote.content || "<p></p>")
    }
  }, [activeNote?._id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeNote) setTitle(activeNote.title)
  }, [activeNote?._id])

  const handleTitleChange = useCallback((id: string, value: string) => {
    setTitle(value)
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    titleDebounceRef.current = setTimeout(() => {
      updateNote(id, { title: value })
    }, 600)
  }, [updateNote])

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Select a note or create a new one</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {editor && (
        <div className="px-10 pt-2 max-w-[1140px] w-full">
          <div className="flex items-center gap-1 px-3 py-1 border rounded-lg bg-card">
            <ToggleGroup type="multiple" size="sm">
              <ToggleGroupItem
                value="bold"
                pressed={editor.isActive("bold")}
                onPressedChange={() => editor.chain().focus().toggleBold().run()}
                className="h-8 w-8"
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="italic"
                pressed={editor.isActive("italic")}
                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                className="h-8 w-8"
              >
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                pressed={editor.isActive("underline")}
                onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                className="h-8 w-8"
              >
                <UnderlineIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToggleGroup type="multiple" size="sm">
              <ToggleGroupItem
                value="bulletList"
                pressed={editor.isActive("bulletList")}
                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="orderedList"
                pressed={editor.isActive("orderedList")}
                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                className="h-8 w-8"
              >
                <ListOrdered className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Select
              value={
                editor.isActive("heading", { level: 1 }) ? "h1" :
                editor.isActive("heading", { level: 2 }) ? "h2" :
                editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"
              }
              onValueChange={(val) => {
                const chain = editor.chain().focus().setParagraph()
                if (val === "h1") chain.unsetFontSize().toggleHeading({ level: 1 })
                else if (val === "h2") chain.unsetFontSize().toggleHeading({ level: 2 })
                else if (val === "h3") chain.unsetFontSize().toggleHeading({ level: 3 })
                chain.run()
              }}
            >
              <SelectTrigger className="h-7 w-[110px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADINGS.map((h) => (
                  <SelectItem key={h.value} value={h.value} className="text-sm">{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(() => {
                const explicit = editor.getAttributes("textStyle").fontSize?.replace("px", "")
                if (explicit) return explicit
                if (editor.isActive("heading", { level: 1 })) return "30"
                if (editor.isActive("heading", { level: 2 })) return "24"
                if (editor.isActive("heading", { level: 3 })) return "20"
                return "16"
              })()}
              onValueChange={(val) => editor.chain().focus().setFontSize(val + "px").run()}
            >
              <SelectTrigger className="h-7 w-[70px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        </div>
      )}

      <div className="px-10 pt-3 pb-0 max-w-[1140px] w-full">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(activeNote._id, e.target.value)}
          className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight border-0 shadow-none px-0 h-auto focus-visible:ring-0"
          placeholder="Untitled"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
        </p>
        <Separator className="mt-2" />
      </div>

      <div className="flex-1 overflow-auto px-10 max-w-[1140px] w-full py-4">
        <NoteEditor note={activeNote} editor={editor} />
      </div>
    </div>
  )
}
