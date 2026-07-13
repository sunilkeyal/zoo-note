"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { useNotes } from "@/contexts/NoteContext"

export type ImportJobStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "processing"
  | "completed"
  | "failed"

interface ImportJobState {
  jobId: string | null
  status: ImportJobStatus
  filename: string | null
  progress: {
    totalPages: number
    processedPages: number
    currentStage: string
  } | null
  result: {
    foldersCreated: number
    notesImported: number
    imagesImported: number
  } | null
  error: string | null
}

interface ImportContextValue {
  job: ImportJobState
  startImport: (file: File) => Promise<void>
  cancelImport: () => Promise<void>
  resetJob: () => void
}

const STORAGE_KEY = "zoo-note-import-job"
const STORAGE_FILENAME_KEY = "zoo-note-import-filename"

const ImportContext = createContext<ImportContextValue | null>(null)

export function ImportProvider({ children }: { children: ReactNode }) {
  const { fetchNotes, fetchFolders } = useNotes()
  const [job, setJob] = useState<ImportJobState>(() => {
    if (typeof window === "undefined") return { jobId: null, status: "idle", filename: null, progress: null, result: null, error: null }
    const savedJobId = localStorage.getItem(STORAGE_KEY)
    const savedFilename = localStorage.getItem(STORAGE_FILENAME_KEY)
    if (savedJobId) {
      return {
        jobId: savedJobId,
        status: "processing",
        filename: savedFilename,
        progress: { totalPages: 0, processedPages: 0, currentStage: "Resuming..." },
        result: null,
        error: null,
      }
    }
    return { jobId: null, status: "idle", filename: null, progress: null, result: null, error: null }
  })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initializedRef = useRef(false)
  const jobIdRef = useRef<string | null>(null)

  useEffect(() => {
    jobIdRef.current = job.jobId
  }, [job.jobId])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const pollStatus = useCallback((jobId: string) => {
    stopPolling()

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/notes/import/onenote/status?jobId=${jobId}`)
        if (!res.ok) return

        const data = await res.json()

        if (data.status === "processing") {
          setJob((prev) => ({
            ...prev,
            status: "processing",
            progress: data.progress,
          }))
          return
        }

        if (data.status === "completed") {
          stopPolling()
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_FILENAME_KEY)
          setJob({
            jobId: null,
            status: "completed",
            filename: null,
            progress: data.progress,
            result: data.result,
            error: null,
          })
          toast.success("Import complete!", {
            description: `${data.result.foldersCreated} folders, ${data.result.notesImported} notes, ${data.result.imagesImported} images imported.`,
          })
          fetchNotes()
          fetchFolders()
          return
        }

        if (data.status === "failed") {
          stopPolling()
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_FILENAME_KEY)
          setJob({
            jobId: null,
            status: "failed",
            filename: null,
            progress: null,
            result: null,
            error: data.error,
          })
          toast.error("Import failed", {
            description: data.error || "An unexpected error occurred.",
          })
          return
        }

        // pending, uploading, converting — keep polling, update stage text
        if (data.progress?.currentStage) {
          setJob((prev) => ({
            ...prev,
            progress: data.progress,
          }))
        }
      } catch {
        // Network error during poll — keep trying
      }
    }, 3000)
  }, [stopPolling, fetchNotes, fetchFolders])

  // Resume polling from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const savedJobId = localStorage.getItem(STORAGE_KEY)
    if (savedJobId) {
      // Fetch current status once, then start polling
      fetch(`/api/notes/import/onenote/status?jobId=${savedJobId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_FILENAME_KEY)
            setJob({ jobId: null, status: "idle", filename: null, progress: null, result: null, error: null })
            return
          }
          if (data.status === "completed") {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_FILENAME_KEY)
            setJob({ jobId: null, status: "idle", filename: null, progress: data.progress, result: data.result, error: null })
            toast.success("Import complete!", {
              description: `${data.result.foldersCreated} folders, ${data.result.notesImported} notes, ${data.result.imagesImported} images imported.`,
            })
            fetchNotes()
            fetchFolders()
            return
          }
          if (data.status === "failed") {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_FILENAME_KEY)
            setJob({ jobId: null, status: "idle", filename: null, progress: null, result: null, error: data.error })
            toast.error("Import failed", { description: data.error || "An unexpected error occurred." })
            return
          }
          // Still running — resume polling
          setJob({
            jobId: savedJobId,
            status: data.status as ImportJobStatus,
            filename: localStorage.getItem(STORAGE_FILENAME_KEY),
            progress: data.progress ?? null,
            result: null,
            error: null,
          })
          pollStatus(savedJobId)
        })
        .catch(() => {
          // Network error on load — clear stale state
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_FILENAME_KEY)
          setJob({ jobId: null, status: "idle", filename: null, progress: null, result: null, error: null })
        })
    }
  }, [pollStatus, fetchNotes, fetchFolders])

  const startImport = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop()
    if (ext !== "onepkg" && ext !== "one") {
      toast.error("Unsupported format", { description: "Accepted: .onepkg, .one" })
      return
    }

    const MAX_IMPORT_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_IMPORT_SIZE) {
      toast.error("File too large", { description: "Maximum import size is 50MB." })
      return
    }

    // Step 1: Get presigned URL
    setJob({
      jobId: null,
      status: "uploading",
      filename: file.name,
      progress: null,
      result: null,
      error: null,
    })

    const loadingToast = toast.loading("Requesting upload URL...")

    try {
      const presignRes = await fetch("/api/notes/import/onenote/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, fileSize: file.size }),
      })
      const presignData = await presignRes.json()

      if (!presignRes.ok || !presignData.success) {
        toast.dismiss(loadingToast)
        toast.error("Failed to start import", { description: presignData.error })
        setJob((prev) => ({ ...prev, status: "failed", error: presignData.error }))
        return
      }

      const { jobId, uploadUrl } = presignData

      // Step 2: Upload file directly to R2
      toast.dismiss(loadingToast)
      const uploadToast = toast.loading("Uploading to storage...")

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadUrl, true)
        xhr.setRequestHeader("Content-Type", "application/octet-stream")

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            toast.loading(`Uploading... ${pct}%`, { id: uploadToast })
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        })
        xhr.addEventListener("error", () => reject(new Error("Upload failed")))
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
        xhr.send(file)
      })

      // Step 3: Confirm upload and start conversion
      toast.dismiss(uploadToast)
      toast.loading("Converting notebook...", { id: "import-stage" })

      // Persist job ID so polling survives page reload
      localStorage.setItem(STORAGE_KEY, jobId)
      localStorage.setItem(STORAGE_FILENAME_KEY, file.name)

      setJob((prev) => ({
        ...prev,
        jobId,
        status: "converting",
      }))

      const confirmRes = await fetch("/api/notes/import/onenote/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
      const confirmData = await confirmRes.json()

      if (!confirmRes.ok || !confirmData.success) {
        toast.dismiss("import-stage")
        toast.error("Conversion failed", { description: confirmData.error })
        setJob((prev) => ({ ...prev, status: "failed", error: confirmData.error }))
        return
      }

      // Step 4: Poll for completion
      setJob((prev) => ({
        ...prev,
        status: "processing",
        progress: confirmData.totalPages
          ? { totalPages: confirmData.totalPages, processedPages: 0, currentStage: "Starting import..." }
          : null,
      }))
      toast.dismiss("import-stage")
      pollStatus(jobId)
    } catch {
      toast.dismiss(loadingToast)
      toast.error("Network error", { description: "Please check your connection and try again." })
      setJob((prev) => ({ ...prev, status: "failed", error: "Network error" }))
    }
  }, [pollStatus])

  const resetJob = useCallback(() => {
    stopPolling()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_FILENAME_KEY)
    setJob({
      jobId: null,
      status: "idle",
      filename: null,
      progress: null,
      result: null,
      error: null,
    })
  }, [stopPolling])

  const cancelImport = useCallback(async () => {
    const currentJobId = jobIdRef.current
    if (!currentJobId) return

    stopPolling()

    try {
      const res = await fetch("/api/notes/import/onenote/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Import cancelled")
      } else {
        toast.error("Failed to cancel import", { description: data.error })
      }
    } catch {
      toast.error("Failed to cancel import", { description: "Network error" })
    } finally {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_FILENAME_KEY)
      setJob({
        jobId: null,
        status: "idle",
        filename: null,
        progress: null,
        result: null,
        error: null,
      })
    }
  }, [stopPolling])

  return (
    <ImportContext.Provider value={{ job, startImport, cancelImport, resetJob }}>
      {children}
    </ImportContext.Provider>
  )
}

export function useImport() {
  const ctx = useContext(ImportContext)
  if (!ctx) throw new Error("useImport must be used within ImportProvider")
  return ctx
}
