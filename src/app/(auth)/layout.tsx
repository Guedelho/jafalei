import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-gray-900">Jafalei</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/chat" className="text-gray-600 transition-colors hover:text-gray-900">
              Chat
            </Link>
            <Link href="/documents" className="text-gray-600 transition-colors hover:text-gray-900">
              Documentos
            </Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
        Sair
      </button>
    </form>
  )
}
