import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Ofertă Comercială | ASNS Agency",
  description: "Vizualizează oferta comercială ASNS Agency",
  robots: "noindex, nofollow",
}

export default function PublicOfferLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Force light mode on public offer pages — override root html.dark class */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove('dark');document.body.style.background='#fffbf5';document.body.style.color='#111827';`,
        }}
      />
      {children}
    </>
  )
}
