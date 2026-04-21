import "server-only"
import { createClient } from "@/lib/supabase/server"
import { embedText } from "@/lib/ai/embed"
import { RAG_MATCH_COUNT } from "@/shared/constants"

export async function retrieveContext(query: string): Promise<string> {
  const embedding = await embedText(query)
  const supabase = await createClient()

  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: RAG_MATCH_COUNT,
  })

  if (error || !chunks?.length) return ""

  return (chunks as { content: string }[]).map((c) => c.content).join("\n\n---\n\n")
}
