"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, FileText, FileArchive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface ImportFile {
  id: string
  name: string
  size: number
  status: "ready" | "importing" | "done" | "error"
  error?: string
}

export default function ImportExportPage() {
  const [exporting, setExporting] = useState(false)
  const [importFiles, setImportFiles] = useState<ImportFile[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idCounter = useRef(0)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: ImportFile[] = Array.from(fileList).map((f) => ({
      id: String(++idCounter.current),
      name: f.name,
      size: f.size,
      status: "ready" as const,
    }))
    setImportFiles((prev) => [...prev, ...newFiles])
    setImportResult(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
  }, [addFiles])

  const removeFile = useCallback((id: string) => {
    setImportFiles((prev) => prev.filter((f) => f.id !== id))
    setImportResult(null)
  }, [])

  const clearFiles = useCallback(() => {
    setImportFiles([])
    setImportResult(null)
  }, [])

  const handleImport = async () => {
    if (importFiles.length === 0) return
    setImporting(true)
    setImportResult(null)

    // Re-fetch files from the input for the FormData
    const fileInput = fileInputRef.current
    if (!fileInput || !fileInput.files) {
      setImporting(false)
      return
    }

    const formData = new FormData()
    const nameToFile = new Map<string, File>()
    for (const f of Array.from(fileInput.files)) {
      nameToFile.set(f.name, f)
    }

    for (const f of importFiles) {
      const fileObj = nameToFile.get(f.name)
      if (fileObj) formData.append("files", fileObj)
    }

    setImportFiles((prev) => prev.map((f) => ({ ...f, status: "importing" as const })))

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const json = await res.json()
      if (json.success) {
        setImportResult(json.data)
        setImportFiles((prev) => prev.map((f) => ({ ...f, status: "done" as const })))
      } else {
        setImportResult({ imported: 0, skipped: 0, errors: [json.error || "Import failed"] })
        setImportFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })))
      }
    } catch (err) {
      console.error("Import failed:", err)
      setImportResult({ imported: 0, skipped: 0, errors: ["Network error"] })
      setImportFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })))
    } finally {
      setImporting(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Import / Export</h1>
      <p className="text-muted-foreground mb-6">
        Bulk export all notes to Markdown; import notes from Markdown or ZIP files.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Export</CardTitle>
            <CardDescription>
              Download all your notes as Markdown files. Folder structure is preserved and each file includes title &amp; folder metadata for re-import.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? "Exporting..." : "Export All Notes (.zip)"}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Import</CardTitle>
            <CardDescription>
              Upload Markdown (.md) files or a ZIP archive containing .md files. Front matter (title, folder) is used to recreate your note structure.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Drop .md or .zip files here</p>
              <p className="text-xs text-muted-foreground/50 mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {importFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {importFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.name.endsWith(".zip") ? (
                        <FileArchive className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                      )}
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({formatSize(f.size)})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.status === "ready" && <span className="text-xs text-green-600 font-medium">Ready</span>}
                      {f.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {f.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {f.status === "ready" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                          className="text-muted-foreground/50 hover:text-muted-foreground text-xs"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {importResult && (
              <div className="mt-3 text-sm">
                <p className="text-green-600">
                  Imported <strong>{importResult.imported}</strong> note{importResult.imported !== 1 ? "s" : ""}
                  {importResult.skipped > 0 && <> (<strong>{importResult.skipped}</strong> skipped)</>}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-red-500 text-xs">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importFiles.length > 0 && (
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {importing ? "Importing..." : `Import (${importFiles.length})`}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFiles}
                  disabled={importing}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
