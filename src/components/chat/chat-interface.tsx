"use client"

import { useState, useRef, useEffect } from "react"
import MessageList from "@/components/chat/message-list"
import type { Message, SseEvent } from "@/shared/models"

export default function ChatInterface({
  sessionId,
  initialMessages = [],
  onFirstMessage,
}: {
  sessionId: string
  initialMessages?: Message[]
  onFirstMessage?: (content: string) => void
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text }
    const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", content: "" }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput("")
    setStreaming(true)
    setError(null)

    if (messages.length === 0) onFirstMessage?.(text)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error("Erro na resposta do servidor.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const event = JSON.parse(line.slice(6)) as SseEvent

          if (event.type === "chunk") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id ? { ...m, content: m.content + event.text } : m,
              ),
            )
          } else if (event.type === "error") {
            setError(event.message)
          }
        }
      }
    } catch (err) {
      setError("Erro ao conectar. Tente novamente.")
      console.error("[chat]", err)
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} streaming={streaming} />

      <div className="border-t border-gray-200 bg-white p-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {streaming ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  )
}
