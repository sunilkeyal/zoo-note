import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { convertHtmlToMarkdown, generateFrontMatter } from "@/lib/export"
import { generatePdf } from "@/lib/pdf"
import { ObjectId } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const format = request.nextUrl.searchParams.get("format") || "markdown"

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const note = await collection.findOne({
    _id: objectId,
    userId: session.user.id,
    isDeleted: { $ne: true },
  })

  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const safeTitle = note.title.replace(/"/g, "'").replace(/[/\\:*?<>|]/g, "_") || "untitled"

  if (format === "markdown") {
    const frontMatter = generateFrontMatter(note.title)
    const markdownBody = convertHtmlToMarkdown(note.content || "")
    const content = frontMatter + markdownBody

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
      },
    })
  }

  if (format === "pdf") {
    const pdfBuffer = await generatePdf(note.content || "<p></p>", request.nextUrl.origin)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    })
  }

  return NextResponse.json({ success: false, error: "Invalid format" }, { status: 400 })
}
