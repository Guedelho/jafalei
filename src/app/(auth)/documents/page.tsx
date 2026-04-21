import { createAdmin } from "@/lib/supabase/admin"
import { getUserId } from "@/lib/supabase/auth"
import { redirect } from "next/navigation"
import DocumentsView from "@/components/documents/documents-view"
import type { Document } from "@/shared/models"

export default async function DocumentsPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")

  const admin = createAdmin()
  const { data } = await admin
    .from("documents")
    .select("id, user_id, name, mime_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  const documents: Document[] = data ?? []

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Documentos</h2>
      <DocumentsView initialDocuments={documents} />
    </div>
  )
}
