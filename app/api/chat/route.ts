import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { retrieveDocs } from "@/lib/ai/rag"
import { chatModel } from "@/lib/ai/genai"
import { checkRateLimit } from "@/lib/server-utils"
import type { Message, SseEvent } from "@/shared/models"
import { Document } from "@langchain/core/documents"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents"

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Você é um assistente que responde perguntas com base nos documentos fornecidos.
Responda em português. Se a resposta não estiver nos documentos, diga que não encontrou a informação.

Contexto:
{context}`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
])

function sseStream(handler: (send: (event: SseEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await handler(send)
      } finally {
        controller.close()
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

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  if (!(await checkRateLimit(userId))) {
    return Response.json({ error: "Muitas requisições. Tente novamente." }, { status: 429 })
  }

  const { input, chat_history, sessionId } = (await req.json()) as {
    input: string
    chat_history: Message[]
    sessionId: string
  }

  const chatHistory = chat_history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
  )

  let docs: Document[] = []
  try {
    docs = await retrieveDocs(input)
  } catch (err) {
    console.error("[chat] retrieval error:", err)
  }

  const chain = await createStuffDocumentsChain({ llm: chatModel, prompt })

  return sseStream(async (send) => {
    let fullText = ""
    try {
      const chainStream = await chain.stream({ input, context: docs, chat_history: chatHistory })
      for await (const text of chainStream) {
        if (text) {
          fullText += text
          send({ type: "chunk", text })
        }
      }
    } catch (err) {
      console.error("[chat] stream error:", err)
      send({ type: "error", message: "Erro ao gerar resposta. Tente novamente." })
      return
    }

    send({ type: "done" })

    if (sessionId && fullText) {
      const admin = createAdmin()
      await admin.from("messages").insert([
        { session_id: sessionId, role: "user", content: input },
        { session_id: sessionId, role: "assistant", content: fullText },
      ])
    }
  })
}
