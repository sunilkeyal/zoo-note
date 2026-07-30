import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"

const { mockFetchNotes, mockFetchFolders } = vi.hoisted(() => ({
  mockFetchNotes: vi.fn(),
  mockFetchFolders: vi.fn(),
}))

const { mockUseImport, mockStartImport, mockCancelImport } = vi.hoisted(() => ({
  mockUseImport: vi.fn(),
  mockStartImport: vi.fn(),
  mockCancelImport: vi.fn(),
}))

vi.mock("@/contexts/NoteContext", () => ({
  useNotes: () => ({ fetchNotes: mockFetchNotes, fetchFolders: mockFetchFolders }),
}))

vi.mock("@/contexts/ImportContext", () => ({
  useImport: mockUseImport,
}))

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerClose: ({ children }: { children: React.ReactNode }) => (
    <button aria-label="Close">{children}</button>
  ),
}))

import ImportExportSheet from "@/components/ImportExportSheet"

type Job = {
  jobId: string | null
  status: string
  filename: string | null
  progress: { totalPages: number; processedPages: number; currentStage?: string } | null
  result: { foldersCreated: number; notesImported: number; imagesImported: number } | null
  error: string | null
}

const idleJob: Job = { jobId: null, status: "idle", filename: null, progress: null, result: null, error: null }

function setJob(job: Partial<Job> = {}) {
  mockUseImport.mockReturnValue({
    job: { ...idleJob, ...job },
    startImport: mockStartImport,
    cancelImport: mockCancelImport,
  })
}

function zipInput(container: HTMLElement) {
  return container.querySelector('input[accept=".zip"]') as HTMLInputElement
}
function onenoteInput(container: HTMLElement) {
  return container.querySelector('input[accept=".onepkg,.one"]') as HTMLInputElement
}

beforeEach(() => {
  vi.clearAllMocks()
  setJob()
  global.fetch = vi.fn()
  URL.createObjectURL = vi.fn(() => "blob:url")
  URL.revokeObjectURL = vi.fn()
})

describe("ImportExportSheet — rendering", () => {
  it("renders nothing when closed", () => {
    render(<ImportExportSheet open={false} onClose={vi.fn()} />)
    expect(screen.queryByText("Export All Notes")).not.toBeInTheDocument()
  })

  it("renders export, import, and OneNote sections when open", () => {
    render(<ImportExportSheet open onClose={vi.fn()} />)
    expect(screen.getByText("Export All Notes")).toBeInTheDocument()
    expect(screen.getByText("Import Notes")).toBeInTheDocument()
    expect(screen.getByText("Import from OneNote")).toBeInTheDocument()
  })
})

describe("ImportExportSheet — export", () => {
  it("fetches the export endpoint and triggers a download", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(["zip"])) } as Response)
    render(<ImportExportSheet open onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Export All Notes"))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/notes/export"))
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

describe("ImportExportSheet — ZIP import", () => {
  it("rejects non-zip files without calling the API", () => {
    const { container } = render(<ImportExportSheet open onClose={vi.fn()} />)
    const file = new File(["x"], "notes.txt", { type: "text/plain" })

    fireEvent.change(zipInput(container), { target: { files: [file] } })

    expect(screen.getByText("Only .zip files accepted")).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows a summary and refreshes data on successful import", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { notesImported: 2, foldersCreated: 1, imagesImported: 3 } }),
    } as Response)
    const { container } = render(<ImportExportSheet open onClose={vi.fn()} />)
    const file = new File(["x"], "backup.zip", { type: "application/zip" })

    fireEvent.change(zipInput(container), { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByText("Imported 2 notes, 1 folder, 3 images.")).toBeInTheDocument()
    )
    expect(fetch).toHaveBeenCalledWith("/api/notes/import", expect.objectContaining({ method: "POST" }))
    expect(mockFetchNotes).toHaveBeenCalled()
    expect(mockFetchFolders).toHaveBeenCalled()
  })

  it("shows the server error message on a failed import", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, error: "Invalid export file" }),
    } as Response)
    const { container } = render(<ImportExportSheet open onClose={vi.fn()} />)
    const file = new File(["x"], "backup.zip", { type: "application/zip" })

    fireEvent.change(zipInput(container), { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText("Invalid export file")).toBeInTheDocument())
    expect(mockFetchNotes).not.toHaveBeenCalled()
  })

  it("shows a network error message when the request throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("boom"))
    const { container } = render(<ImportExportSheet open onClose={vi.fn()} />)
    const file = new File(["x"], "backup.zip", { type: "application/zip" })

    fireEvent.change(zipInput(container), { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument())
  })
})

describe("ImportExportSheet — OneNote import", () => {
  it("calls startImport with the selected file", () => {
    const { container } = render(<ImportExportSheet open onClose={vi.fn()} />)
    const file = new File(["x"], "notebook.one", { type: "application/octet-stream" })

    fireEvent.change(onenoteInput(container), { target: { files: [file] } })

    expect(mockStartImport).toHaveBeenCalledWith(file)
  })

  it("shows progress and a cancel button while processing", () => {
    setJob({ status: "processing", progress: { totalPages: 4, processedPages: 1, currentStage: "Converting" } })
    render(<ImportExportSheet open onClose={vi.fn()} />)

    expect(screen.getByText("1/4 pages")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Cancel Import"))
    expect(mockCancelImport).toHaveBeenCalled()
  })

  it("shows a completion summary when the job succeeds", () => {
    setJob({ status: "completed", result: { foldersCreated: 1, notesImported: 2, imagesImported: 0 } })
    render(<ImportExportSheet open onClose={vi.fn()} />)

    expect(screen.getByText(/Imported 1 folder, 2 notes, 0 images\./)).toBeInTheDocument()
  })

  it("shows the error message when the job fails", () => {
    setJob({ status: "failed", error: "Conversion failed" })
    render(<ImportExportSheet open onClose={vi.fn()} />)

    expect(screen.getByText("Conversion failed")).toBeInTheDocument()
  })
})
