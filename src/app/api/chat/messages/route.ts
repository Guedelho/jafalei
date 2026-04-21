import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 })

  const admin = createAdmin()

  const { data: session } = await admin
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single()

  if (!session) return Response.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await admin
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) return Response.json({ error: "Erro ao carregar mensagens." }, { status: 500 })
  return Response.json(data ?? [])
}
