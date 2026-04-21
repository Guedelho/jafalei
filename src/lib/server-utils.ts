import "server-only"
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "@/shared/constants"

const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  return timestamps.length < RATE_LIMIT_MAX
}

export function recordRateLimit(userId: string): void {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  rateLimitMap.set(userId, timestamps)
}
