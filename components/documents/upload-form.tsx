"use client"

import { useState, useRef } from "react"
import { uploadDocument } from "@/lib/services/documents"
import type { Document } from "@/shared/models"

export default function UploadForm({ onUpload }: { onUpload?: (doc: Document) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setLoading(true)

    try {
      const doc = await uploadDocument(file)
      onUpload?.(doc)
      if (inputRef.current) inputRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-gray-400">
        <span className="text-sm text-gray-600">
          {loading ? "Enviando..." : "Clique para enviar um documento (PDF, TXT, DOCX)"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleChange}
          disabled={loading}
          className="hidden"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
