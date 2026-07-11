import { Db, ObjectId } from "mongodb"

export interface AuditLogEntry {
  _id?: ObjectId
  userId: string
  userName: string
  action: string
  target: string
  details?: Record<string, unknown>
  ip: string
  userAgent: string
  timestamp: Date
}

export async function logAuditEvent(
  db: Db,
  entry: Omit<AuditLogEntry, "timestamp">
): Promise<void> {
  await db.collection<AuditLogEntry>("audit_logs").insertOne({
    ...entry,
    timestamp: new Date(),
  })
}

export async function getAuditLogs(
  db: Db,
  options: {
    userId?: string
    action?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  } = {}
): Promise<{ logs: AuditLogEntry[]; total: number; page: number; limit: number }> {
  const { userId, action, from, to, page = 1, limit = 20 } = options

  const filter: Record<string, unknown> = {}
  if (userId) filter.userId = userId
  if (action) filter.action = action
  if (from || to) {
    filter.timestamp = {}
    if (from) (filter.timestamp as Record<string, Date>).$gte = from
    if (to) (filter.timestamp as Record<string, Date>).$lte = to
  }

  const col = db.collection<AuditLogEntry>("audit_logs")
  const total = await col.countDocuments(filter)
  const logs = await col
    .find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  return { logs, total, page, limit }
}
