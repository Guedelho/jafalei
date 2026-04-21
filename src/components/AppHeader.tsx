"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/documents", label: "Documentos" },
]

export default function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link href="/chat" className="text-lg font-bold text-gray-900">
        Jafalei
      </Link>
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm ${pathname.startsWith(l.href) ? "font-medium text-gray-900 underline underline-offset-4" : "text-gray-500 hover:text-gray-900"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  )
}
