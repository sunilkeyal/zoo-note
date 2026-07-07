import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

type SidebarDensity = "spacious" | "default" | "compact"
type Theme = "light" | "dark" | "system"

// Accept old values (dense) for migration and map to new values
const NEW_DENSITIES = new Set(["spacious", "default", "compact"])
const LEGACY_DENSITY_MAP: Record<string, SidebarDensity> = {
  dense: "compact",
}
const WRITE_DENSITIES = [...NEW_DENSITIES, "dense"] // accept old dense on write too
const VALID_THEMES = ["light", "dark", "system"]

const VALID_PREF_KEYS = new Set(["sidebarDensity", "theme"])

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const db = await connectToDatabase()
  let userId: ObjectId
  try {
    userId = new ObjectId(session.user.id)
  } catch {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 })
  }

  const user = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { preferences: 1 } })

  const preferences = user?.preferences ?? {}
  return NextResponse.json({
    sidebarDensity: (NEW_DENSITIES.has(preferences.sidebarDensity)
      ? preferences.sidebarDensity
      : (LEGACY_DENSITY_MAP[preferences.sidebarDensity] ?? "default")) as SidebarDensity,
    theme: (VALID_THEMES.includes(preferences.theme)
      ? preferences.theme
      : null) as Theme | null,
  })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: "Request body must contain at least one preference." },
      { status: 400 }
    )
  }

  for (const key of Object.keys(body)) {
    if (!VALID_PREF_KEYS.has(key)) {
      return NextResponse.json(
        { error: `Unknown preference key: ${key}.` },
        { status: 400 }
      )
    }
  }

  if ("sidebarDensity" in body) {
    if (!WRITE_DENSITIES.includes(body.sidebarDensity as string)) {
      return NextResponse.json(
        { error: "sidebarDensity must be one of: spacious, default, compact." },
        { status: 400 }
      )
    }
  }

  if ("theme" in body) {
    if (!VALID_THEMES.includes(body.theme as string)) {
      return NextResponse.json(
        { error: "theme must be one of: light, dark, system." },
        { status: 400 }
      )
    }
  }

  const db = await connectToDatabase()
  let userId: ObjectId
  try {
    userId = new ObjectId(session.user.id)
  } catch {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (body.sidebarDensity !== undefined) {
    update["preferences.sidebarDensity"] = body.sidebarDensity as string
  }
  if (body.theme !== undefined) {
    update["preferences.theme"] = body.theme as string
  }

  await db.collection("users").updateOne({ _id: userId }, { $set: update })

  return NextResponse.json({ success: true })
}
