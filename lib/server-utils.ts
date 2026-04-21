import "server-only"
import { createAdmin } from "@/lib/supabase/admin"
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "@/shared/constants"

export async function checkRateLimit(userId: string): Promise<boolean> {
  const admin = createAdmin()
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

  const { data: sessions } = await admin.from("chat_sessions").select("id").eq("user_id", userId)

  if (!sessions?.length) return true

  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", windowStart)
    .in(
      "session_id",
      sessions.map((s) => s.id),
    )

  return (count ?? 0) < RATE_LIMIT_MAX
}
