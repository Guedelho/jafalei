"use client"

import { deleteDocument } from "@/lib/services/documents"
import type { Document } from "@/shared/models"
import { useState } from "react"

export default function DocumentList({
  documents,
  onDelete,
}: {
  documents: Document[]
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteDocument(id)
      onDelete(id)
    } catch {
      alert("Erro ao remover documento.")
    } finally {
      setDeleting(null)
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum documento carregado ainda.</p>
  }

  return (
    <ul className="flex flex-col gap-2 overflow-y-auto">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{doc.name}</span>
            <span className="text-xs text-gray-400">
              {new Date(doc.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={deleting === doc.id}
            className="text-sm text-red-500 transition-colors hover:text-red-700 disabled:opacity-40"
          >
            {deleting === doc.id ? "Removendo..." : "Remover"}
          </button>
        </li>
      ))}
    </ul>
  )
}
