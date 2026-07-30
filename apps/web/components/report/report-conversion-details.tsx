"use client"

import { WidgetWrapper } from "./report-widget-wrapper"

// ─── Report Conversion Details ───
// Shows detailed conversion breakdown by landing page + form submissions
// Data sources: Google Ads landing pages + PostHog form tracking

interface LandingPageConversion {
  landingPage: string
  totalConversions: number
  totalValue: number
  topActions: Array<{ name: string; count: number }>
}

interface ConversionByPage {
  pageUrl: string
  totalConversions: number
  formSubmissions: number
  phoneClicks: number
  emailClicks: number
}

interface ConversionDetailsData {
  landingPageConversions?: LandingPageConversion[]
  conversionsByPage?: ConversionByPage[]
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url.replace(/https?:\/\/[^/]+/, '') || '/'
  }
}

export function ReportConversionDetails({ data, loading }: { data?: ConversionDetailsData; loading?: boolean }) {
  const hasLanding = data?.landingPageConversions && data.landingPageConversions.length > 0
  const hasPosthog = data?.conversionsByPage && data.conversionsByPage.length > 0

  if (!hasLanding && !hasPosthog && !loading) return null

  return (
    <WidgetWrapper title="Conversii Detaliate — Per Pagină" icon="📊" loading={loading}>
      <div style={{ padding: 24 }}>
        {/* Landing Page Conversions from Google Ads */}
        {hasLanding && (
          <div style={{ marginBottom: hasPosthog ? 32 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                📄 Conversii per Landing Page
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                Google Ads — de pe ce pagini vin conversiile
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Pagină
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Conversii
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Valoare
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Tip Conversie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data!.landingPageConversions!.slice(0, 15).map((lp, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500, maxWidth: 280 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lp.landingPage}>
                          {extractPath(lp.landingPage)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                        {lp.totalConversions}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#f59e0b", fontWeight: 500 }}>
                        {lp.totalValue > 0 ? `${lp.totalValue} RON` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(lp.topActions || []).slice(0, 3).map((a, j) => (
                            <span key={j} style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              background: "#eef2ff",
                              color: "#4338ca",
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 12,
                            }}>
                              {a.count}× {a.name.length > 20 ? a.name.slice(0, 20) + "…" : a.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PostHog Form Submissions per Page */}
        {hasPosthog && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                📝 Interacțiuni per Pagină
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                Formulare trimise, click-uri telefon și email
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Pagină
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      Total
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      📝 Forms
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      📞 Telefon
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      📧 Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data!.conversionsByPage!.slice(0, 20).map((cp, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500, maxWidth: 300 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cp.pageUrl}>
                          {extractPath(cp.pageUrl)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                        {cp.totalConversions}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#4338ca", fontWeight: 500 }}>
                        {cp.formSubmissions || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#16a34a", fontWeight: 500 }}>
                        {cp.phoneClicks || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#2563eb", fontWeight: 500 }}>
                        {cp.emailClicks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No data state */}
        {!hasLanding && !hasPosthog && !loading && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
            ℹ️ Nu sunt date de conversii detaliate disponibile. Activează tracking-ul PostHog pe site.
          </div>
        )}
      </div>
    </WidgetWrapper>
  )
}
