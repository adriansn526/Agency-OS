"use client"

import React, { useState } from "react"
import { X, Save, Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import { webDevMetadataSchema } from "@/lib/validations/project-metadata"
import { cn } from "@/lib/utils"

interface EditWebDevMetadataModalProps {
  project: any
  onClose: () => void
}

export function EditWebDevMetadataModal({ project, onClose }: EditWebDevMetadataModalProps) {
  const metadata = project?.metadata || {}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'links' | 'domains' | 'notes' | 'changelog'>('links')
  
  const [formData, setFormData] = useState({
    stagingUrl: metadata.stagingUrl || '',
    productionUrl: metadata.productionUrl || '',
    adminUrl: metadata.adminUrl || '',
    figmaUrl: metadata.figmaUrl || '',
    githubUrl: metadata.githubUrl || '',
    driveUrl: metadata.driveUrl || '',
    domainExpiryDate: metadata.domainExpiryDate || '',
    sslExpiryDate: metadata.sslExpiryDate || '',
    dnsProvider: metadata.dnsProvider || '',
    internalNotes: metadata.internalNotes || '',
    stack: metadata.stack ? metadata.stack.join(', ') : '',
    lighthouse: {
      performance: metadata.lighthouse?.performance || '',
      accessibility: metadata.lighthouse?.accessibility || '',
      bestPractices: metadata.lighthouse?.bestPractices || '',
      seo: metadata.lighthouse?.seo || ''
    }
  })

  const [changelog, setChangelog] = useState<Array<{date: string, message: string}>>(metadata.changelog || [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const cleanedData = {
        ...formData,
        stack: formData.stack.split(',').map((s: string) => s.trim()).filter(Boolean),
        changelog,
        lighthouse: {
          performance: formData.lighthouse.performance !== '' ? Number(formData.lighthouse.performance) : undefined,
          accessibility: formData.lighthouse.accessibility !== '' ? Number(formData.lighthouse.accessibility) : undefined,
          bestPractices: formData.lighthouse.bestPractices !== '' ? Number(formData.lighthouse.bestPractices) : undefined,
          seo: formData.lighthouse.seo !== '' ? Number(formData.lighthouse.seo) : undefined,
          updatedAt: new Date().toISOString()
        }
      }

      // Validare Zod
      const validatedMetadata = webDevMetadataSchema.parse({
        ...metadata, // Preserve existing metadata properties like tasks, timeEntries, etc.
        ...cleanedData
      })

      // Update in DB
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: validatedMetadata }),
      })

      if (!res.ok) throw new Error('Eroare la salvare')
      
      // Reload page to show changes
      window.location.reload()
      
    } catch (err: any) {
      console.error(err)
      if (err.errors) {
        // Zod validation error
        setError("Eroare validare: " + err.errors.map((e: any) => e.message).join(", "))
      } else {
        setError(err.message || 'A apărut o eroare la salvare')
      }
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name.startsWith('lh_')) {
      const field = name.replace('lh_', '')
      setFormData(prev => ({
        ...prev,
        lighthouse: { ...prev.lighthouse, [field]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <h2 className="text-lg font-semibold text-foreground">Editează Setări Web Dev</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="flex border-b border-border mb-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={cn("px-4 py-2 text-sm font-medium whitespace-nowrap", activeTab === 'links' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              Medii & Resurse
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('domains')}
              className={cn("px-4 py-2 text-sm font-medium whitespace-nowrap", activeTab === 'domains' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              Domenii & SSL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={cn("px-4 py-2 text-sm font-medium whitespace-nowrap", activeTab === 'notes' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              Note Interne & Stack
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('changelog')}
              className={cn("px-4 py-2 text-sm font-medium whitespace-nowrap", activeTab === 'changelog' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              Changelog
            </button>
          </div>

          <form id="webdev-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'links' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase border-b border-border pb-2">Linkuri Medii</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Production URL (Live)</label>
                      <input type="url" name="productionUrl" value={formData.productionUrl} onChange={handleChange} placeholder="https://example.com" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Staging URL (Test)</label>
                      <input type="url" name="stagingUrl" value={formData.stagingUrl} onChange={handleChange} placeholder="https://staging.example.com" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Admin / CMS URL</label>
                      <input type="url" name="adminUrl" value={formData.adminUrl} onChange={handleChange} placeholder="https://example.com/wp-admin" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase border-b border-border pb-2">Resurse Echipa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Figma URL</label>
                      <input type="url" name="figmaUrl" value={formData.figmaUrl} onChange={handleChange} placeholder="https://figma.com/file/..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">GitHub/GitLab URL</label>
                      <input type="url" name="githubUrl" value={formData.githubUrl} onChange={handleChange} placeholder="https://github.com/..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-foreground">Google Drive (Assets)</label>
                      <input type="url" name="driveUrl" value={formData.driveUrl} onChange={handleChange} placeholder="https://drive.google.com/..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase border-b border-border pb-2">Scoruri Lighthouse (0-100)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Performance</label>
                      <input type="number" min="0" max="100" name="lh_performance" value={formData.lighthouse.performance} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-center" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Accessibility</label>
                      <input type="number" min="0" max="100" name="lh_accessibility" value={formData.lighthouse.accessibility} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-center" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Best Practices</label>
                      <input type="number" min="0" max="100" name="lh_bestPractices" value={formData.lighthouse.bestPractices} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-center" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">SEO</label>
                      <input type="number" min="0" max="100" name="lh_seo" value={formData.lighthouse.seo} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-center" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'domains' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase border-b border-border pb-2">Domeniu și Securitate</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Dată Expirare Domeniu</label>
                      <input type="date" name="domainExpiryDate" value={formData.domainExpiryDate} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Dată Expirare SSL</label>
                      <input type="date" name="sslExpiryDate" value={formData.sslExpiryDate} onChange={handleChange} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-foreground">Provider DNS / Hosting</label>
                      <input type="text" name="dnsProvider" value={formData.dnsProvider} onChange={handleChange} placeholder="ex: Cloudflare, RoHost" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                      <p className="text-[10px] text-muted-foreground">Acest câmp este vizibil doar intern.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase border-b border-border pb-2 flex items-center justify-between">
                    <span>Note Interne & Stack</span>
                  </h3>
                  
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2 items-start mb-4">
                    <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ NU stocați parole sau credențiale aici. Datele nu sunt criptate și sunt vizibile în payload-ul API.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Stack Tehnologic (separate prin virgulă)</label>
                    <input type="text" name="stack" value={formData.stack} onChange={handleChange} placeholder="Next.js, Tailwind, Prisma" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Note Interne (Detalii Tehnice)</label>
                    <textarea name="internalNotes" value={formData.internalNotes} onChange={handleChange} rows={5} placeholder="Detalii tehnice despre arhitectură, limitări cunoscute etc." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-y" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'changelog' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Istoric Livrări</h3>
                  <button type="button" onClick={() => setChangelog([{ date: new Date().toISOString().split('T')[0] || '', message: '' }, ...changelog])} className="text-xs flex items-center gap-1 text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded">
                    <Plus size={14} /> Adaugă Log
                  </button>
                </div>
                
                <div className="space-y-3">
                  {changelog.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nu există log-uri înregistrate.</p>
                  ) : (
                    changelog.map((log, index) => (
                      <div key={index} className="flex gap-2 items-start bg-muted/20 p-3 rounded-lg border border-border">
                        <input
                          type="date"
                          value={log.date}
                          onChange={(e) => {
                            const newChangelog = [...changelog]
                            if (newChangelog[index]) {
                              newChangelog[index].date = e.target.value
                              setChangelog(newChangelog)
                            }
                          }}
                          className="text-sm bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary w-36"
                        />
                        <input
                          type="text"
                          value={log.message}
                          onChange={(e) => {
                            const newChangelog = [...changelog]
                            if (newChangelog[index]) {
                              newChangelog[index].message = e.target.value
                              setChangelog(newChangelog)
                            }
                          }}
                          placeholder="Ex: Lansare Faza 1"
                          className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setChangelog(changelog.filter((_, i) => i !== index))}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
          </form>
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border hover:bg-muted rounded-lg transition-colors"
          >
            Anulează
          </button>
          <button
            type="submit"
            form="webdev-form"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? "Se salvează..." : "Salvează Modificări"}
          </button>
        </div>
      </div>
    </div>
  )
}
