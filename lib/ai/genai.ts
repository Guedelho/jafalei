import "server-only"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHAT_MODEL, EMBED_MODEL, CHUNK_SIZE, CHUNK_OVERLAP } from "@/shared/constants"

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const chatModel = new ChatGoogleGenerativeAI({
  model: CHAT_MODEL,
  temperature: 0.3,
  streaming: true,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
})
