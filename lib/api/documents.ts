import type { Document } from "@/shared/models"

export async function uploadDocument(file: File): Promise<Document> {
  const body = new FormData()
  body.append("file", file)
  const res = await fetch("/api/documents", { method: "POST", body })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Erro ao enviar documento" }))
    throw new Error(error ?? "Erro ao enviar documento")
  }
  return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Erro ao remover documento")
}
