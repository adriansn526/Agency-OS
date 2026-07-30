"use client"
import { Trophy } from "lucide-react"

// ─── Report Conversions Hero ───
// Big KPI cards: Form submissions, Phone calls, WhatsApp, Total
// Falls back to Ads clicks + organic clicks + Telnyx calls if no conversions

import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

interface ConversionsData {
  formSubmissions: number
  phoneCalls: number
  whatsappContacts: number
  otherConversions: number
  totalConversions: number
  adsConversions?: number
  adsConversionsValue?: number
  organicClicks?: number
  adsClicks?: number
  telnyxCalls?: number
}

export function ReportConversions({ data, loading }: { data?: ConversionsData; loading?: boolean }) {
  const hasConversions = data && data.totalConversions > 0

  return (
    <WidgetWrapper title="Rezultate — Conversii Generate" icon={<Trophy size={16} />} loading={loading}>
      <div style={{ padding: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        {hasConversions ? (
          <>
            <KpiCard label="Cereri Formular" value={data.formSubmissions ?? "—"} color="#4338ca" sublabel="completări contact" />
            <KpiCard label="Apeluri Telefon" value={data.phoneCalls ?? "—"} color="#059669" sublabel="apeluri unice" />
            <KpiCard label="WhatsApp" value={data.whatsappContacts ?? "—"} color="#16a34a" sublabel="mesaje noi" />
            <KpiCard label="Total Conversii" value={data.totalConversions ?? "—"} color="#6366f1" sublabel="toate sursele" />
          </>
        ) : (
          <>
            <KpiCard
              label="Click-uri Ads"
              value={(data?.adsClicks ?? 0).toLocaleString("ro-RO")}
              color="#4285f4"
              sublabel="Google Ads"
            />
            <KpiCard
              label="Click-uri Organice"
              value={(data?.organicClicks ?? 0).toLocaleString("ro-RO")}
              color="#059669"
              sublabel="Search Console"
            />
            <KpiCard
              label="Apeluri Telnyx"
              value={(data?.telnyxCalls ?? 0).toLocaleString("ro-RO")}
              color="#f59e0b"
              sublabel="tracking telefonic"
            />
            <KpiCard
              label="Total Interacțiuni"
              value={((data?.adsClicks ?? 0) + (data?.organicClicks ?? 0) + (data?.telnyxCalls ?? 0)).toLocaleString("ro-RO")}
              color="#6366f1"
              sublabel="toate sursele"
            />
          </>
        )}
      </div>
      {!hasConversions && data && (
        <div style={{ padding: "0 24px 16px", fontSize: 11, color: "#94a3b8" }}>
          ℹ️ Tracking de conversii nu este configurat. Se afișează click-uri și interacțiuni.
        </div>
      )}
    </WidgetWrapper>
  )
}
