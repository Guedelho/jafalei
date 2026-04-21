"use client"

import { useState } from "react"
import UploadForm from "@/components/documents/upload-form"
import DocumentList from "@/components/documents/document-list"
import type { Document } from "@/shared/models"

export default function DocumentsView({ initialDocuments }: { initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)

  return (
    <>
      <UploadForm onUpload={(doc) => setDocuments((prev) => [doc, ...prev])} />
      <DocumentList initialDocuments={documents} />
    </>
  )
}
