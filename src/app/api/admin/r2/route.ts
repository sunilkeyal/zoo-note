import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getR2StorageMetrics, getR2RequestMetrics, getR2ObjectList, estimateR2Cost } from "@/lib/cf-r2"

const VALID_RANGES = [7, 30, 90] as const
type Range = (typeof VALID_RANGES)[number]

function parseRange(param: string | null): Range {
  const n = parseInt(param || "7", 10)
  return (VALID_RANGES as readonly number[]).includes(n) ? (n as Range) : 7
}

const VALID_METRICS = ["storage", "requests", "cost", "objects"] as const
type Metric = (typeof VALID_METRICS)[number]

function parseMetric(param: string | null): Metric {
  return (VALID_METRICS as readonly string[]).includes(param || "") ? (param as Metric) : "storage"
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const metric = parseMetric(params.get("metric"))
  const range = parseRange(params.get("range"))

  try {
    const db = await connectToDatabase()
    let data: unknown

    const storageProvider = process.env.STORAGE_PROVIDER ?? "local"

    // If using local storage, R2 metrics are simply not applicable.
    if (storageProvider === "local") {
      return NextResponse.json({ success: false, notConfigured: true, storageProvider: "local" }, { status: 200 })
    }

    // STORAGE_PROVIDER=r2 — verify all required credentials are present.
    const missingVars = [
      !process.env.CF_API_TOKEN && "CF_API_TOKEN",
      !process.env.R2_ACCESS_KEY_ID && "R2_ACCESS_KEY_ID",
      !process.env.R2_BUCKET_NAME && "R2_BUCKET_NAME",
    ].filter(Boolean) as string[]

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        notConfigured: true,
        storageProvider: "r2",
        missingVars,
      }, { status: 200 })
    }

    switch (metric) {
      case "storage":
        data = await getR2StorageMetrics(db)
        break
      case "requests":
        data = await getR2RequestMetrics(range, db)
        break
      case "cost": {
        const [storage, requests] = await Promise.all([
          getR2StorageMetrics(db),
          getR2RequestMetrics(range, db),
        ])
        const cost = estimateR2Cost({
          totalBytes: storage.totalBytes,
          requestsGet: requests.requests.get,
          requestsPut: requests.requests.put,
          egressBytes: 0, // Default value for egress bytes
        })
        data = { storage, requests, cost }
        break
      }
      case "objects": {
        const limit = parseInt(params.get("limit") || "20", 10)
        const cursor = params.get("cursor") || undefined
        try {
          data = await getR2ObjectList({ limit, cursor })
        } catch {
          // S3 API may be blocked on restricted networks (e.g. corporate proxy).
          // Return an empty list rather than a 500.
          data = { objects: [], cursor: null, unavailable: true }
        }
        break
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("R2 metrics error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: `Failed to fetch R2 metrics: ${message}` },
      { status: 500 }
    )
  }
}
