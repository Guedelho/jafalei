import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { embedTexts } from "@/lib/ai/embed"
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@/shared/constants"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
})

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
      const { extractText, getDocumentProxy } = await import("unpdf")
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text: pdfText } = await extractText(pdf, { mergePages: true })
      text = pdfText
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

  try {
    const chunks = await splitter.splitText(text)
    const embeddings = await embedTexts(chunks)
    const rows = chunks.map((content: string, chunk_index: number) => ({
      document_id: doc.id,
      content,
      embedding: embeddings[chunk_index],
      chunk_index,
    }))
    await admin.from("document_chunks").insert(rows)
  } catch (err) {
    console.error("[documents] embed error:", err)
    await admin.from("documents").delete().eq("id", doc.id)
    return Response.json({ error: "Erro ao processar embeddings." }, { status: 500 })
  }

  return Response.json(doc, { status: 201 })
}
