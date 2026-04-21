import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AppHeader from "@/components/AppHeader"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex h-[calc(100vh-57px)] flex-col">{children}</main>
    </div>
  )
}
