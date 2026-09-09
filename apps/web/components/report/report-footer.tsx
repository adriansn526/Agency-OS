"use client"

// ─── Report Footer ───
// Uses ReportTheme for dynamic accent color

import type { ReportTheme } from "@/lib/report-themes"
import { getReportTheme } from "@/lib/report-themes"

interface ReportFooterProps {
  businessLine: { slug: string; name: string }
  theme?: ReportTheme
}

export function ReportFooter({ businessLine, theme: themeProp }: ReportFooterProps) {
  const theme = themeProp ?? getReportTheme(businessLine.slug)

  return (
    <footer style={{
      maxWidth: 1200,
      margin: "40px auto 0",
      padding: "24px 20px",
      borderTop: "1px solid #e2e8f0",
      textAlign: "center",
    }}>
      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
        Powered by <strong style={{ color: theme.primary }}>{businessLine.name}</strong> · Raport generat automat
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#cbd5e1" }}>
        © {new Date().getFullYear()} ASNS Digital Agency · office@asns.ro
      </p>
    </footer>
  )
}
