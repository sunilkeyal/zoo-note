"use client"

import { useState, useEffect, useRef } from "react"
import { X, Download, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ImportExportSheetProps {
  open: boolean
  onClose: () => void
}

type ExportState = "idle" | "loading"
type ImportState = "idle" | "loading" | "success" | "error"

export default function ImportExportSheet({ open, onClose }: ImportExportSheetProps) {
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [importState, setImportState] = useState<ImportState>("idle")
  const [importMessage, setImportMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [onenoteImportState, setOnenoteImportState] = useState<ImportState>("idle")
  const [onenoteImportMessage, setOnenoteImportMessage] = useState("")
  const onenoteFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setExportState("idle")
      setImportState("idle")
      setImportMessage("")
      setOnenoteImportState("idle")
      setOnenoteImportMessage("")
    }
  }, [open])

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
      // silent failure — user can retry
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
    } catch {
      setImportState("error")
      setImportMessage("Network error. Please try again.")
    }
  }

  async function handleOneNoteFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase().split(".").pop()
    if (ext !== "onepkg" && ext !== "one") {
      setOnenoteImportState("error")
      setOnenoteImportMessage("Unsupported file format. Accepted: .onepkg, .one")
      return
    }

    setOnenoteImportState("loading")
    setOnenoteImportMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/notes/import/onenote", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setOnenoteImportState("error")
        setOnenoteImportMessage(data.error || "Import failed")
        return
      }
      const r = data.data
      setOnenoteImportState("success")
      setOnenoteImportMessage(
        `Imported ${r.foldersCreated} folder${r.foldersCreated !== 1 ? "s" : ""}, ` +
          `${r.notesImported} note${r.notesImported !== 1 ? "s" : ""}, ` +
          `${r.imagesImported} image${r.imagesImported !== 1 ? "s" : ""}.`
      )
    } catch {
      setOnenoteImportState("error")
      setOnenoteImportMessage("Network error. Please try again.")
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Import / Export"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Import / Export</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          {/* Export */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Export</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Download a ZIP with all your notes, folders, and images.
            </p>
            <button
              onClick={handleExport}
              disabled={exportState === "loading"}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {exportState === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Exporting…
                </>
              ) : (
                "Export All Notes"
              )}
            </button>
          </div>

          {/* Import */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select a previously exported ZIP file.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === "loading"}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {importState === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Importing…
                </>
              ) : (
                "Import Notes"
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            {importState === "success" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
            {importState === "error" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
          </div>

          {/* OneNote Import */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import from OneNote</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Import a OneNote notebook (.onepkg) or section (.one). Folders and notes will be created automatically.
            </p>
            <button
              onClick={() => onenoteFileInputRef.current?.click()}
              disabled={onenoteImportState === "loading"}
              className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {onenoteImportState === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Importing…
                </>
              ) : (
                "Select File"
              )}
            </button>
            <input
              ref={onenoteFileInputRef}
              type="file"
              accept=".onepkg,.one"
              className="hidden"
              onChange={handleOneNoteFileSelect}
            />
            <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Best compatibility with <strong>OneNote 2016+ on Windows</strong>. Older versions and Mac exports may not work.</span>
            </div>
            {onenoteImportState === "success" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{onenoteImportMessage}</span>
              </div>
            )}
            {onenoteImportState === "error" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{onenoteImportMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
