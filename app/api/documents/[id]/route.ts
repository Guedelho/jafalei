import { getUserId } from "@/lib/supabase/auth"
import { createAdmin } from "@/lib/supabase/admin"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { id } = await params
  const admin = createAdmin()

  const { data: doc } = await admin
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (!doc) return Response.json({ error: "Documento não encontrado." }, { status: 404 })

  const { error } = await admin.from("documents").delete().eq("id", id)
  if (error) {
    console.error("[documents] delete error:", error)
    return Response.json({ error: "Erro ao remover documento." }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
