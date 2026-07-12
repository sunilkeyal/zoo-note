import { describe, it, expect } from "vitest"
import type { ImportJobStatus, ImportJobManifest } from "@/lib/onenote/import-job"

describe("OneNote large import", () => {
  describe("ImportJobManifest type", () => {
    it("has correct structure", () => {
      const manifest: ImportJobManifest = {
        htmlFiles: ["prefix/converted/Section1/page1.html"],
        imageFiles: ["prefix/converted/Section1/image1.png"],
        sections: ["Section1"],
      }
      expect(manifest.htmlFiles).toHaveLength(1)
      expect(manifest.imageFiles).toHaveLength(1)
      expect(manifest.sections).toHaveLength(1)
    })

    it("supports empty arrays", () => {
      const manifest: ImportJobManifest = {
        htmlFiles: [],
        imageFiles: [],
        sections: [],
      }
      expect(manifest.htmlFiles).toHaveLength(0)
    })
  })

  describe("ImportJobStatus type", () => {
    it("includes all expected statuses", () => {
      const statuses: ImportJobStatus[] = [
        "pending",
        "uploading",
        "converting",
        "processing",
        "completed",
        "failed",
      ]
      expect(statuses).toHaveLength(6)
      expect(statuses).toContain("pending")
      expect(statuses).toContain("processing")
      expect(statuses).toContain("completed")
      expect(statuses).toContain("failed")
    })
  })
})
