import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { embedText } from "@/lib/ai/embed"
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@/shared/constants"

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end).trim())
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter((c) => c.length > 0)
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const admin = createAdmin()
  const { data, error } = await admin
    .from("documents")
    .select("id, name, mime_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[documents] list error:", error)
    return Response.json({ error: "Erro ao listar documentos." }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Arquivo inválido." }, { status: 400 })
  }

  const allowed = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowed.includes(file.type)) {
    return Response.json({ error: "Formato não suportado. Use PDF, TXT ou DOCX." }, { status: 400 })
  }

  let text = ""
  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    if (file.type === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse") as (
        b: Buffer,
        opts: {
          pagerender: (page: {
            getTextContent: () => Promise<{ items: { str: string }[] }>
          }) => Promise<string>
        },
      ) => Promise<{ text: string }>
      const parsed = await pdfParse(buffer, {
        pagerender: async (page) => {
          const content = await page.getTextContent()
          return content.items.map((item) => item.str).join(" ")
        },
      })
      text = parsed.text
    } else if (file.type === "text/plain") {
      text = buffer.toString("utf-8")
    } else {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }
  } catch (err) {
    console.error("[documents] parse error:", err)
    return Response.json({ error: "Erro ao processar o arquivo." }, { status: 422 })
  }

  if (!text.trim()) {
    return Response.json({ error: "Nenhum texto encontrado no arquivo." }, { status: 422 })
  }

  const admin = createAdmin()
  const { data: doc, error: docError } = await admin
    .from("documents")
    .insert({ user_id: userId, name: file.name, mime_type: file.type })
    .select()
    .single()

  if (docError || !doc) {
    console.error("[documents] insert error:", docError)
    return Response.json({ error: "Erro ao salvar documento." }, { status: 500 })
  }

  const chunks = chunkText(text)
  try {
    const rows = await Promise.all(
      chunks.map(async (content, chunk_index) => ({
        document_id: doc.id,
        content,
        embedding: await embedText(content),
        chunk_index,
      })),
    )
    await admin.from("document_chunks").insert(rows)
  } catch (err) {
    console.error("[documents] embed error:", err)
    await admin.from("documents").delete().eq("id", doc.id)
    return Response.json({ error: "Erro ao processar embeddings." }, { status: 500 })
  }

  return Response.json(doc, { status: 201 })
}
