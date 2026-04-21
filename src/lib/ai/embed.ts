import "server-only"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { EMBED_MODEL } from "@/shared/constants"

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return embeddings.embedDocuments(texts)
}
