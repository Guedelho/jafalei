import { createAdmin } from "@/lib/supabase/admin"
import { getUserId } from "@/lib/supabase/auth"
import { redirect } from "next/navigation"
import ChatInterface from "@/components/chat/chat-interface"

export default async function ChatPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")

  const admin = createAdmin()
  const { data: session } = await admin
    .from("chat_sessions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  let sessionId = session?.id
  if (!sessionId) {
    const { data: newSession } = await admin
      .from("chat_sessions")
      .insert({ user_id: userId })
      .select("id")
      .single()
    sessionId = newSession?.id
  }

  return <ChatInterface sessionId={sessionId ?? ""} />
}
