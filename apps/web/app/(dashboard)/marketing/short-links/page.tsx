"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import {
  Link2, Copy, ExternalLink, Plus, X, MousePointerClick,
  Check, Globe, Tag,
} from "lucide-react"

interface ShortLinkData {
  id: string
  code: string
  targetUrl: string
  title: string | null
  clicks: number
  createdAt: string
  businessLine: { slug: string; name: string; domain: string | null }
  campaign: { id: string; name: string } | null
}

export default function ShortLinksPage() {
  const { activeLineId, activeLine, lines } = useBusinessLine()
  const [links, setLinks] = useState<ShortLinkData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form
  const [form, setForm] = useState({
    targetUrl: "",
    title: "",
    businessLineId: "",
  })

  useEffect(() => {
    fetchLinks()
  }, [activeLineId])

  async function fetchLinks() {
    setLoading(true)
    const params = activeLineId !== "all" ? `?businessLineId=${activeLineId}` : ""
    const res = await fetch(`/api/short-links${params}`)
    const data = await res.json()
    setLinks(data.data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetUrl || !form.businessLineId) return

    const res = await fetch("/api/short-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ targetUrl: "", title: "", businessLineId: "" })
      setShowCreate(false)
      fetchLinks()
    }
  }

  function getShortUrl(link: ShortLinkData) {
    const domain = link.businessLine?.domain || "admin.asns.ro"
    return `https://${domain}/s/${link.code}`
  }

  function copyToClipboard(link: ShortLinkData) {
    navigator.clipboard.writeText(getShortUrl(link))
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            Short Links
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Link-uri scurte pentru campanii SMS · {links.length} link-uri
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Anulează" : "Link Nou"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-card border rounded-xl p-6 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Creează Short Link
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">
                URL Destinație *
              </label>
              <input
                type="url"
                required
                placeholder="https://fudly.ro/demo"
                value={form.targetUrl}
                onChange={e => setForm({ ...form, targetUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">
                Titlu (opțional)
              </label>
              <input
                type="text"
                placeholder="Demo Fudly, Promo Vară..."
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">
                Business Line *
              </label>
              <select
                required
                value={form.businessLineId}
                onChange={e => setForm({ ...form, businessLineId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Selectează...</option>
                {lines.map(bl => (
                  <option key={bl.id} value={bl.id}>{bl.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Generează Link
            </button>
          </div>
        </form>
      )}

      {/* Links Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Short URL</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Titlu</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Destinație</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">BL</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Clicks</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Niciun short link creat.</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-2 text-primary underline text-sm"
                    >
                      Creează primul link
                    </button>
                  </td>
                </tr>
              ) : (
                links.map(link => (
                  <tr key={link.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          /s/{link.code}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {link.title ? (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {link.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={link.targetUrl}
                        target="_blank"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-400 truncate max-w-[250px]"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        {link.targetUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-muted rounded tracking-wider">
                        {link.businessLine.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
                        {link.clicks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => copyToClipboard(link)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            copiedId === link.id
                              ? "bg-green-100 text-green-600"
                              : "hover:bg-muted text-muted-foreground"
                          }`}
                          title="Copiază short URL"
                        >
                          {copiedId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={getShortUrl(link)}
                          target="_blank"
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                          title="Deschide link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
