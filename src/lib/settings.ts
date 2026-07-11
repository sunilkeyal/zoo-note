import { Db } from "mongodb"

export interface AppSetting {
  key: string
  value: string
  updatedAt: Date
}

const DEFAULTS: Record<string, string> = {
  app_name: "ZooNote",
  note_visibility: "private",
  max_upload_size_mb: "10",
  session_timeout_hours: "24",
  allow_signup: "true",
}

const ENV_OVERRIDES: Record<string, string | undefined> = {
  storage_provider: process.env.STORAGE_PROVIDER ?? "local",
  r2_bucket_name: process.env.R2_BUCKET_NAME ?? "",
  r2_account_id: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
}

const EDITABLE_KEYS = new Set(["app_name", "note_visibility", "max_upload_size_mb", "session_timeout_hours", "allow_signup"])

const VALIDATORS: Record<string, (v: string) => boolean> = {
  max_upload_size_mb: (v) => { const n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= 100 },
  session_timeout_hours: (v) => { const n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= 720 },
  allow_signup: (v) => v === "true" || v === "false",
  note_visibility: (v) => ["private", "public"].includes(v),
}

export async function getAllSettings(db: Db): Promise<Record<string, string>> {
  const docs = await db.collection<AppSetting>("app_settings").find({}).toArray()
  const stored = Object.fromEntries(docs.map((d) => [d.key, d.value]))
  return { ...DEFAULTS, ...ENV_OVERRIDES, ...stored }
}

export async function updateSettings(
  db: Db,
  updates: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  for (const [key, value] of Object.entries(updates)) {
    if (!EDITABLE_KEYS.has(key)) {
      return { success: false, error: `Setting "${key}" is not editable` }
    }
    const validator = VALIDATORS[key]
    if (validator && !validator(value)) {
      return { success: false, error: `Invalid value for "${key}"` }
    }
  }

  const col = db.collection<AppSetting>("app_settings")
  for (const [key, value] of Object.entries(updates)) {
    await col.updateOne(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    )
  }

  return { success: true }
}

export function isEditable(key: string): boolean {
  return EDITABLE_KEYS.has(key)
}
