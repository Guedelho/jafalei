import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { retrieveContext } from "@/lib/ai/rag"
import { genAI } from "@/lib/ai/genai"
import { checkRateLimit, recordRateLimit } from "@/lib/server-utils"
import { CHAT_MODEL } from "@/shared/constants"
import type { Message, SseEvent } from "@/shared/models"
import type { Content } from "@google/generative-ai"

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message
    return (
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("ECONNRESET") ||
      msg.includes("fetch")
    )
  }
  return false
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  if (!checkRateLimit(userId)) {
    return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  }
  recordRateLimit(userId)

  const { messages, sessionId } = (await req.json()) as {
    messages: Message[]
    sessionId: string
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const context = await retrieveContext(lastUserMessage)

  const systemInstruction = context
    ? `Você é um assistente que responde perguntas com base nos documentos fornecidos.\nResponda em português. Se a resposta não estiver nos documentos, diga que não encontrou a informação.\n\nDocumentos:\n${context}`
    : `Você é um assistente prestativo. Responda em português. Não há documentos carregados ainda.`

  const history: Content[] = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }))

  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction,
    generationConfig: { temperature: 0.3 },
  })

  const chat = model.startChat({ history })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let fullText = ""
      let attempt = 0
      const maxRetries = 2

      while (attempt <= maxRetries) {
        try {
          const result = await chat.sendMessageStream(lastUserMessage)
          for await (const chunk of result.stream) {
            const text = chunk.text()
            fullText += text
            send({ type: "chunk", text })
          }
          break
        } catch (err) {
          if (!isRetryable(err) || attempt === maxRetries) {
            console.error("[chat] stream error:", err)
            send({ type: "error", message: "Erro ao gerar resposta. Tente novamente." })
            controller.close()
            return
          }
          attempt++
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }

      send({ type: "done" })
      controller.close()

      if (sessionId && fullText) {
        const admin = createAdmin()
        await admin.from("messages").insert([
          { session_id: sessionId, role: "user", content: lastUserMessage },
          { session_id: sessionId, role: "assistant", content: fullText },
        ])
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
