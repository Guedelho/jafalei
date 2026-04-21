import { getUserId } from "@/lib/supabase/auth"
import { checkRateLimit } from "@/lib/server-utils"
import { streamChat } from "@/lib/ai/chat"
import type { Message } from "@/shared/models"

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

  const stream = await streamChat({ input, chat_history, sessionId })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
