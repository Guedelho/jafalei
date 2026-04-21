import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { createRetriever } from "@/lib/ai/rag"
import { checkRateLimit } from "@/lib/server-utils"
import { CHAT_MODEL } from "@/shared/constants"
import type { Message, SseEvent } from "@/shared/models"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents"
import { createRetrievalChain } from "@langchain/classic/chains/retrieval"

const prompt =
  ChatPromptTemplate.fromTemplate(`Você é um assistente que responde perguntas com base nos documentos fornecidos.
Responda em português. Se a resposta não estiver nos documentos, diga que não encontrou a informação.

Contexto:
{context}

Pergunta: {input}`)

const model = new ChatGoogleGenerativeAI({
  model: CHAT_MODEL,
  temperature: 0.3,
  streaming: true,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  if (!(await checkRateLimit(userId))) {
    return Response.json({ error: "Muitas requisições. Tente novamente." }, { status: 429 })
  }

  const { messages, sessionId } = (await req.json()) as {
    messages: Message[]
    sessionId: string
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

  const retriever = await createRetriever()
  const combineDocsChain = await createStuffDocumentsChain({ llm: model, prompt })
  const ragChain = await createRetrievalChain({ retriever, combineDocsChain })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let fullText = ""
      try {
        const ragStream = await ragChain.stream({ input: lastUserMessage })
        for await (const chunk of ragStream) {
          if (chunk.answer) {
            fullText += chunk.answer
            send({ type: "chunk", text: chunk.answer })
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
