import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Jafalei",
  description: "Assistente de perguntas e respostas",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-white text-gray-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
