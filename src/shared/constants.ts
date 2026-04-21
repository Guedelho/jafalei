// Verify model IDs at: https://ai.google.dev/gemini-api/docs/models
export const CHAT_MODEL = "gemini-3-flash-preview"

// Gemini Embedding 2 — 3072 dims
export const EMBED_MODEL = "gemini-embedding-2-preview"
export const EMBED_DIMS = 3072

export const CHUNK_SIZE = 1000
export const CHUNK_OVERLAP = 100
export const RAG_MATCH_COUNT = 5
export const RATE_LIMIT_MAX = 20
export const RATE_LIMIT_WINDOW_MS = 60_000
