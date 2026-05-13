"use client"

// ─── Report Conversions Hero ───
// Big KPI cards: Form submissions, Phone calls, WhatsApp, Total

import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

interface ConversionsData {
  formSubmissions: number
  phoneCalls: number
  whatsappContacts: number
  otherConversions: number
  totalConversions: number
}

export function ReportConversions({ data, loading }: { data?: ConversionsData; loading?: boolean }) {
  return (
    <WidgetWrapper title="Rezultate — Conversii Generate" icon="🏆" loading={loading}>
      <div style={{ padding: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard label="Cereri Formular" value={data?.formSubmissions ?? "—"} color="#4338ca" sublabel="completări contact" />
        <KpiCard label="Apeluri Telefon" value={data?.phoneCalls ?? "—"} color="#059669" sublabel="apeluri unice" />
        <KpiCard label="WhatsApp" value={data?.whatsappContacts ?? "—"} color="#16a34a" sublabel="mesaje noi" />
        <KpiCard label="Total Conversii" value={data?.totalConversions ?? "—"} color="#6366f1" sublabel="toate sursele" />
      </div>
    </WidgetWrapper>
  )
}
