import "server-only"
import { embeddings } from "@/lib/ai/genai"

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return embeddings.embedDocuments(texts)
}
