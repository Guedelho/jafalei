import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { id } = await params
  const admin = createAdmin()

  const { data: session } = await admin
    .from("chat_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (!session) return Response.json({ error: "Sessão não encontrada." }, { status: 404 })

  const { error } = await admin.from("chat_sessions").delete().eq("id", id)
  if (error) {
    console.error("[sessions] delete error:", error)
    return Response.json({ error: "Erro ao remover conversa." }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
