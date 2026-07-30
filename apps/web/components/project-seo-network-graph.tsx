"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ForceGraph2D from "react-force-graph-2d"
import { Loader2, Maximize2 } from "lucide-react"

interface NetworkGraphProps {
  wpPosts: any[]
}

export default function ProjectSeoNetworkGraph({ wpPosts }: NetworkGraphProps) {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>()
  const initialZoomDone = useRef(false)

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  
  // Resize observer to update graph dimensions
  useEffect(() => {
    if (!containerRef.current) return
    
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width, height })
      }
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Process data to build graph
  useEffect(() => {
    if (!wpPosts || wpPosts.length === 0) return

    setLoading(true)
    
    // Use setTimeout to not block the main thread during heavy parsing
    setTimeout(() => {
      try {
        console.log("Starting network graph processing for", wpPosts.length, "posts");
        const nodes: any[] = []
        const links: any[] = []
        
        // Map for quick lookup
        const urlToPostId = new Map<string, string>()
        
        // 1. Create nodes
        wpPosts.forEach(post => {
          if (!post) return
          
          let path = ''
          try {
            if (post.link) {
              path = new URL(post.link).pathname.replace(/\/$/, '')
              urlToPostId.set(path, post.id)
              urlToPostId.set(post.link, post.id)
              urlToPostId.set(decodeURIComponent(post.link), post.id)
            }
          } catch(e) {}

          nodes.push({
            id: post.id,
            name: decodeHtmlEntity(post.title?.rendered || 'Fără titlu'),
            url: post.link,
            val: 1, // base size
            color: '#3b82f6', // default blue
            incoming: 0,
            outgoing: 0,
            gscMetrics: post.gscMetrics || { clicks: 0, impressions: 0, position: 0 }
          })
        })
        
        console.log("Nodes created:", nodes.length);

        // 2. Extract links from content
        wpPosts.forEach(post => {
          if (!post || !post.content?.rendered) return
          
          const content = post.content.rendered
          const linkRegex = /href=["'](.*?)["']/gi
          
          let match
          let safeCounter = 0;
          while ((match = linkRegex.exec(content)) !== null) {
            safeCounter++;
            if (safeCounter > 10000) {
                console.error("Infinite loop detected in link extraction");
                break;
            }
            const href = match[1]
            if (!href || href.startsWith('#')) continue
            
            let targetPath = ''
            try {
              if (href.startsWith('http')) {
                targetPath = new URL(href).pathname.replace(/\/$/, '')
              } else {
                targetPath = href.split('?')[0].split('#')[0].replace(/\/$/, '')
              }
            } catch(e) {
              targetPath = href
            }

            const targetId = urlToPostId.get(targetPath) || urlToPostId.get(href)
            
            // If the link points to another post in our system (and not itself)
            if (targetId && targetId !== post.id) {
              // Check if link already exists to avoid duplicates
              const existingLink = links.find(l => l.source === post.id && l.target === targetId)
              if (!existingLink) {
                links.push({
                  source: post.id,
                  target: targetId,
                  value: 1 // Link weight
                })
              } else {
                existingLink.value += 1
              }
            }
          }
        })
        
        console.log("Links extracted:", links.length);

        // 3. Calculate node weights based on incoming links
        links.forEach(link => {
          const targetNode = nodes.find(n => n.id === link.target)
          const sourceNode = nodes.find(n => n.id === link.source)
          
          if (targetNode) {
            targetNode.incoming += link.value
            targetNode.val = 1 + (targetNode.incoming * 0.5)
            
            if (targetNode.incoming > 10) targetNode.color = '#ef4444' // red
            else if (targetNode.incoming > 5) targetNode.color = '#f97316' // orange
            else if (targetNode.incoming > 2) targetNode.color = '#eab308' // yellow
            else targetNode.color = '#22c55e' // green
          }
          
          if (sourceNode) {
            sourceNode.outgoing += link.value
          }
        })
        
        // Identify orphan nodes
        nodes.forEach(node => {
          if (node.incoming === 0 && node.outgoing === 0) {
            node.color = '#9ca3af' // gray for orphans
            node.val = 0.5
          }
        })

        console.log("Graph data ready. Updating state. Nodes with traffic:", nodes.filter(n => n.gscMetrics?.impressions > 0).map(n => ({ name: n.name, imp: n.gscMetrics.impressions })));
        setGraphData({ nodes, links })
      } catch (err) {
        console.error("Error building network graph data:", err)
      } finally {
        setLoading(false)
      }
    }, 100)
  }, [wpPosts])

  // Tune physics forces to spread the graph out more
  useEffect(() => {
    if (fgRef.current && !loading && graphData.nodes.length > 0) {
      fgRef.current.d3Force('charge').strength(-400) // Increase repulsion significantly
      fgRef.current.d3Force('link').distance(80)     // Increase link distance
      fgRef.current.d3ReheatSimulation()
    }
  }, [loading, graphData])

  const handleZoomToFit = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50)
    }
  }, [])

  function decodeHtmlEntity(html: string) {
    if (typeof document === 'undefined') return html;
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 bg-muted/10 rounded-xl border border-border">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-muted-foreground font-medium">Se analizează structura de interlinkare...</p>
      </div>
    )
  }

  // Metrics Calculations
  const topHubs = [...graphData.nodes].sort((a, b) => b.incoming - a.incoming).slice(0, 3)
  const sleepingGiants = [...graphData.nodes]
    .filter(n => n.gscMetrics && n.gscMetrics.impressions > 100 && n.incoming <= 2)
    .sort((a, b) => b.gscMetrics.impressions - a.gscMetrics.impressions)
    .slice(0, 3)
  
  const selectedNode = selectedNodeId ? graphData.nodes.find(n => n.id === selectedNodeId) : null
  
  const incomingLinksToSelected = selectedNodeId 
    ? graphData.links.filter(l => (typeof l.target === 'object' ? l.target.id : l.target) === selectedNodeId)
        .map(l => graphData.nodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source)))
        .filter(Boolean)
    : []
    
  const outgoingLinksFromSelected = selectedNodeId
    ? graphData.links.filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === selectedNodeId)
        .map(l => graphData.nodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target)))
        .filter(Boolean)
    : []
  const calculateCorrelation = (x: number[], y: number[]) => {
    if (x.length === 0 || y.length === 0 || x.length !== y.length) return null
    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    if (denominator === 0) return 0
    return numerator / denominator
  }

  // Correlation metrics
  const nodesWithTraffic = graphData.nodes.filter(n => n.gscMetrics && n.gscMetrics.impressions > 0)
  const internalLinksArray = nodesWithTraffic.map(n => n.incoming)
  const externalLinksArray = nodesWithTraffic.map(n => n.backlinksData?.backlinks || 0)
  const totalLinksArray = nodesWithTraffic.map(n => n.incoming + (n.backlinksData?.backlinks || 0))
  const impressionsArray = nodesWithTraffic.map(n => n.gscMetrics.impressions)
  
  const internalCorr = calculateCorrelation(internalLinksArray, impressionsArray)
  const totalCorr = calculateCorrelation(totalLinksArray, impressionsArray)

  const renderCorrelationWidget = (title: string, corr: number | null) => {
    if (corr === null) return <div className="text-sm text-muted-foreground">Nu există date suficiente.</div>
    const percentage = Math.round(corr * 100)
    let colorClass = "text-yellow-500"
    let label = "Neutră"
    if (percentage > 50) { colorClass = "text-green-500"; label = "Puternică" }
    else if (percentage > 20) { colorClass = "text-emerald-400"; label = "Moderată" }
    else if (percentage < -20) { colorClass = "text-red-400"; label = "Negativă" }

    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="text-right">
          <div className={`text-lg font-bold ${colorClass}`}>{percentage}%</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    )
  }

  // Node Detail View (Sidebar)
  const renderNodeDetail = () => {
    const node = graphData.nodes.find(n => n.id === selectedNodeId)
    if (!node) return null
    
    const nodeIncomingLinks = graphData.links.filter(l => l.target === selectedNodeId)
    const nodeOutgoingLinks = graphData.links.filter(l => l.source === selectedNodeId)
    
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground truncate mr-2" title={node.name}>{node.name}</h3>
          <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-white/5 rounded text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Afișări (GSC)</div>
              <div className="font-semibold text-foreground text-lg">{node.gscMetrics?.impressions?.toLocaleString() || 0}</div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Click-uri (GSC)</div>
              <div className="font-semibold text-foreground text-lg">{node.gscMetrics?.clicks?.toLocaleString() || 0}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Link-uri Interne (Inbound)</div>
              <div className="font-semibold text-blue-400 text-lg">{node.incoming}</div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Backlinks Externe</div>
              <div className="font-semibold text-emerald-400 text-lg">{node.backlinksData?.backlinks || 0}</div>
              {node.backlinksData?.rank > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">Page Rank: {node.backlinksData.rank}</div>}
            </div>
          </div>
          
          {incomingLinksToSelected.length > 0 && (
            <div className="mb-6">
              <h5 className="font-semibold text-sm mb-2 text-foreground">Primește forță de la:</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {incomingLinksToSelected.map((n: any) => (
                  <div key={n.id} className="text-xs p-2 bg-surface border border-border rounded cursor-pointer hover:border-primary/50" onClick={() => setSelectedNodeId(n.id)}>
                    {n.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {outgoingLinksFromSelected.length > 0 && (
            <div className="mb-6">
              <h5 className="font-semibold text-sm mb-2 text-foreground">Împarte forță către:</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {outgoingLinksFromSelected.map((n: any) => (
                  <div key={n.id} className="text-xs p-2 bg-surface border border-border rounded cursor-pointer hover:border-primary/50" onClick={() => setSelectedNodeId(n.id)}>
                    {n.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full h-full min-h-[600px] bg-surface overflow-hidden">
      {/* LEFT: Canvas */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button 
            onClick={handleZoomToFit}
            className="bg-background/80 backdrop-blur border border-border text-foreground p-2 rounded-lg hover:bg-muted shadow-sm transition-colors"
            title="Zoom to fit"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur border border-border rounded-lg p-3 shadow-sm text-xs">
          <h4 className="font-semibold mb-2 border-b border-border pb-1">Legendă Hub-uri</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span>Foarte Puternic (&gt;10 link-uri)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f97316]"></div><span>Puternic (&gt;5 link-uri)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eab308]"></div><span>Mediu (&gt;2 link-uri)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22c55e]"></div><span>Slab (1-2 link-uri)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#9ca3af]"></div><span>Orfan (0 link-uri)</span></div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex justify-between items-center text-muted-foreground">
            <span>Noduri: <b>{graphData.nodes.length}</b></span>
            <span>Legături: <b>{graphData.links.length}</b></span>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel={(node: any) => `
                <div class="bg-background text-foreground p-2 rounded shadow-xl border border-border text-xs max-w-[200px]">
                  <strong class="block mb-1">${node.name}</strong>
                  <div class="text-muted-foreground">In: ${node.incoming} | Out: ${node.outgoing}</div>
                </div>
              `}
              nodeColor={(node: any) => node.id === selectedNodeId ? '#a855f7' : node.color}
              nodeVal={(node: any) => node.id === selectedNodeId ? node.val * 1.5 : node.val}
              linkColor={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (sId === selectedNodeId || tId === selectedNodeId) return '#a855f7';
                return '#4b556380';
              }}
              linkWidth={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (sId === selectedNodeId || tId === selectedNodeId) return 3;
                return Math.min(3, 1 + (link.value || 1) * 0.2);
              }}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={(node: any) => {
                setSelectedNodeId(node.id)
                if (fgRef.current) {
                  fgRef.current.centerAt(node.x, node.y, 1000)
                  fgRef.current.zoom(4, 2000)
                }
              }}
              onBackgroundClick={() => {
                setSelectedNodeId(null)
                if (fgRef.current) {
                  fgRef.current.zoom(2.5, 1000)
                  fgRef.current.centerAt(0, 0, 1000)
                }
              }}
              cooldownTicks={100}
              onEngineStop={() => {
                if (fgRef.current && !initialZoomDone.current) {
                  initialZoomDone.current = true;
                  fgRef.current.zoom(2.5, 400)
                  fgRef.current.centerAt(0, 0, 400)
                }
              }}
            />
          )}
        </div>
      </div>

      {/* RIGHT: Side Panel */}
      <div className="w-[350px] shrink-0 border-l border-border bg-background flex flex-col h-full overflow-hidden text-sm">
        <div className="p-4 border-b border-border bg-surface shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            📊 GSC Insights
          </h3>
          <p className="text-muted-foreground text-xs mt-1">Impactul link-urilor în SEO</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!selectedNodeId ? (
            // OVERVIEW STATE
            <>
              {/* Correlation Widgets */}
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-foreground mb-2">Corelație Trafic</h4>
                {renderCorrelationWidget("Link-uri Interne vs Afișări", internalCorr)}
                {renderCorrelationWidget("Total Link-uri vs Afișări", totalCorr)}
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Top Hub-uri (Ancore)
                </h4>
                <div className="space-y-3">
                  {topHubs.map(n => (
                    <div key={n.id} className="p-3 bg-surface border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedNodeId(n.id)}>
                      <div className="font-medium text-primary line-clamp-2 leading-tight mb-2">{n.name}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>🔗 {n.incoming} In | {n.backlinksData?.backlinks || 0} Ex</span>
                        <span className="font-medium text-foreground">👁️ {n.gscMetrics?.impressions?.toLocaleString() || 0} afișări</span>
                      </div>
                    </div>
                  ))}
                  {topHubs.length === 0 && <p className="text-xs text-muted-foreground">Nu există date suficiente.</p>}
                </div>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Giganți Adormiți (Oportunități)
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Articole cu trafic/afișări în GSC dar care NU primesc link-uri interne. 
                  Dacă le adaugi link-uri, le poți împinge pe pagina 1.
                </p>
                <div className="space-y-3">
                  {sleepingGiants.map(n => (
                    <div key={n.id} className="p-3 bg-surface border border-border rounded-lg border-l-4 border-l-blue-500 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedNodeId(n.id)}>
                      <div className="font-medium text-blue-500 line-clamp-2 leading-tight mb-2">{n.name}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="text-red-400 font-medium">⚠️ {n.incoming} Inbound</span>
                        <span className="font-medium text-foreground">👁️ {n.gscMetrics?.impressions?.toLocaleString() || 0} afișări</span>
                      </div>
                    </div>
                  ))}
                  {sleepingGiants.length === 0 && <p className="text-xs text-muted-foreground">Nu s-au găsit oportunități clare momentan.</p>}
                </div>
              </div>
            </>
          ) : (
            // NODE DETAILS STATE
            <div className="h-full">
              {renderNodeDetail()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
