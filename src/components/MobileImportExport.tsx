"use client"

import { useState, useRef } from "react"
import { useNotes } from "@/contexts/NoteContext"
import { useImport } from "@/contexts/ImportContext"

interface MobileImportExportProps {
  onBack: () => void
}

type ExportState = "idle" | "loading"
type ImportState = "idle" | "loading" | "success" | "error"

export default function MobileImportExport({ onBack }: MobileImportExportProps) {
  const { fetchNotes, fetchFolders } = useNotes()
  const { job, startImport, cancelImport } = useImport()
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [importState, setImportState] = useState<ImportState>("idle")
  const [importMessage, setImportMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onenoteFileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExportState("loading")
    try {
      const res = await fetch("/api/notes/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `zoonote-export-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setExportState("idle")
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".zip")) {
      setImportState("error")
      setImportMessage("Only .zip files accepted")
      return
    }

    setImportState("loading")
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/notes/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setImportState("error")
        setImportMessage(data.error || "Import failed")
        return
      }
      const r = data.data
      setImportState("success")
      setImportMessage(
        `Imported ${r.notesImported} note${r.notesImported !== 1 ? "s" : ""}, ` +
        `${r.foldersCreated} folder${r.foldersCreated !== 1 ? "s" : ""}, ` +
        `${r.imagesImported} image${r.imagesImported !== 1 ? "s" : ""}.`
      )
      fetchNotes()
      fetchFolders()
    } catch {
      setImportState("error")
      setImportMessage("Network error. Please try again.")
    }
  }

  async function handleOneNoteFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    startImport(file)
  }

  const isImporting = job.status !== "idle" && job.status !== "completed" && job.status !== "failed"

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Import / Export</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Export */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Export</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Download a ZIP with all your notes, folders, and images.
          </p>
          <button
            onClick={handleExport}
            disabled={exportState === "loading"}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exportState === "loading" ? "Exporting\u2026" : "Export All Notes"}
          </button>
        </div>

        {/* Import ZIP */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Import</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Select a previously exported ZIP file.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importState === "loading"}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {importState === "loading" ? "Importing\u2026" : "Import Notes"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileSelect}
          />
          {importState === "success" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-green-600">
              <span>{importMessage}</span>
            </div>
          )}
          {importState === "error" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
              <span>{importMessage}</span>
            </div>
          )}
        </div>

        {/* OneNote Import */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Import from OneNote</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Import a OneNote notebook (.onepkg) or section (.one). Max 200MB.
          </p>
          <button
            onClick={() => onenoteFileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isImporting ? "Importing\u2026" : "Select File"}
          </button>
          <input
            ref={onenoteFileInputRef}
            type="file"
            accept=".onepkg,.one"
            className="hidden"
            onChange={handleOneNoteFileSelect}
          />
          {job.status === "processing" && job.progress && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress.totalPages > 0 ? (job.progress.processedPages / job.progress.totalPages) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {job.progress.processedPages}/{job.progress.totalPages} pages
              </p>
            </div>
          )}
          {isImporting && (
            <div className="mt-3 flex items-start gap-2 text-xs text-blue-600">
              <span>{job.progress?.currentStage || "Processing..."}</span>
            </div>
          )}
          {isImporting && (
            <button
              onClick={cancelImport}
              className="mt-2 w-full rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancel Import
            </button>
          )}
          {job.status === "completed" && job.result && (
            <div className="mt-3 flex items-start gap-2 text-xs text-green-600">
              <span>
                Imported {job.result.foldersCreated} folder{job.result.foldersCreated !== 1 ? "s" : ""},{" "}
                {job.result.notesImported} note{job.result.notesImported !== 1 ? "s" : ""},{" "}
                {job.result.imagesImported} image{job.result.imagesImported !== 1 ? "s" : ""}.
              </span>
            </div>
          )}
          {job.status === "failed" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
              <span>{job.error || "Import failed"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
