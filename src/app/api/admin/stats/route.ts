import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/zoo-note"

const VALID_RANGES = [7, 30, 90] as const
type Range = (typeof VALID_RANGES)[number]

function parseRange(param: string | null): Range {
  const n = parseInt(param || "7", 10)
  return (VALID_RANGES as readonly number[]).includes(n) ? (n as Range) : 7
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const range = parseRange(new URL(request.url).searchParams.get("range"))
  const cutoff = daysAgo(range)
  const today = todayMidnight()
  const weekAgo = daysAgo(7)

  const db = await connectToDatabase()

  const [kpis, charts, users, activity, systemHealth] = await Promise.all([
    // ── KPIs ──────────────────────────────────────────────────────────────────
    (async () => {
      try {
        const [
          totalUsers,
          newThisWeek,
          totalNotes,
          totalFolders,
          trashNotes,
          trashFolders,
          activeTodayIds,
          storageAgg,
        ] = await Promise.all([
          db.collection("users").countDocuments({}),
          db.collection("users").countDocuments({ createdAt: { $gte: weekAgo } }),
          db.collection("notes").countDocuments({ isDeleted: { $ne: true } }),
          db.collection("folders").countDocuments({ isDeleted: { $ne: true } }),
          db.collection("notes").countDocuments({ isDeleted: true }),
          db.collection("folders").countDocuments({ isDeleted: true }),
          db.collection("notes").distinct("userId", { updatedAt: { $gte: today } }),
          db.command({ dbStats: 1, scale: 1 }),
        ])

        let storageBreakdown: { databases: { name: string; sizeOnDisk: number; isAppDb: boolean }[]; totalBytes: number } | null = null
        try {
          const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
          await client.connect()
          const appDbName = client.options?.dbName || db.databaseName
          const adminDb = client.db("admin")
          const listResult = await adminDb.command({ listDatabases: 1 } as any)
          const databases = (listResult.databases as any[])
            .filter((d: any) => !["admin", "local"].includes(d.name))
            .map((d: any) => ({ name: d.name as string, sizeOnDisk: d.sizeOnDisk as number, isAppDb: d.name === appDbName }))
          const totalBytes = databases.reduce((sum: number, d: any) => sum + d.sizeOnDisk, 0)
          storageBreakdown = { databases, totalBytes }
          await client.close()
        } catch {
          // fallback: use dbStats for current database
          storageBreakdown = {
            databases: [{ name: db.databaseName, sizeOnDisk: (storageAgg?.storageSize as number) ?? 0, isAppDb: true }],
            totalBytes: (storageAgg?.storageSize as number) ?? 0,
          }
        }

        return {
          totalUsers,
          newThisWeek,
          activeToday: activeTodayIds.length,
          totalNotes,
          totalFolders,
          storageUsedBytes: (storageAgg?.storageSize as number) ?? 0,
          storageBreakdown,
          trashItemCount: trashNotes + trashFolders,
        }
      } catch {
        return null
      }
    })(),

    // ── Charts ─────────────────────────────────────────────────────────────────
    (async () => {
      try {
        const dateGroupExpr = (field: string) => ({
          $dateToString: { format: "%Y-%m-%d", date: `$${field}` },
        })

        const [notesRaw, activeUsersRaw, storageBaseline, storageRaw] = await Promise.all([
          db.collection("notes").aggregate([
            { $match: { createdAt: { $gte: cutoff }, isDeleted: { $ne: true } } },
            { $group: { _id: dateGroupExpr("createdAt"), count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]).toArray(),

          db.collection("notes").aggregate([
            { $match: { updatedAt: { $gte: cutoff } } },
            { $group: { _id: { date: dateGroupExpr("updatedAt"), userId: "$userId" } } },
            { $group: { _id: "$_id.date", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]).toArray(),

          db.collection("images").aggregate([
            { $match: { uploadDate: { $lt: cutoff } } },
            { $group: { _id: null, total: { $sum: "$length" } } },
          ]).toArray(),

          db.collection("images").aggregate([
            { $match: { uploadDate: { $gte: cutoff } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$uploadDate" } }, bytes: { $sum: "$length" } } },
            { $sort: { _id: 1 } },
          ]).toArray(),
        ])

        let cumulative = (storageBaseline[0]?.total as number) ?? 0
        const storageTrend = storageRaw.map((r: any) => {
          cumulative += r.bytes as number
          return { date: r._id as string, bytes: cumulative }
        })

        return {
          notesPerDay: notesRaw.map((r: any) => ({ date: r._id as string, count: r.count as number })),
          activeUsersPerDay: activeUsersRaw.map((r: any) => ({ date: r._id as string, count: r.count as number })),
          storageTrend,
        }
      } catch {
        return null
      }
    })(),

    // ── Top users ──────────────────────────────────────────────────────────────
    (async () => {
      try {
        const rows = await db.collection("users").aggregate([
          {
            $lookup: {
              from: "notes",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $ne: ["$isDeleted", true] }] } } },
                { $count: "n" },
              ],
              as: "notesAgg",
            },
          },
          {
            $lookup: {
              from: "folders",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $ne: ["$isDeleted", true] }] } } },
                { $count: "n" },
              ],
              as: "foldersAgg",
            },
          },
          {
            $lookup: {
              from: "images",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$metadata.userId", "$$uid"] } } },
                { $group: { _id: null, total: { $sum: "$length" } } },
              ],
              as: "storageAgg",
            },
          },
          {
            $project: {
              displayName: 1,
              email: 1,
              isActive: 1,
              noteCount: { $ifNull: [{ $arrayElemAt: ["$notesAgg.n", 0] }, 0] },
              folderCount: { $ifNull: [{ $arrayElemAt: ["$foldersAgg.n", 0] }, 0] },
              storageBytes: { $ifNull: [{ $arrayElemAt: ["$storageAgg.total", 0] }, 0] },
            },
          },
          { $sort: { noteCount: -1 } },
          { $limit: 10 },
        ]).toArray()

        return rows.map((r: any) => ({
          id: r._id.toString(),
          displayName: r.displayName ?? r.email,
          email: r.email,
          noteCount: r.noteCount,
          folderCount: r.folderCount,
          storageBytes: r.storageBytes,
          isActive: r.isActive !== false,
        }))
      } catch {
        return null
      }
    })(),

    // ── Activity feed ──────────────────────────────────────────────────────────
    (async () => {
      try {
        const [recentNotes, recentFolders] = await Promise.all([
          db.collection("notes").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                let: { uid: "$userId" },
                pipeline: [
                  { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$uid"] } } },
                  { $project: { displayName: 1 } },
                ],
                as: "user",
              },
            },
            {
              $project: {
                userId: 1,
                userName: { $ifNull: [{ $arrayElemAt: ["$user.displayName", 0] }, "Unknown"] },
                action: { $literal: "created note" },
                target: "$title",
                createdAt: 1,
              },
            },
          ]).toArray(),

          db.collection("folders").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                let: { uid: "$userId" },
                pipeline: [
                  { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$uid"] } } },
                  { $project: { displayName: 1 } },
                ],
                as: "user",
              },
            },
            {
              $project: {
                userId: 1,
                userName: { $ifNull: [{ $arrayElemAt: ["$user.displayName", 0] }, "Unknown"] },
                action: { $literal: "created folder" },
                target: "$name",
                createdAt: 1,
              },
            },
          ]).toArray(),
        ])

        const combined = [...recentNotes, ...recentFolders]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)

        return combined.map((r: any) => ({
          userId: r.userId ?? "",
          userName: r.userName,
          action: r.action,
          target: r.target,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        }))
      } catch {
        return null
      }
    })(),

    // ── System health ─────────────────────────────────────────────────────────
    (async () => {
      try {
        const mongoStart = Date.now()
        await db.command({ ping: 1 })
        const responseTimeMs = Date.now() - mongoStart

        const uptimeSeconds = process.uptime()
        const memoryUsage = process.memoryUsage()

        return {
          status: "healthy",
          uptimeSeconds,
          responseTimeMs,
          memoryUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          memoryTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        }
      } catch {
        return {
          status: "unhealthy",
          uptimeSeconds: process.uptime(),
          responseTimeMs: -1,
          memoryUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          memoryTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        }
      }
    })(),
  ])

  return NextResponse.json({ success: true, data: { kpis, charts, users, activity, systemHealth } })
}
