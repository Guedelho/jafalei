import "server-only"
import type { Document } from "@langchain/core/documents"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { embeddings } from "@/lib/ai/genai"
import { createClient } from "@/lib/supabase/server"
import { RAG_MATCH_COUNT } from "@/shared/constants"

export async function retrieveDocs(query: string): Promise<Document[]> {
  const supabase = await createClient()

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "document_chunks",
    queryName: "match_chunks",
  })

  return vectorStore.asRetriever(RAG_MATCH_COUNT).invoke(query)
}
