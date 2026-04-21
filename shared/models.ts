export type Document = {
  id: string
  user_id: string
  name: string
  mime_type: string | null
  created_at: string
}

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

export type ChatSession = {
  id: string
  user_id: string
  created_at: string
}

export type SseEvent =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
