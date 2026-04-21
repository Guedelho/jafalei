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
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Documentos</h2>
      <DocumentsView initialDocuments={documents} />
    </div>
  )
}
