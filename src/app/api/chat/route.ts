import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { createRetriever } from "@/lib/ai/rag"
import { checkRateLimit } from "@/lib/server-utils"
import { CHAT_MODEL } from "@/shared/constants"
import type { Message, SseEvent } from "@/shared/models"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents"
import { createRetrievalChain } from "@langchain/classic/chains/retrieval"
import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever"

const rephrasePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Given the chat history and the latest user question, reformulate the question into a standalone question. Do NOT answer it, just reformulate if needed, otherwise return it as is.",
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
])

const answerPrompt = ChatPromptTemplate.fromMessages([
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
  const chatHistory = messages
    .slice(0, -1)
    .map((m) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)))

  const retriever = await createRetriever()
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: model,
    retriever,
    rephrasePrompt,
  })
  const combineDocsChain = await createStuffDocumentsChain({ llm: model, prompt: answerPrompt })
  const ragChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let fullText = ""
      try {
        const ragStream = await ragChain.stream({
          input: lastUserMessage,
          chat_history: chatHistory,
        })
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
