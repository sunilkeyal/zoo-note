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

    if (!process.env.CF_API_TOKEN) {
      console.error("R2 API: CF_API_TOKEN env var is not set")
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
        data = await getR2ObjectList({ limit, cursor })
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
