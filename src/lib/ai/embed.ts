import "server-only"
import { genAI } from "@/lib/ai/genai"
import { EMBED_MODEL } from "@/shared/constants"

export async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
}
