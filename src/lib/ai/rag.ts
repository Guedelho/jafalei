import "server-only"
import { createAdmin } from "@/lib/supabase/admin"
import { embedText } from "@/lib/ai/embed"
import { RAG_MATCH_COUNT } from "@/shared/constants"

export async function retrieveContext(query: string): Promise<string> {
  const embedding = await embedText(query)
  const admin = createAdmin()

  const { data: chunks, error } = await admin.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: RAG_MATCH_COUNT,
  })

  if (error || !chunks?.length) return ""

  return (chunks as { content: string }[]).map((c) => c.content).join("\n\n---\n\n")
}
