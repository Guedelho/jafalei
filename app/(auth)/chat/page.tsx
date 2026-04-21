import { createAdmin } from "@/lib/supabase/admin"
import { getUserId } from "@/lib/supabase/auth"
import ChatLayout from "@/components/chat/chat-layout"
import type { ChatSession, Message } from "@/shared/models"

export default async function ChatPage() {
  const userId = await getUserId()

  const admin = createAdmin()

  // Fetch all sessions
  const { data: rawSessions } = await admin
    .from("chat_sessions")
    .select("id, created_at")
    .eq("user_id", userId!)
    .order("created_at", { ascending: false })

  let sessions = rawSessions ?? []

  // Create first session if none exist
  if (sessions.length === 0) {
    const { data: newSession } = await admin
      .from("chat_sessions")
      .insert({ user_id: userId })
      .select("id, created_at")
      .single()
    if (newSession) sessions = [newSession]
  }

  const activeSession = sessions[0]

  // Fetch previews (first user message per session)
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

  const sessionsWithPreview: (ChatSession & { preview?: string | null })[] = sessions.map((s) => ({
    ...s,
    user_id: userId!,
    preview: previewMap[s.id] ?? null,
  }))

  // Fetch messages for active session
  const { data: rawMessages } = await admin
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", activeSession.id)
    .order("created_at", { ascending: true })

  const initialMessages: Message[] = (rawMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    created_at: m.created_at,
  }))

  return (
    <ChatLayout
      sessions={sessionsWithPreview}
      activeSessionId={activeSession.id}
      initialMessages={initialMessages}
    />
  )
}
