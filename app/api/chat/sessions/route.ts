import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const admin = createAdmin()
  const { data: sessions, error } = await admin
    .from("chat_sessions")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return Response.json({ error: "Erro ao listar sessões." }, { status: 500 })

  if (!sessions?.length) return Response.json([])

  const { data: firstMessages } = await admin
    .from("messages")
    .select("session_id, content")
    .in(
      "session_id",
      sessions.map((s) => s.id),
    )
    .eq("role", "user")
    .order("created_at", { ascending: true })

  const previewMap = (firstMessages ?? []).reduce<Record<string, string>>((acc, m) => {
    if (!acc[m.session_id]) acc[m.session_id] = m.content
    return acc
  }, {})

  const result = sessions.map((s) => ({ ...s, preview: previewMap[s.id] ?? null }))
  return Response.json(result)
}

export async function POST() {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const admin = createAdmin()
  const { data, error } = await admin
    .from("chat_sessions")
    .insert({ user_id: userId })
    .select("id, created_at")
    .single()

  if (error || !data) return Response.json({ error: "Erro ao criar sessão." }, { status: 500 })
  return Response.json(data, { status: 201 })
}
