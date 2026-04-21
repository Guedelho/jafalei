import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"
import { retrieveContext } from "@/lib/ai/rag"
import { checkRateLimit } from "@/lib/server-utils"
import { CHAT_MODEL } from "@/shared/constants"
import type { Message, SseEvent } from "@/shared/models"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"

const SYSTEM_PROMPT_WITH_CONTEXT = `Você é um assistente que responde perguntas com base nos documentos fornecidos.
Responda em português. Se a resposta não estiver nos documentos, diga que não encontrou a informação.

Contexto:
{context}`

const SYSTEM_PROMPT_NO_CONTEXT = `Você é um assistente prestativo. Responda em português. Não há documentos carregados ainda.`

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
  const history = messages.slice(0, -1)

  let context = ""
  try {
    const docs = await retrieveContext(lastUserMessage)
    context = docs.map((d) => d.pageContent).join("\n\n")
  } catch (err) {
    console.error("[chat] retrieveContext error:", err)
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", context ? SYSTEM_PROMPT_WITH_CONTEXT : SYSTEM_PROMPT_NO_CONTEXT],
    ...history.map((m) => [m.role === "user" ? "human" : "ai", m.content] as [string, string]),
    ["human", "{input}"],
  ])

  const model = new ChatGoogleGenerativeAI({
    model: CHAT_MODEL,
    temperature: 0.3,
    streaming: true,
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })

  const chain = prompt.pipe(model).pipe(new StringOutputParser())

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let fullText = ""
      try {
        const chainStream = await chain.stream({ context, input: lastUserMessage })
        for await (const text of chainStream) {
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
