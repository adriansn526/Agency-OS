import type { ReactNode } from "react"
import Script from "next/script"

export const metadata = {
  title: "Contract | ASNS",
  description: "Vizualizare contract de prestări servicii",
}

export default function PublicContractLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script id="force-light-contract" strategy="beforeInteractive">{`
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        document.body.style.background = '#f9fafb';
      `}</Script>
      {children}
    </>
  )
}
