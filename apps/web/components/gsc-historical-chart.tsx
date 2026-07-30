"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts"
import { Plus, X, Trash2, TrendingUp, TrendingDown, MousePointerClick, Eye, Percent, Hash, ZoomIn, ArrowRight, RotateCcw } from "lucide-react"

export interface GSCDaily {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface Annotation {
  date: string
  description: string
}

export function GscHistoricalChart({ data, annotations = [], onAddAnnotation, onDeleteAnnotation }: {
  data: GSCDaily[]
  annotations?: Annotation[]
  onAddAnnotation?: (ann: Annotation) => void
  onDeleteAnnotation?: (annDate: string) => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [annDate, setAnnDate] = useState(new Date().toISOString().split('T')[0])
  const [annDesc, setAnnDesc] = useState("")

  // Filtering State
  const [dateFilter, setDateFilter] = useState<{ start?: string, end?: string, activeAnnDate?: string } | null>(null)

  // Toggles GSC Style
  const [showClicks, setShowClicks] = useState(true)
  const [showImpressions, setShowImpressions] = useState(true)
  const [showCtr, setShowCtr] = useState(false)
  const [showPosition, setShowPosition] = useState(false)

  // 1. PAD DATES UP TO TODAY OR LATEST ANNOTATION
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstDate = new Date(sortedData[0].date)
    
    // Find max date: last data point, today, or latest annotation
    const today = new Date()
    let maxDate = today
    
    if (annotations.length > 0) {
      const latestAnn = new Date(Math.max(...annotations.map(a => new Date(a.date).getTime())))
      if (latestAnn > maxDate) maxDate = latestAnn
    }

    const dateMap = new Map<string, GSCDaily>()
    sortedData.forEach(d => dateMap.set(d.date, d))

    const padded: GSCDaily[] = []
    let current = new Date(firstDate)
    
    while (current <= maxDate) {
      const dateStr = current.toISOString().split('T')[0]
      if (dateMap.has(dateStr)) {
        padded.push(dateMap.get(dateStr)!)
      } else {
        padded.push({
          date: dateStr,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0
        })
      }
      current.setDate(current.getDate() + 1)
    }

    return padded
  }, [data, annotations])

  // Filter Data for the Chart
  const chartData = useMemo(() => {
    if (!dateFilter) return processedData
    const startMs = dateFilter.start ? new Date(dateFilter.start).getTime() : 0
    const endMs = dateFilter.end ? new Date(dateFilter.end).getTime() : Infinity
    return processedData.filter(d => {
      const t = new Date(d.date).getTime()
      return t >= startMs && t <= endMs
    })
  }, [processedData, dateFilter])

