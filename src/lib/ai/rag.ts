import "server-only"
import type { Document } from "@langchain/core/documents"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { createClient } from "@/lib/supabase/server"
import { EMBED_MODEL, RAG_MATCH_COUNT } from "@/shared/constants"

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function retrieveDocs(query: string): Promise<Document[]> {
  const supabase = await createClient()

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "document_chunks",
    queryName: "match_chunks",
  })

  return vectorStore.asRetriever(RAG_MATCH_COUNT).invoke(query)
}
