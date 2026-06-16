"use client"

import React, { useCallback, useRef, useState, useEffect } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { FontSize } from "@/extensions/FontSize"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import FontFamily from "@tiptap/extension-font-family"
import { ParagraphSpacing } from "@/extensions/ParagraphSpacing"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Strikethrough,
  Palette,
  Highlighter,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react"
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
const FONTS = [
  "Arial",
  "Comic Sans MS",
  "Consolas",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Merriweather",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
]

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
  "#c62828", "#e53935", "#ef5350", "#e57373", "#ef9a9a", "#e65100", "#ef6c00", "#f57c00",
  "#ff9800", "#f9a825", "#fdd835", "#ffe082", "#fff9c4", "#2e7d32", "#43a047", "#66bb6a",
  "#81c784", "#a5d6a7", "#1565c0", "#1e88e5", "#42a5f5", "#64b5f6", "#90caf9",
  "#6a1b9a", "#8e24aa", "#ab47bc", "#ce93d8", "#e1bee7", "#00838f", "#00acc1", "#26c6da", "#80deea",
]

const HIGHLIGHT_COLORS = [
  "#fff9c4", "#fff3e0", "#fce4ec", "#f3e5f5", "#e8eaf6", "#e1f5fe", "#e0f2f1", "#e8f5e9",
  "#fff176", "#ffcc80", "#ef9a9a", "#ce93d8", "#9fa8da", "#81d4fa", "#80cbc4", "#a5d6a7",
  "#ffee58", "#ffab40", "#f48fb1", "#ea80fc",
]

const SPACING_PRESETS = [
  { label: "Tight", value: "4px" },
  { label: "Compact", value: "8px" },
  { label: "Normal", value: "10px" },
  { label: "Relaxed", value: "24px" },
  { label: "Loose", value: "32px" },
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
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      ParagraphSpacing,
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
              <ToggleGroupItem
                value="strike"
                pressed={editor.isActive("strike")}
                onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                className="h-8 w-8"
              >
                <Strikethrough className="h-4 w-4" />
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

            <Popover>
              <PopoverTrigger
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent relative"
                title="Text color"
              >
                <Palette className="h-4 w-4" />
                <span
                  className="absolute bottom-1 h-[3px] w-3 rounded-full"
                  style={{ backgroundColor: editor.getAttributes("textStyle").color || "currentColor" }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Text Color</div>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      className="h-7 w-7 rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().setColor(c).run()}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    placeholder="#hex"
                    className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()
                      }
                    }}
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
                title="Highlight color"
              >
                <Highlighter className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Highlight Color</div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c}
                      className="h-8 w-full rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    placeholder="#hex"
                    className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()
                      }
                    }}
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
                title="Paragraph spacing"
              >
                <ArrowUpDown className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-3" align="start">
                <div className="text-sm font-medium mb-3">Paragraph Spacing</div>
                <div className="flex flex-col gap-2">
                  {SPACING_PRESETS.map((p) => {
                    const currentSpacing = editor.getAttributes("paragraph").paragraphSpacing
                    const isActive = currentSpacing === p.value || (!currentSpacing && p.value === "10px")
                    return (
                      <button
                        key={p.value}
                        onClick={() => editor.chain().focus().setParagraphSpacing(p.value).run()}
                        className={`px-3 py-2 text-sm rounded-md font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {p.label} <span className="text-xs opacity-75">({p.value})</span>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>

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
              value={editor.getAttributes("textStyle").fontFamily || "default"}
              onValueChange={(val) => {
                if (val === "default") editor.chain().focus().unsetFontFamily().run()
                else editor.chain().focus().setFontFamily(val).run()
              }}
            >
              <SelectTrigger className="h-7 w-[130px] text-sm" style={{ fontFamily: editor.getAttributes("textStyle").fontFamily || "inherit" }}>
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="text-sm">Default</SelectItem>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f} className="text-sm" style={{ fontFamily: f }}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(() => {
                const explicit = editor.getAttributes("textStyle").fontSize?.replace("px", "")
                if (explicit) return explicit
                if (editor.isActive("heading", { level: 1 })) return "20"
                if (editor.isActive("heading", { level: 2 })) return "18"
                if (editor.isActive("heading", { level: 3 })) return "16"
                return "14"
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
          className="font-semibold leading-tight border-0 shadow-none px-0 h-auto focus-visible:ring-0"
          style={{ fontSize: "21px" }}
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