  // 2. CALCULATE TOTALS FOR METRIC CARDS
  const totals = useMemo(() => {
    if (chartData.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    const validData = chartData.filter(d => d.clicks > 0 || d.impressions > 0)
    if (validData.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 }

    const c = validData.reduce((acc, curr) => acc + (curr.clicks || 0), 0)
    const i = validData.reduce((acc, curr) => acc + (curr.impressions || 0), 0)
    const validPos = validData.filter(p => p.position > 0)
    const p = validPos.length > 0 ? validPos.reduce((acc, curr) => acc + (curr.position || 0), 0) / validPos.length : 0
    return {
      clicks: c,
      impressions: i,
      ctr: i > 0 ? (c / i) * 100 : 0,
      position: p
    }
  }, [processedData])

  const handleAdd = () => {
    if (!annDesc.trim() || !onAddAnnotation) return
    onAddAnnotation({ date: annDate, description: annDesc.trim() })
    setShowModal(false)
    setAnnDesc("")
  }

  // Format datetimes for the tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const annotation = annotations.find(a => a.date === label)
      
      return (
        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl text-xs space-y-1 z-50 min-w-[150px]">
          <p className="font-semibold text-foreground mb-2 pb-2 border-b border-border/50">{label}</p>
          {showClicks && payload.find((p: any) => p.dataKey === 'clicks') && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 bg-[#3b82f6] rounded-full"/> Clicks</span>
              <span className="font-bold text-foreground">{payload.find((p: any) => p.dataKey === 'clicks')?.value}</span>
            </div>
          )}
          {showImpressions && payload.find((p: any) => p.dataKey === 'impressions') && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 bg-[#8b5cf6] rounded-full"/> Impressions</span>
              <span className="font-bold text-foreground">{payload.find((p: any) => p.dataKey === 'impressions')?.value}</span>
            </div>
          )}
          {showCtr && payload.find((p: any) => p.dataKey === 'ctr') && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 bg-[#10b981] rounded-full"/> CTR</span>
              <span className="font-bold text-foreground">{Number(payload.find((p: any) => p.dataKey === 'ctr')?.value || 0).toFixed(2)}%</span>
            </div>
          )}
          {showPosition && payload.find((p: any) => p.dataKey === 'position') && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 bg-[#f59e0b] rounded-full"/> Position</span>
              <span className="font-bold text-foreground">{Number(payload.find((p: any) => p.dataKey === 'position')?.value || 0).toFixed(1)}</span>
            </div>
          )}
          
          {annotation && (
            <div className="mt-3 pt-2 border-t border-border/50 text-yellow-500">
              <span className="font-semibold block mb-1">📝 Adnotare:</span>
              <span className="text-[11px] break-words whitespace-pre-wrap">{annotation.description}</span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // 3. BEFORE VS AFTER CALCULATION
  const getBeforeAfterStats = (annDate: string): { status: 'waiting' } | { status: 'ready', bClicks: number, aClicks: number, clickDiff: number, bImpr: number, aImpr: number, imprDiff: number } | null => {
    const targetIdx = processedData.findIndex(d => d.date === annDate)
    if (targetIdx === -1) return null

    // 7 days before
    const beforeDays = processedData.slice(Math.max(0, targetIdx - 7), targetIdx)
    // 7 days after
    const afterDays = processedData.slice(targetIdx + 1, targetIdx + 8)

    if (beforeDays.length === 0 || afterDays.length === 0) return null

    const bClicks = beforeDays.reduce((a, c) => a + c.clicks, 0) / beforeDays.length
    const aClicks = afterDays.reduce((a, c) => a + c.clicks, 0) / afterDays.length

    const bImpr = beforeDays.reduce((a, c) => a + c.impressions, 0) / beforeDays.length
    const aImpr = afterDays.reduce((a, c) => a + c.impressions, 0) / afterDays.length

    // If data is all 0, it means the API hasn't delivered data for those days yet
    if (aClicks === 0 && aImpr === 0) {
      return { status: 'waiting' }
    }

    const clickDiff = bClicks > 0 ? ((aClicks - bClicks) / bClicks) * 100 : 0
    const imprDiff = bImpr > 0 ? ((aImpr - bImpr) / bImpr) * 100 : 0

    return {
      status: 'ready' as const,
      bClicks, aClicks, clickDiff,
      bImpr, aImpr, imprDiff
    }
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-5 relative group">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Performanță Organică în Timp
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Compară metricile esențiale din Google Search Console pe parcursul proiectului.</p>
          </div>
          {onAddAnnotation && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
            >
              <Plus size={12} /> Adaugă Adnotare
            </button>
          )}
        </div>

        {/* GSC Toggles Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button 
            onClick={() => setShowClicks(!showClicks)}
            className={`p-4 rounded-xl border text-left transition-all ${showClicks ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30' : 'bg-surface border-border hover:bg-muted'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${showClicks ? 'bg-[#3b82f6]/20' : 'bg-muted'}`}>
                <MousePointerClick size={14} className={showClicks ? 'text-[#3b82f6]' : 'text-muted-foreground'} />
              </div>
              <span className={`text-xs font-medium ${showClicks ? 'text-[#3b82f6]' : 'text-muted-foreground'}`}>Clicuri totale</span>
            </div>
            <p className={`text-xl font-bold ${showClicks ? 'text-[#3b82f6]' : 'text-muted-foreground'}`}>{totals.clicks.toLocaleString('ro-RO')}</p>
          </button>

          <button 
            onClick={() => setShowImpressions(!showImpressions)}
            className={`p-4 rounded-xl border text-left transition-all ${showImpressions ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30' : 'bg-surface border-border hover:bg-muted'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${showImpressions ? 'bg-[#8b5cf6]/20' : 'bg-muted'}`}>
                <Eye size={14} className={showImpressions ? 'text-[#8b5cf6]' : 'text-muted-foreground'} />
              </div>
              <span className={`text-xs font-medium ${showImpressions ? 'text-[#8b5cf6]' : 'text-muted-foreground'}`}>Afișări totale</span>
            </div>
            <p className={`text-xl font-bold ${showImpressions ? 'text-[#8b5cf6]' : 'text-muted-foreground'}`}>{totals.impressions.toLocaleString('ro-RO')}</p>
          </button>

          <button 
            onClick={() => setShowCtr(!showCtr)}
            className={`p-4 rounded-xl border text-left transition-all ${showCtr ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-surface border-border hover:bg-muted'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${showCtr ? 'bg-[#10b981]/20' : 'bg-muted'}`}>
                <Percent size={14} className={showCtr ? 'text-[#10b981]' : 'text-muted-foreground'} />
              </div>
              <span className={`text-xs font-medium ${showCtr ? 'text-[#10b981]' : 'text-muted-foreground'}`}>CTR mediu</span>
            </div>
            <p className={`text-xl font-bold ${showCtr ? 'text-[#10b981]' : 'text-muted-foreground'}`}>{totals.ctr.toFixed(1)}%</p>
          </button>

          <button 
            onClick={() => setShowPosition(!showPosition)}
            className={`p-4 rounded-xl border text-left transition-all ${showPosition ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30' : 'bg-surface border-border hover:bg-muted'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${showPosition ? 'bg-[#f59e0b]/20' : 'bg-muted'}`}>
                <Hash size={14} className={showPosition ? 'text-[#f59e0b]' : 'text-muted-foreground'} />
              </div>
              <span className={`text-xs font-medium ${showPosition ? 'text-[#f59e0b]' : 'text-muted-foreground'}`}>Poziție medie</span>
            </div>
            <p className={`text-xl font-bold ${showPosition ? 'text-[#f59e0b]' : 'text-muted-foreground'}`}>{totals.position.toFixed(1)}</p>
          </button>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(v: string) => {
                  try { 
                    return new Date(v || "").toLocaleDateString('ro-RO', { month: 'short', day: '2-digit' })
                  } catch { return v || "" }
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
                minTickGap={20}
              />
              
              {/* Independent Y-Axes so lines don't squash each other */}
              {showClicks && (
                <YAxis 
                  yAxisId="clicks"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  dx={-10}
                />
              )}
              {showImpressions && (
                <YAxis 
                  yAxisId="impressions"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  dx={-10}
                  hide={showClicks} // Hide text if Clicks is already showing on the left
                />
              )}

              {showCtr && (
                <YAxis 
                  yAxisId="ctr"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  dx={10}
                />
              )}
              {showPosition && (
                <YAxis 
                  yAxisId="position"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  dx={10}
                  reversed={true} // Position 1 is at the top
                  hide={showCtr} // Hide text if CTR is already showing on the right
                />
              )}

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "3 3" }} />
              
              {annotations.map((ann, i) => (
                <ReferenceLine 
                  key={i} 
                  x={ann.date} 
                  stroke="#eab308" 
                  strokeDasharray="3 3"
                  label={{ position: 'top', value: '📝', fill: '#eab308', fontSize: 12 }}
                  yAxisId={showClicks ? "clicks" : showImpressions ? "impressions" : showCtr ? "ctr" : showPosition ? "position" : undefined}
                />
              ))}

              {showClicks && (
                <Line 
                  yAxisId="clicks"
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                  animationDuration={1000}
                />
              )}
              {showImpressions && (
                <Line 
                  yAxisId="impressions"
                  type="monotone" 
                  dataKey="impressions" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  animationDuration={1000}
                />
              )}
              {showCtr && (
                <Line 
                  yAxisId="ctr"
                  type="monotone" 
                  dataKey="ctr" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                  animationDuration={1000}
                />
              )}
              {showPosition && (
                <Line 
                  yAxisId="position"
                  type="monotone" 
                  dataKey="position" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                  animationDuration={1000}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Annotation Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Adaugă Adnotare (SEO)</h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data Eveniment</label>
                  <input 
                    type="date" 
                    value={annDate} 
                    onChange={(e) => setAnnDate(e.target.value)} 
                    className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descriere Modificare</label>
                  <textarea 
                    value={annDesc} 
                    onChange={(e) => setAnnDesc(e.target.value)} 
                    placeholder="Ex: Rezolvat trailing slash, Publicat 3 articole..." 
                    className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors min-h-[80px] resize-none" 
                    autoFocus
                  />
                </div>
                <div className="pt-2">
                  <button 
                    onClick={handleAdd}
                    disabled={!annDesc.trim()}
                    className="w-full py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    Salvează Adnotare
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ANNOTATIONS HISTORY PANEL */}
      {annotations.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Istoric & Analiză Adnotări SEO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {annotations.map((ann, idx) => {
              const stats = getBeforeAfterStats(ann.date)
              
              return (
                <div key={idx} className="border border-border/50 rounded-xl p-4 bg-background/50 hover:bg-muted/30 transition-colors relative group">
                  {onDeleteAnnotation && (
                    <button 
                      onClick={() => onDeleteAnnotation(ann.date)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Șterge adnotarea"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      {new Date(ann.date).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-4 pr-6">{ann.description}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button 
                      onClick={() => {
                        const t = new Date(ann.date).getTime()
                        const start = new Date(t - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        const end = new Date(t + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        setDateFilter({ start, end, activeAnnDate: ann.date })
                      }}
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border transition-colors flex items-center gap-1.5 ${dateFilter?.activeAnnDate === ann.date && dateFilter?.end ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-muted-foreground border-border hover:border-primary hover:text-primary'}`}
                    >
                      <ZoomIn size={12} /> ±7 Zile
                    </button>
                    <button 
                      onClick={() => setDateFilter({ start: ann.date, activeAnnDate: ann.date })}
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border transition-colors flex items-center gap-1.5 ${dateFilter?.activeAnnDate === ann.date && !dateFilter?.end ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-muted-foreground border-border hover:border-primary hover:text-primary'}`}
                    >
                      <ArrowRight size={12} /> Evoluție
                    </button>
                    {dateFilter?.activeAnnDate === ann.date && (
                      <button 
                        onClick={() => setDateFilter(null)}
                        className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border bg-muted/50 text-muted-foreground border-border hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    )}
                  </div>

                  {/* Before / After Logic */}
                  <div className="bg-surface border border-border/50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Impact (7 zile vs 7 zile)</p>
                    
                    {(() => {
                      if (!stats) {
                        return <p className="text-xs text-muted-foreground italic">Nu există date suficiente pentru a calcula impactul.</p>
                      }
                      if (stats.status === 'waiting') {
                        return <p className="text-xs text-muted-foreground italic">Google Search Console nu a procesat încă datele pentru acest interval. Verifică în 2-3 zile.</p>
                      }
                      
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Evoluție Clicks</div>
                            <div className={`flex items-center gap-1 text-sm font-bold ${stats.clickDiff > 0 ? 'text-green-500' : stats.clickDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {stats.clickDiff > 0 ? <TrendingUp size={14} /> : stats.clickDiff < 0 ? <TrendingDown size={14} /> : null}
                              {stats.clickDiff > 0 ? '+' : ''}{stats.clickDiff.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {stats.bClicks.toFixed(1)} → {stats.aClicks.toFixed(1)} avg/zi
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Evoluție Afișări</div>
                            <div className={`flex items-center gap-1 text-sm font-bold ${stats.imprDiff > 0 ? 'text-green-500' : stats.imprDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {stats.imprDiff > 0 ? <TrendingUp size={14} /> : stats.imprDiff < 0 ? <TrendingDown size={14} /> : null}
                              {stats.imprDiff > 0 ? '+' : ''}{stats.imprDiff.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {stats.bImpr.toFixed(0)} → {stats.aImpr.toFixed(0)} avg/zi
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
