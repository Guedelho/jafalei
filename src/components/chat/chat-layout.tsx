"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ChatInterface from "@/components/chat/chat-interface"
import type { ChatSession, Message } from "@/shared/models"

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Hoje"
  if (days === 1) return "Ontem"
  if (days < 7) return `${days} dias atrás`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export default function ChatLayout({
  sessions: initialSessions,
  activeSessionId: initialSessionId,
  initialMessages,
}: {
  sessions: (ChatSession & { preview?: string | null })[]
  activeSessionId: string
  initialMessages: Message[]
}) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loadingSession, setLoadingSession] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function selectSession(id: string) {
    if (id === activeSessionId) return
    setLoadingSession(id)
    const res = await fetch(`/api/chat/messages?sessionId=${id}`)
    const data: Message[] = await res.json()
    setMessages(data)
    setActiveSessionId(id)
    setLoadingSession(null)
  }

  async function newSession() {
    setCreating(true)
    const res = await fetch("/api/chat/sessions", { method: "POST" })
    const session = await res.json()
    setSessions((prev) => [{ ...session, preview: null }, ...prev])
    setMessages([])
    setActiveSessionId(session.id)
    setCreating(false)
  }

  function onNewMessage(sessionId: string, userContent: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId && !s.preview ? { ...s, preview: userContent } : s)),
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="p-3">
          <button
            onClick={newSession}
            disabled={creating}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Criando..." : "+ Nova conversa"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 && (
            <p className="px-2 py-3 text-xs text-gray-400">Nenhuma conversa ainda.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s.id)}
              disabled={loadingSession === s.id}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors mb-0.5 ${
                s.id === activeSessionId
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <p className="truncate text-sm font-medium">
                {s.preview ? s.preview : "Nova conversa"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{formatDate(s.created_at)}</p>
            </button>
          ))}
        </nav>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface
          key={activeSessionId}
          sessionId={activeSessionId}
          initialMessages={messages}
          onFirstMessage={(content) => onNewMessage(activeSessionId, content)}
        />
      </div>
    </div>
  )
}
