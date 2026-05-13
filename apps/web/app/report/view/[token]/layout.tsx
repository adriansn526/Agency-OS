import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Raport Performanță | ASNS",
  description: "Dashboard de performanță marketing — powered by ASNS",
  robots: "noindex, nofollow",
}

export default function PublicReportLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Force light mode on public report pages */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove('dark');document.body.style.background='#f8fafc';document.body.style.color='#0f172a';`,
        }}
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {children}
    </>
  )
}
