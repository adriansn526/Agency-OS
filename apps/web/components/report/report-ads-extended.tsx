"use client"

import { Monitor, Smartphone, Tablet } from "lucide-react"
import type { GoogleAdsData } from "@/lib/reports/aggregator"

/**
 * Device breakdown widget — shows performance per device type
 */
export function AdsDeviceBreakdown({ data }: { data: GoogleAdsData }) {
  const devices = data.deviceBreakdown
  if (!devices?.length) return null

  const totalClicks = devices.reduce((s, d) => s + d.clicks, 0)
  const deviceMap: Record<string, string> = {
    "2": "Mobile",
    "3": "Tablet",
    "4": "Desktop",
    "6": "Connected TV",
    "Desktop": "Desktop",
    "Mobile": "Mobile",
    "Tablet": "Tablet",
  }
  
  const icons: Record<string, React.ReactNode> = {
    Desktop: <Monitor size={14} />,
    Mobile: <Smartphone size={14} />,
    Tablet: <Tablet size={14} />,
    "Connected TV": <Monitor size={14} />
  }
  const colors: Record<string, string> = {
    Desktop: "bg-blue-500",
    Mobile: "bg-violet-500",
    Tablet: "bg-amber-500",
    "Connected TV": "bg-emerald-500"
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <Smartphone size={14} className="text-violet-400" />
        Performanță per Device
      </h4>

      {/* Visual bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        {devices.map(d => {
          const deviceName = deviceMap[d.device] || d.device
          return (
            <div
              key={d.device}
              className={`${colors[deviceName] || "bg-zinc-500"} transition-all`}
              style={{ width: `${totalClicks > 0 ? (d.clicks / totalClicks) * 100 : 0}%` }}
            />
          )
        })}
      </div>

      {/* Table */}
      <div className="space-y-2">
        {devices.map(d => {
          const deviceName = deviceMap[d.device] || d.device
          const pct = totalClicks > 0 ? ((d.clicks / totalClicks) * 100).toFixed(1) : "0"
          return (
            <div key={d.device} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                {icons[deviceName] || <Monitor size={14} />}
                <span>{deviceName}</span>
                <span className="text-zinc-500">({pct}%)</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span>{d.clicks.toLocaleString("ro-RO")} clicks</span>
                <span>{d.ctr}% CTR</span>
                <span>{d.spend.toLocaleString("ro-RO")} lei</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Impression Share widget — shows search visibility
 */
export function AdsImpressionShare({ data }: { data: GoogleAdsData }) {
  const is = data.impressionShare
  if (!is?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <Monitor size={14} className="text-emerald-400" />
        Impression Share
      </h4>
      <div className="space-y-2">
        {is.map(row => (
          <div key={row.campaignName} className="space-y-1">
            <div className="text-xs text-zinc-400 truncate">{row.campaignName}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${row.searchImpressionShare || 0}%` }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-300 w-12 text-right">
                {row.searchImpressionShare != null ? `${row.searchImpressionShare}%` : "—"}
              </span>
            </div>
            {(row.lostIsBudget != null || row.lostIsRank != null) && (
              <div className="flex gap-3 text-[10px] text-zinc-500">
                {row.lostIsBudget != null && <span>Lost (budget): {row.lostIsBudget}%</span>}
                {row.lostIsRank != null && <span>Lost (rank): {row.lostIsRank}%</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Keywords with Quality Score
 */
export function AdsKeywordQuality({ data }: { data: GoogleAdsData }) {
  const kws = data.keywords
  if (!kws?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <Monitor size={14} className="text-blue-400" />
        Keywords & Quality Score
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 text-left">
              <th className="pb-2">Keyword</th>
              <th className="pb-2 text-center">QS</th>
              <th className="pb-2 text-right">Clicks</th>
              <th className="pb-2 text-right">CTR</th>
              <th className="pb-2 text-right">CPC</th>
            </tr>
          </thead>
          <tbody>
            {kws.slice(0, 10).map((kw, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-1.5 text-zinc-300 max-w-[150px] truncate">{kw.keyword}</td>
                <td className="py-1.5 text-center">
                  {kw.qualityScore != null ? (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                      ${kw.qualityScore >= 7 ? "bg-emerald-500/20 text-emerald-400" :
                        kw.qualityScore >= 4 ? "bg-amber-500/20 text-amber-400" :
                        "bg-red-500/20 text-red-400"}`}>
                      {kw.qualityScore}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-zinc-400">{kw.clicks}</td>
                <td className="py-1.5 text-right text-zinc-400">{kw.ctr}%</td>
                <td className="py-1.5 text-right text-zinc-400">€{kw.cpc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Hour of Day + Day of Week heatmap
 */
export function AdsTimeAnalysis({ data }: { data: GoogleAdsData }) {
  const hourData = data.hourOfDay
  const dayData = data.dayOfWeek
  if (!hourData?.length && !dayData?.length) return null

  const maxHourClicks = hourData ? Math.max(...hourData.map(h => h.clicks), 1) : 1
  const maxDayClicks = dayData ? Math.max(...dayData.map(d => d.clicks), 1) : 1

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <Monitor size={14} className="text-cyan-400" />
        Analiză Temporală
      </h4>

      {/* Hour heatmap */}
      {hourData && hourData.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-zinc-500 mb-1.5">Clicks per oră</div>
          <div className="flex gap-0.5">
            {hourData.map(h => {
              const intensity = h.clicks / maxHourClicks
              const bg = intensity > 0.7 ? "bg-blue-500" : intensity > 0.3 ? "bg-blue-700" : intensity > 0 ? "bg-blue-900" : "bg-zinc-800"
              return (
                <div
                  key={h.hour}
                  className={`flex-1 h-6 rounded-sm ${bg} transition-all`}
                  title={`${h.label}: ${h.clicks} clicks, €${h.spend}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      )}

      {/* Day of week bars */}
      {dayData && dayData.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500 mb-1.5">Clicks per zi</div>
          <div className="space-y-1">
            {dayData.map(d => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 w-10">{d.label.slice(0, 3)}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${(d.clicks / maxDayClicks) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 w-10 text-right">{d.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Ad Group Performance table
 */
export function AdsAdGroupPerformance({ data }: { data: GoogleAdsData }) {
  const adGroups = data.adGroups
  if (!adGroups?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <Monitor size={14} className="text-amber-400" />
        Ad Groups
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 text-left">
              <th className="pb-2">Grup</th>
              <th className="pb-2 text-right">Clicks</th>
              <th className="pb-2 text-right">Cost</th>
              <th className="pb-2 text-right">Conv.</th>
              <th className="pb-2 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {adGroups.slice(0, 8).map((ag, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-1.5 text-zinc-300 max-w-[150px] truncate" title={ag.name}>{ag.name}</td>
                <td className="py-1.5 text-right text-zinc-400">{ag.metrics.clicks}</td>
                <td className="py-1.5 text-right text-zinc-400">€{ag.metrics.spend}</td>
                <td className="py-1.5 text-right text-zinc-400">{ag.metrics.conversions}</td>
                <td className="py-1.5 text-right text-zinc-400">{ag.metrics.roas}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
