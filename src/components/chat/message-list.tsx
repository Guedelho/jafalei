"use client"

import { useEffect, useRef } from "react"
import type { Message } from "@/shared/models"

export default function MessageList({
  messages,
  streaming,
}: {
  messages: Message[]
  streaming: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Faça uma pergunta sobre os documentos carregados.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-900"
            }`}
          >
            {msg.content || (streaming ? <span className="text-gray-400">▋</span> : null)}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
