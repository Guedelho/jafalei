import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { retrieveContext } from "@/lib/ai/rag"
import { checkRateLimit, recordRateLimit } from "@/lib/server-utils"
import { CHAT_MODEL } from "@/shared/constants"
import type { Message, SseEvent } from "@/shared/models"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  if (!checkRateLimit(userId)) {
    return Response.json({ error: "Muitas requisições. Tente novamente." }, { status: 429 })
  }
  recordRateLimit(userId)

  const { messages, sessionId } = (await req.json()) as {
    messages: Message[]
    sessionId: string
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const context = await retrieveContext(lastUserMessage)

  const systemPrompt = context
    ? `Você é um assistente que responde perguntas com base nos documentos fornecidos.\nResponda em português. Se a resposta não estiver nos documentos, diga que não encontrou a informação.\n\nDocumentos:\n${context}`
    : `Você é um assistente prestativo. Responda em português. Não há documentos carregados ainda.`

  const langchainMessages = [
    new SystemMessage(systemPrompt),
    ...messages.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
    ),
  ]

  const model = new ChatGoogleGenerativeAI({
    model: CHAT_MODEL,
    temperature: 0.3,
    streaming: true,
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let fullText = ""
      try {
        const langchainStream = await model.stream(langchainMessages)
        for await (const chunk of langchainStream) {
          const text = typeof chunk.content === "string" ? chunk.content : ""
          if (text) {
            fullText += text
            send({ type: "chunk", text })
          }
        }
      } catch (err) {
        console.error("[chat] stream error:", err)
        send({ type: "error", message: "Erro ao gerar resposta. Tente novamente." })
        controller.close()
        return
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
