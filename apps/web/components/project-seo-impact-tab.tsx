"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Loader2, Activity, TrendingUp, Link2, MousePointerClick, Eye, Hash, BarChart, Table, ArrowUpDown } from "lucide-react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from "recharts"

import { GscHistoricalChart, GSCDaily, Annotation } from "./gsc-historical-chart"
import { toast } from "sonner"

interface Props {
  projectId: string
  domain: string
  gscPages: any[]
  gscDaily?: GSCDaily[]
  dfsPages: any[]
  metadata: any
}

// Math Utility: Pearson Correlation
function pearsonCorrelation(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * (y[i] || 0), 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

export function ProjectSeoImpactTab({ projectId, domain, gscPages, gscDaily, dfsPages, metadata }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wpPosts, setWpPosts] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>(metadata.annotations || [])

  const [xAxis, setXAxis] = useState<"internal"|"external"|"rank">("internal")
  const [yAxis, setYAxis] = useState<"clicks"|"impressions"|"position">("clicks")
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")

  const [tableSortCol, setTableSortCol] = useState<"path"|"internal"|"external"|"rank"|"clicks"|"impressions"|"position">("clicks")
  const [tableSortDir, setTableSortDir] = useState<"asc"|"desc">("desc")
  
  const [tablePage, setTablePage] = useState(1)
  const tableRowsPerPage = 15

  const handleTableSort = (col: "path"|"internal"|"external"|"rank"|"clicks"|"impressions"|"position") => {
    if (tableSortCol === col) {
      setTableSortDir(tableSortDir === "asc" ? "desc" : "asc")
    } else {
      setTableSortCol(col)
      setTableSortDir("desc")
    }
  }

  // Fetch WP Posts to compute internal links
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/wp-posts`)
        if (res.ok) {
          const json = await res.json()
          setWpPosts(json.data || [])
        }
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  const mergedData = useMemo(() => {
    if (!gscPages || gscPages.length === 0) return []
    
    // Create map for dfs pages
    const extMap = new Map()
    for (const dp of dfsPages) {
      try {
        const path = new URL(dp.url).pathname
        extMap.set(path, dp)
      } catch(e) {}
    }

    // Compute internal links map from wpPosts
    const internalLinksMap = new Map()
    if (wpPosts.length > 0) {
      wpPosts.forEach(p => {
        const postUrl = p.link || ""
        if (postUrl) {
          try {
            const path = new URL(postUrl).pathname
            let inlinkCount = 0
            wpPosts.forEach(other => {
              if (other.id !== p.id && other.content?.rendered?.includes(path)) {
                inlinkCount++
              }
            })
            internalLinksMap.set(path, inlinkCount)
          } catch(e) {}
        }
      })
    }

    return gscPages.map(g => {
      const gscUrl = g.keys?.[0] || g.page || '';
      if (!gscUrl) return null;
      
      const path = gscUrl.replace(`https://${domain}`, '').replace(`http://${domain}`, '') || '/'
      const internalLinks = internalLinksMap.get(path) || internalLinksMap.get(path.replace(/\/$/, '')) || internalLinksMap.get(path + '/') || 0
      const extPage = extMap.get(path) || extMap.get(path.replace(/\/$/, '')) || extMap.get(path + '/')

      return {
        path,
        clicks: g.clicks || 0,
        impressions: g.impressions || 0,
        position: g.position || 0,
        internal: internalLinks,
        external: extPage?.backlinks || 0,
        rank: extPage?.rank || 0
      }
    }).filter(d => d !== null && (d.internal > 0 || d.external > 0 || d.clicks > 0 || d.impressions > 0)) as any[]
  }, [gscPages, wpPosts, dfsPages, domain])

  const stats = useMemo(() => {
    if (mergedData.length < 2) return null
    
    const internals = mergedData.map(d => d.internal)
    const externals = mergedData.map(d => d.external)
    const ranks = mergedData.map(d => d.rank)
    
    const clicks = mergedData.map(d => d.clicks)
    const imp = mergedData.map(d => d.impressions)
    const pos = mergedData.map(d => d.position) // Inverted meaning usually (lower is better), but for math we keep it raw

    return {
      clicks: {
        internal: pearsonCorrelation(internals, clicks),
        external: pearsonCorrelation(externals, clicks),
        rank: pearsonCorrelation(ranks, clicks)
      },
      impressions: {
        internal: pearsonCorrelation(internals, imp),
        external: pearsonCorrelation(externals, imp),
        rank: pearsonCorrelation(ranks, imp)
      },
      position: {
        internal: pearsonCorrelation(internals, pos),
        external: pearsonCorrelation(externals, pos),
        rank: pearsonCorrelation(ranks, pos)
      }
    }
  }, [mergedData])

  if (!domain) return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl border border-border text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Se calculează regresia multiplă și se extrag datele live...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
        <h3 className="font-semibold mb-1">Eroare DataForSEO</h3>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (mergedData.length < 3) {
    return (
      <div className="p-12 text-center text-muted-foreground bg-surface rounded-xl border border-border">
        <p>Date insuficiente (GSC + Site) pentru a rula o corelație validă.</p>
      </div>
    )
  }

  const formatPercent = (val: number) => {
    // Pearson r is -1 to 1. 
    // We can show it as an Impact Score (r^2 * 100 or simply r * 100 if positive)
    // To make it intuitive:
    const sign = val < 0 ? '-' : '+'
    const percent = Math.round(Math.abs(val) * 100)
    return `${sign}${percent}%`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl text-sm">
          <p className="font-semibold text-primary mb-2">{data.path}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-muted-foreground">Internal Links:</div><div className="font-medium text-right">{data.internal}</div>
            <div className="text-muted-foreground">External Links:</div><div className="font-medium text-right">{data.external}</div>
            <div className="text-muted-foreground">Page Rank:</div><div className="font-medium text-right">{data.rank}</div>
            <div className="col-span-2 my-1 border-t border-border/50"></div>
            <div className="text-muted-foreground">Clicks:</div><div className="font-medium text-right">{data.clicks}</div>
            <div className="text-muted-foreground">Afișări:</div><div className="font-medium text-right">{data.impressions}</div>
            <div className="text-muted-foreground">Poziție Avg:</div><div className="font-medium text-right">{data.position.toFixed(1)}</div>
          </div>
        </div>
      )
    }
    return null
  }

  const currentCorrelation = stats?.[yAxis]?.[xAxis] || 0
  const isNegativeGood = yAxis === "position" // for position, negative correlation is GOOD
  const isStrong = Math.abs(currentCorrelation) > 0.5
  
  let insightText = ""
  if (Math.abs(currentCorrelation) < 0.1) insightText = "Nu există o legătură matematică clară (impact nul sau extrem de slab)."
  else if (currentCorrelation > 0 && !isNegativeGood) insightText = "Relație directă: creșterea factorului duce la creșterea performanței."
  else if (currentCorrelation < 0 && !isNegativeGood) insightText = "Relație inversă: creșterea factorului este asociată cu o scădere a performanței."
  else if (currentCorrelation < 0 && isNegativeGood) insightText = "Relație pozitivă (Poziție): creșterea factorului duce la o poziție mai mică (MAI BUNĂ) în top."
  else if (currentCorrelation > 0 && isNegativeGood) insightText = "Relație negativă (Poziție): creșterea factorului duce la o poziție mai mare (MAI SLABĂ) în top."

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Historical GSC Chart */}
      {gscDaily && gscDaily.length > 0 && (
        <GscHistoricalChart 
          data={gscDaily} 
          annotations={annotations} 
          onAddAnnotation={(ann) => {
            const newAnnotations = [...annotations, ann]
            setAnnotations(newAnnotations)
            const updatedMetadata = { ...metadata, annotations: newAnnotations }
            fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metadata: updatedMetadata }),
            }).then(r => {
              if (r.ok) toast.success("Adnotare salvată cu succes!")
              else toast.error("Eroare la salvarea adnotării.")
            }).catch(e => {
              console.error(e)
              toast.error("Eroare la salvarea adnotării.")
            })
          }} 
          onDeleteAnnotation={(annDate) => {
            const newAnnotations = annotations.filter(a => a.date !== annDate)
            setAnnotations(newAnnotations)
            const updatedMetadata = { ...metadata, annotations: newAnnotations }
            fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metadata: updatedMetadata }),
            }).then(r => {
              if (r.ok) toast.success("Adnotare ștearsă cu succes!")
              else toast.error("Eroare la ștergerea adnotării.")
            }).catch(e => {
              console.error(e)
              toast.error("Eroare la ștergerea adnotării.")
            })
          }}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Analiză Impact SEO (Corelație Pearson)</h2>
          <p className="text-sm text-muted-foreground">Descoperă matematic care eforturi îți aduc cel mai mare impact în Google.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Controls & Global Stats */}
        <div className="space-y-6">
          <div className="bg-surface border border-border p-5 rounded-xl">
            <h3 className="font-semibold text-foreground mb-4">Setări Grafic</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2 block">X-Axis (Efort / Resurse)</label>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  <button onClick={() => setXAxis("internal")} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${xAxis === "internal" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Interne</button>
                  <button onClick={() => setXAxis("external")} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${xAxis === "external" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Externe</button>
                  <button onClick={() => setXAxis("rank")} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${xAxis === "rank" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Rank (Auth)</button>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2 block">Y-Axis (Performanță / Rezultat)</label>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  <button onClick={() => setYAxis("clicks")} className={`flex-1 text-sm py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${yAxis === "clicks" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}><MousePointerClick size={14}/> Clicks</button>
                  <button onClick={() => setYAxis("impressions")} className={`flex-1 text-sm py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${yAxis === "impressions" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}><Eye size={14}/> Afișări</button>
                  <button onClick={() => setYAxis("position")} className={`flex-1 text-sm py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${yAxis === "position" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}><Hash size={14}/> Poziție</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border p-5 rounded-xl">
            <h3 className="font-semibold text-foreground mb-4">Matrice Corelație (GSC)</h3>
            <div className="space-y-3">
              {stats && Object.entries(stats).map(([kpi, factors]) => (
                <div key={kpi} className="space-y-1 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{kpi}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Interne</div>
                      <div className={`font-medium text-sm ${(kpi === 'position' ? factors.internal < -0.3 : factors.internal > 0.3) ? 'text-success' : 'text-foreground'}`}>{formatPercent(factors.internal)}</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Externe</div>
                      <div className={`font-medium text-sm ${(kpi === 'position' ? factors.external < -0.3 : factors.external > 0.3) ? 'text-success' : 'text-foreground'}`}>{formatPercent(factors.external)}</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Rank</div>
                      <div className={`font-medium text-sm ${(kpi === 'position' ? factors.rank < -0.3 : factors.rank > 0.3) ? 'text-success' : 'text-foreground'}`}>{formatPercent(factors.rank)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Scatter Plot */}
        <div className="lg:col-span-2 bg-surface border border-border p-5 rounded-xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary"/> 
              Analiză Performanță Pagini
            </h3>
            <div className="flex items-center gap-3">
              <div className={`hidden md:block px-2 py-1 rounded text-xs font-semibold ${isStrong ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                Scor Impact: {formatPercent(currentCorrelation)}
              </div>
              <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50">
                <button onClick={() => setViewMode("chart")} className={`p-1.5 rounded-md transition-all ${viewMode === "chart" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Afișare Grafic">
                  <BarChart size={14} />
                </button>
                <button onClick={() => setViewMode("table")} className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Afișare Tabel">
                  <Table size={14} />
                </button>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            {insightText} Fiecare punct reprezintă un URL unic de pe site-ul tău.
          </p>
          
          <div className="flex-1 min-h-[400px]">
            {viewMode === "chart" ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      type="number" 
                      dataKey={xAxis} 
                      name={xAxis === 'internal' ? 'Link-uri Interne' : xAxis === 'external' ? 'Link-uri Externe' : 'Page Rank'} 
                      stroke="hsl(var(--border))"
                      tick={{ fill: "#e4e4e7", fontSize: 13, fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1.5 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey={yAxis} 
                      name={yAxis === 'clicks' ? 'Click-uri' : yAxis === 'impressions' ? 'Afișări' : 'Poziție'} 
                      stroke="hsl(var(--border))"
                      tick={{ fill: "#e4e4e7", fontSize: 13, fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1.5 }}
                      reversed={yAxis === 'position'} // position 1 is at the top
                    />
                    <ZAxis type="number" range={[150, 150]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={mergedData} fill="#3b82f6">
                      {mergedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.8} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                
                <div className="mt-2 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground border-t border-border/50 pt-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#3b82f6]/80 block"></span>
                    <span>1 Punct = 1 URL</span>
                  </div>
                  <div className="flex gap-6 mt-2 md:mt-0">
                    <div>
                      <strong className="text-foreground">Axa X (Jos):</strong> {xAxis === 'internal' ? 'Link-uri Interne' : xAxis === 'external' ? 'Backlink-uri Externe' : 'Page Rank'}
                    </div>
                    <div>
                      <strong className="text-foreground">Axa Y (Stânga):</strong> {yAxis === 'clicks' ? 'Click-uri' : yAxis === 'impressions' ? 'Afișări' : 'Poziție Medie'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="border border-border rounded-lg flex flex-col">
                <div className="overflow-x-auto rounded-t-lg">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-surface shadow-sm z-10">
                      <tr className="bg-background/80 backdrop-blur-md text-muted-foreground border-b border-border">
                        <th className="py-3 px-4 font-medium w-12 text-center text-muted-foreground/70">
                          #
                        </th>
                        <th className="py-3 px-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleTableSort('path')}>
                          <div className="flex items-center gap-1">Pagina (URL) <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${xAxis === 'internal' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('internal')}>
                          <div className="flex items-center justify-end gap-1">Interne <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${xAxis === 'external' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('external')}>
                          <div className="flex items-center justify-end gap-1">Externe <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${xAxis === 'rank' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('rank')}>
                          <div className="flex items-center justify-end gap-1">Rank <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${yAxis === 'clicks' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('clicks')}>
                          <div className="flex items-center justify-end gap-1">Clicks <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${yAxis === 'impressions' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('impressions')}>
                          <div className="flex items-center justify-end gap-1">Afișări <ArrowUpDown size={12}/></div>
                        </th>
                        <th className={`py-3 px-4 font-medium text-right cursor-pointer hover:text-foreground ${yAxis === 'position' ? 'text-foreground' : ''}`} onClick={() => handleTableSort('position')}>
                          <div className="flex items-center justify-end gap-1">Poziție <ArrowUpDown size={12}/></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sortedData = [...mergedData].sort((a, b) => {
                          let aVal = a[tableSortCol]
                          let bVal = b[tableSortCol]
                          if (typeof aVal === "string" && typeof bVal === "string") {
                            return tableSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                          }
                          return tableSortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
                        })
                        
                        const totalPages = Math.ceil(sortedData.length / tableRowsPerPage)
                        const paginatedData = sortedData.slice((tablePage - 1) * tableRowsPerPage, tablePage * tableRowsPerPage)

                        return (
                          <>
                            {paginatedData.map((row, i) => (
                              <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                                <td className="py-2 px-4 text-center text-xs text-muted-foreground/50 font-medium">
                                  {(tablePage - 1) * tableRowsPerPage + i + 1}
                                </td>
                                <td className="py-2 px-4 font-medium max-w-[200px] truncate text-primary" title={row.path}>{row.path}</td>
                                <td className={`py-2 px-4 text-right ${xAxis === 'internal' ? 'font-semibold' : ''}`}>{row.internal}</td>
                                <td className={`py-2 px-4 text-right ${xAxis === 'external' ? 'font-semibold' : ''}`}>{row.external}</td>
                                <td className={`py-2 px-4 text-right ${xAxis === 'rank' ? 'font-semibold' : ''}`}>{row.rank}</td>
                                <td className={`py-2 px-4 text-right ${yAxis === 'clicks' ? 'font-semibold' : ''}`}>{row.clicks}</td>
                                <td className={`py-2 px-4 text-right ${yAxis === 'impressions' ? 'font-semibold' : ''}`}>{row.impressions}</td>
                                <td className={`py-2 px-4 text-right ${yAxis === 'position' ? 'font-semibold' : ''}`}>{row.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-3 border-t border-border bg-surface text-sm">
                  <div className="text-muted-foreground">
                    Pagina {tablePage} din {Math.max(1, Math.ceil(mergedData.length / tableRowsPerPage))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      className="px-3 py-1.5 rounded-md border border-border disabled:opacity-50 hover:bg-muted transition-colors disabled:hover:bg-transparent"
                    >
                      Anterior
                    </button>
                    <button 
                      onClick={() => setTablePage(p => Math.min(Math.ceil(mergedData.length / tableRowsPerPage), p + 1))}
                      disabled={tablePage === Math.ceil(mergedData.length / tableRowsPerPage) || mergedData.length === 0}
                      className="px-3 py-1.5 rounded-md border border-border disabled:opacity-50 hover:bg-muted transition-colors disabled:hover:bg-transparent"
                    >
                      Următor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
