"use client"

import React, { useState } from "react"
import { ExternalLink, Github, Figma, Database, AlertCircle, Layout, Activity, Server, FileText, CheckCircle2, Cloud, HardDrive, Edit } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { ProjectCardConfig } from "@/lib/project-types/config"
import { EditWebDevMetadataModal } from "./edit-webdev-metadata-modal"

interface WebDevDashboardProps {
  project: any
  cardsConfig: ProjectCardConfig[]
}

const pipelineStages = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'design', label: 'Design' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'backend', label: 'Backend' },
  { id: 'qa', label: 'Testing & QA' },
  { id: 'launch', label: 'Lansare' }
]

export function WebDevDashboard({ project, cardsConfig }: WebDevDashboardProps) {
  const metadata = project?.metadata || {}
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Find which cards are active/visible
  const hasCard = (id: string) => cardsConfig.some(c => c.id === id)
  
  // Pipeline logic based on checklist completion (basic heuristic for MVP)
  const checklist = metadata.checklist || []
  const totalItems = checklist.length
  const completedItems = checklist.filter((c: any) => c.done).length
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  
  // Determine current active pipeline stage based on progress
  let activeStageIndex = 0
  if (progressPct === 100) activeStageIndex = 5 // Launch
  else if (progressPct >= 80) activeStageIndex = 4 // QA
  else if (progressPct >= 60) activeStageIndex = 3 // Backend
  else if (progressPct >= 40) activeStageIndex = 2 // Frontend
  else if (progressPct >= 10) activeStageIndex = 1 // Design

  // Use explicitly set stage from metadata if available
  if (metadata.pipelineStage) {
    const stageIdx = pipelineStages.findIndex(s => s.id === metadata.pipelineStage)
    if (stageIdx !== -1) activeStageIndex = stageIdx
  }

  const getLighthouseColor = (score?: number) => {
    if (score === undefined) return "text-muted-foreground border-border"
    if (score >= 90) return "text-success border-success"
    if (score >= 50) return "text-warning border-warning"
    return "text-destructive border-destructive"
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Web Development Dashboard</h2>
        <button 
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
        >
          <Edit size={14} /> Editează Setări
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Quick Links Card */}
        {hasCard('quick-links') && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden col-span-1 lg:col-span-2">
            <div className="p-4 bg-muted/20 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Cloud size={16} className="text-primary" /> Medii & Resurse
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public/Client facing links */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Live URLs</p>
                <div className="space-y-2">
                  <a 
                    href={metadata.productionUrl || '#'} 
                    target={metadata.productionUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      metadata.productionUrl ? "bg-success/5 border-success/20 hover:border-success/40" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center text-success">
                        <Activity size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Producție (Live)</p>
                        <p className="text-[10px] text-muted-foreground truncate w-32">{metadata.productionUrl || 'N/A'}</p>
                      </div>
                    </div>
                    {metadata.productionUrl && <ExternalLink size={14} className="text-muted-foreground" />}
                  </a>

                  <a 
                    href={metadata.stagingUrl || '#'} 
                    target={metadata.stagingUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      metadata.stagingUrl ? "bg-warning/5 border-warning/20 hover:border-warning/40" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-warning/10 flex items-center justify-center text-warning">
                        <Layout size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Staging (Testare)</p>
                        <p className="text-[10px] text-muted-foreground truncate w-32">{metadata.stagingUrl || 'N/A'}</p>
                      </div>
                    </div>
                    {metadata.stagingUrl && <ExternalLink size={14} className="text-muted-foreground" />}
                  </a>
                </div>
              </div>

              {/* Internal/Team resources */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Resurse Interne</p>
                <div className="space-y-2">
                  <a 
                    href={metadata.adminUrl || '#'} 
                    target={metadata.adminUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs",
                      metadata.adminUrl ? "bg-background hover:bg-muted/50 border-border" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Database size={14} className={metadata.adminUrl ? "text-blue-400" : "text-muted-foreground"} />
                    <span className="font-medium flex-1">Admin / CMS</span>
                    {metadata.adminUrl && <ExternalLink size={12} className="text-muted-foreground" />}
                  </a>
                  <a 
                    href={metadata.figmaUrl || '#'} 
                    target={metadata.figmaUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs",
                      metadata.figmaUrl ? "bg-background hover:bg-muted/50 border-border" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Figma size={14} className={metadata.figmaUrl ? "text-purple-400" : "text-muted-foreground"} />
                    <span className="font-medium flex-1">Design Figma</span>
                    {metadata.figmaUrl && <ExternalLink size={12} className="text-muted-foreground" />}
                  </a>
                  <a 
                    href={metadata.githubUrl || '#'} 
                    target={metadata.githubUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs",
                      metadata.githubUrl ? "bg-background hover:bg-muted/50 border-border" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Github size={14} className={metadata.githubUrl ? "text-foreground" : "text-muted-foreground"} />
                    <span className="font-medium flex-1">Repository</span>
                    {metadata.githubUrl && <ExternalLink size={12} className="text-muted-foreground" />}
                  </a>
                  <a 
                    href={metadata.driveUrl || '#'} 
                    target={metadata.driveUrl ? "_blank" : undefined}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs",
                      metadata.driveUrl ? "bg-background hover:bg-muted/50 border-border" : "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <HardDrive size={14} className={metadata.driveUrl ? "text-green-400" : "text-muted-foreground"} />
                    <span className="font-medium flex-1">Google Drive (Assets)</span>
                    {metadata.driveUrl && <ExternalLink size={12} className="text-muted-foreground" />}
                  </a>
                </div>
              </div>
            </div>
            
            {/* Empty State Help */}
            {(!metadata.productionUrl && !metadata.stagingUrl && !metadata.adminUrl && !metadata.figmaUrl && !metadata.githubUrl && !metadata.driveUrl) && (
              <div className="px-4 pb-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Nu ai configurat încă niciun URL. Apasă pe "Editează Setări" pentru a adăuga link-uri către medii și resurse.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Infrastructure Card (Internal Only) */}
        {hasCard('infrastructure') && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden col-span-1">
             <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Server size={16} className="text-muted-foreground" /> Infrastructură
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground uppercase">Doar Intern</span>
            </div>
            
            <div className="p-4 bg-[#0d1117] text-[#c9d1d9] font-mono text-xs h-full min-h-[220px]">
              <div className="flex items-center justify-between mb-3 border-b border-[#30363d] pb-2">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Deploy Status</span>
                <span className="text-green-400">Ready</span>
              </div>
              <div className="space-y-2 opacity-80">
                <p className="flex justify-between"><span>Branch:</span> <span className="text-[#58a6ff]">main</span></p>
                <p className="flex justify-between"><span>Commit:</span> <span>fix: responsive grid layout</span></p>
                <p className="flex justify-between"><span>Uptime:</span> <span className="text-green-400">99.98%</span></p>
                <p className="flex justify-between"><span>Last Deploy:</span> <span>Acum 2 ore</span></p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-[#30363d] text-center">
                <p className="text-[10px] text-[#8b949e] italic inline-flex items-center gap-1">
                  <AlertCircle size={10} /> Date demonstrative (Integrare în V2)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Card */}
        {hasCard('pipeline') && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden col-span-1 lg:col-span-3">
             <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" /> Etape Dezvoltare
              </h3>
            </div>
            <div className="p-6">
              <div className="relative">
                {/* Progress bar background */}
                <div className="absolute top-1/2 left-0 w-full h-1.5 bg-muted -translate-y-1/2 rounded-full"></div>
                
                {/* Active progress bar */}
                <div 
                  className="absolute top-1/2 left-0 h-1.5 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${(activeStageIndex / (pipelineStages.length - 1)) * 100}%` }}
                ></div>
                
                {/* Stages */}
                <div className="relative flex justify-between">
                  {pipelineStages.map((stage, idx) => {
                    const isCompleted = idx < activeStageIndex
                    const isActive = idx === activeStageIndex
                    
                    return (
                      <div key={stage.id} className="flex flex-col items-center">
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors bg-background",
                            isCompleted ? "border-primary text-primary" : 
                            isActive ? "border-primary bg-primary/10 text-primary" : 
                            "border-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-medium mt-2 whitespace-nowrap absolute top-full pt-1",
                          isActive ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                          {stage.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="mt-12 text-center text-[10px] text-muted-foreground">
                Progres calculat automat pe baza checklist-ului de proiect.
              </div>
            </div>
          </div>
        )}

        {/* Lighthouse Card */}
        {hasCard('lighthouse') && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden col-span-1 lg:col-span-3">
             <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity size={16} className="text-info" /> Scor Performanță (Lighthouse)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-warning/10 text-warning border border-warning/20">
                {metadata.lighthouse?.updatedAt ? `Actualizat manual: ${formatDate(metadata.lighthouse.updatedAt)}` : 'Necesită actualizare manuală'}
              </span>
            </div>
            
            <div className="p-6">
              {metadata.lighthouse && (metadata.lighthouse.performance !== undefined || metadata.lighthouse.seo !== undefined) ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Performance', score: metadata.lighthouse.performance },
                    { label: 'Accessibility', score: metadata.lighthouse.accessibility },
                    { label: 'Best Practices', score: metadata.lighthouse.bestPractices },
                    { label: 'SEO', score: metadata.lighthouse.seo },
                  ].map((metric, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={cn(
                        "w-20 h-20 rounded-full border-4 flex items-center justify-center mb-3",
                        getLighthouseColor(metric.score)
                      )}>
                        <span className="text-2xl font-bold">{metric.score !== undefined ? metric.score : '-'}</span>
                      </div>
                      <span className="text-xs font-medium text-foreground">{metric.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Activity size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-foreground font-medium mb-1">Nu există date de performanță</p>
                  <p className="text-xs text-muted-foreground mb-4">Adaugă scorurile generate din Google Lighthouse.</p>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md transition-colors"
                  >
                    Actualizează Scoruri
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditWebDevMetadataModal 
          project={project} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  )
}
