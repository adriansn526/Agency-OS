"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, Bot, Key, CheckCircle2, XCircle, Loader2,
  Save, TestTube, Eye, EyeOff, Sparkles, BarChart3, Coins, Zap, Clock,
  MessageSquare,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

interface AISettings {
  provider: "openai" | "gemini"
  apiKey: string
  model?: string
  enabled: boolean
}

const PROVIDERS = [
  {
    value: "gemini" as const,
    label: "Google Gemini",
    desc: "Gratuit până la 15 req/min — gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"],
    defaultModel: "gemini-2.5-flash",
  },
  {
    value: "openai" as const,
    label: "OpenAI",
    desc: "GPT-4o — cel mai bun pentru content generation",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o",
  },
]

export default function IntegrationsPage() {
  const [ai, setAI] = useState<AISettings>({
    provider: "gemini",
    apiKey: "",
    model: "",
    enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rawKey, setRawKey] = useState("") // the actual key user typed
  const [usage, setUsage] = useState<any>(null)

  // SMSO state
  const [smso, setSMSO] = useState({ apiKey: "", sender: "", enabled: true })
  const [smsoRawKey, setSMSORawKey] = useState("")
  const [showSmsoKey, setShowSmsoKey] = useState(false)
  const [smsoSaving, setSMSOSaving] = useState(false)
  const [smsoSaved, setSMSOSaved] = useState(false)
  const [smsoTesting, setSMSOTesting] = useState(false)
  const [smsoTestResult, setSMSOTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load existing settings
  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.ai) {
          setAI({
            provider: j.data.ai.provider || "gemini",
            apiKey: j.data.ai.apiKey || "",
            model: j.data.ai.model || "",
            enabled: j.data.ai.enabled ?? true,
          })
        }
        if (j.data?.smso) {
          setSMSO({
            apiKey: j.data.smso.apiKey || "",
            sender: j.data.smso.sender || "",
            enabled: j.data.smso.enabled ?? true,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // Load usage stats
    fetch("/api/ai/usage")
      .then((r) => r.json())
      .then((j) => setUsage(j.data))
      .catch(() => {})
  }, [])

  const selectedProvider = PROVIDERS.find((p) => p.value === ai.provider)!

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setTestResult(null)
    try {
      const payload: any = {
        ai: {
          provider: ai.provider,
          enabled: ai.enabled,
          model: ai.model || selectedProvider.defaultModel,
        },
      }
      // Only send API key if user typed a new one (not the masked one)
      if (rawKey) {
        payload.ai.apiKey = rawKey
      }
      await fetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      /* noop */
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "ai",
          apiKey: rawKey || undefined,
        }),
      })
      const json = await res.json()
      if (json.data?.success) {
        setTestResult({
          success: true,
          message: `Conexiune OK — provider: ${json.data.provider}, răspuns: "${json.data.response}"`,
        })
      } else {
        setTestResult({
          success: false,
          message: json.data?.error || json.error || "Test eșuat",
        })
      }
    } catch {
      setTestResult({ success: false, message: "Eroare de rețea" })
    } finally {
      setTesting(false)
    }
  }

  const handleSMSOSave = async () => {
    setSMSOSaving(true)
    setSMSOSaved(false)
    setSMSOTestResult(null)
    try {
      const payload: any = { smso: { enabled: smso.enabled, sender: smso.sender } }
      if (smsoRawKey) payload.smso.apiKey = smsoRawKey
      await fetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setSMSOSaved(true)
      setTimeout(() => setSMSOSaved(false), 3000)
    } catch { /* noop */ }
    finally { setSMSOSaving(false) }
  }

  const handleSMSOTest = async () => {
    setSMSOTesting(true)
    setSMSOTestResult(null)
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "smso", apiKey: smsoRawKey || undefined }),
      })
      const json = await res.json()
      if (json.data?.success) {
        const senders = json.data.senders || []
        const senderInfo = senders.length > 0
          ? senders.map((s: any) => `${s.name} (${s.pricePerMessage} RON/SMS)`).join(", ")
          : "Niciun sender configurat"
        setSMSOTestResult({ success: true, message: `✅ Conexiune OK — Senderi: ${senderInfo}` })
      } else {
        setSMSOTestResult({ success: false, message: json.data?.error || json.error || "Test eșuat" })
      }
    } catch {
      setSMSOTestResult({ success: false, message: "Eroare de rețea" })
    } finally { setSMSOTesting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Integrări</h1>
          <p className="text-sm text-muted-foreground">
            Configurare AI Provider, chei API, și alte integrări externe
          </p>
        </div>
      </div>

      {/* AI Provider Section */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Provider</h2>
              <p className="text-[10px] text-muted-foreground">
                Folosit pentru Brand DNA și Content Generation
              </p>
            </div>
          </div>
          <button
            onClick={() => setAI((p) => ({ ...p, enabled: !p.enabled }))}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative",
              ai.enabled ? "bg-emerald-500" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform",
                ai.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider selector */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2 block">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() =>
                    setAI((prev) => ({
                      ...prev,
                      provider: p.value,
                      model: p.defaultModel,
                    }))
                  }
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg border transition-all text-left",
                    ai.provider === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      ai.provider === p.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
              API Key
            </label>
            <div className="relative">
              <Key
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type={showKey ? "text" : "password"}
                value={rawKey || ai.apiKey}
                onChange={(e) => {
                  setRawKey(e.target.value)
                  setAI((p) => ({ ...p, apiKey: e.target.value }))
                }}
                placeholder={
                  ai.provider === "openai"
                    ? "sk-..."
                    : "AIza..."
                }
                className="w-full pl-9 pr-10 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              {ai.provider === "openai"
                ? "Obține de la platform.openai.com → API Keys"
                : "Obține de la aistudio.google.com → API Keys"}
            </p>
          </div>

          {/* Model selector */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
              Model
            </label>
            <select
              value={ai.model || selectedProvider.defaultModel}
              onChange={(e) =>
                setAI((p) => ({ ...p, model: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {selectedProvider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                  {m === selectedProvider.defaultModel ? " (recomandat)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium",
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}
            >
              {testResult.success ? (
                <CheckCircle2 size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-gradient-to-r from-violet-600 to-primary text-white hover:opacity-90"
              )}
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={12} />
              ) : (
                <Save size={12} />
              )}
              {saved ? "Salvat!" : "Salvează"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !ai.apiKey}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted hover:text-foreground transition-all disabled:opacity-40"
            >
              {testing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <TestTube size={12} />
              )}
              Testează conexiunea
            </button>
          </div>
        </div>
      </div>

      {/* Usage Stats Section */}
      {usage && (usage.totalCalls > 0) && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Utilizare API</h2>
              <p className="text-[10px] text-muted-foreground">
                Token-uri consumate și cost estimat
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Azi</p>
                <p className="text-lg font-bold text-foreground mt-1">{usage.today.calls}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(usage.today.tokens / 1000).toFixed(1)}k tokens
                </p>
                <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                  ${usage.today.cost.toFixed(4)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Luna asta</p>
                <p className="text-lg font-bold text-foreground mt-1">{usage.thisMonth.calls}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(usage.thisMonth.tokens / 1000).toFixed(1)}k tokens
                </p>
                <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                  ${usage.thisMonth.cost.toFixed(4)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Total</p>
                <p className="text-lg font-bold text-foreground mt-1">{usage.totalCalls}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(usage.totalTokens / 1000).toFixed(1)}k tokens
                </p>
                <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                  ${usage.totalCost.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Recent calls */}
            {usage.entries && usage.entries.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
                  Apeluri recente
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {usage.entries.slice(0, 15).map((e: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 text-xs"
                    >
                      <Zap size={10} className="text-violet-400 flex-shrink-0" />
                      <span className="font-medium text-foreground min-w-[80px]">
                        {e.action === 'brand_dna' ? '🧬 Brand DNA' :
                         e.action === 'content_generate' ? '✍️ Content' :
                         e.action === 'test' ? '🧪 Test' : '⚡ ' + e.action}
                      </span>
                      <span className="text-muted-foreground truncate flex-1">
                        {e.model} · {e.totalTokens.toLocaleString()} tok
                      </span>
                      <span className="text-emerald-400 font-mono text-[10px] flex-shrink-0">
                        ${e.cost.toFixed(5)}
                      </span>
                      <span className="text-muted-foreground/60 text-[9px] flex-shrink-0">
                        {new Date(e.timestamp).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SMSO SMS Provider */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <MessageSquare size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">SMSO.ro — SMS Provider</h2>
              <p className="text-[10px] text-muted-foreground">
                Utilizat pentru trimiterea campaniilor SMS
              </p>
            </div>
          </div>
          <button
            onClick={() => setSMSO((p) => ({ ...p, enabled: !p.enabled }))}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative",
              smso.enabled ? "bg-emerald-500" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform",
                smso.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* API Key */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
              API Key
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showSmsoKey ? "text" : "password"}
                value={smsoRawKey || smso.apiKey}
                onChange={(e) => {
                  setSMSORawKey(e.target.value)
                  setSMSO((p) => ({ ...p, apiKey: e.target.value }))
                }}
                placeholder="API key de la app.smso.ro"
                className="w-full pl-9 pr-10 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <button
                onClick={() => setShowSmsoKey(!showSmsoKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSmsoKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              Obține de la app.smso.ro → Setări → API Keys
            </p>
          </div>

          {/* Sender ID */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
              Sender ID (opțional)
            </label>
            <input
              type="text"
              value={smso.sender}
              onChange={(e) => setSMSO((p) => ({ ...p, sender: e.target.value }))}
              placeholder="Ex: Fudly"
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[9px] text-muted-foreground mt-1">
              Numele afișat ca expeditor al SMS-ului (trebuie aprobat de SMSO)
            </p>
          </div>

          {/* Test result */}
          {smsoTestResult && (
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium",
                smsoTestResult.success
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}
            >
              {smsoTestResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {smsoTestResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSMSOSave}
              disabled={smsoSaving}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                smsoSaved
                  ? "bg-emerald-500 text-white"
                  : "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:opacity-90"
              )}
            >
              {smsoSaving ? <Loader2 size={12} className="animate-spin" /> : smsoSaved ? <CheckCircle2 size={12} /> : <Save size={12} />}
              {smsoSaved ? "Salvat!" : "Salvează"}
            </button>
            <button
              onClick={handleSMSOTest}
              disabled={smsoTesting || !smso.apiKey}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted hover:text-foreground transition-all disabled:opacity-40"
            >
              {smsoTesting ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
              Testează conexiunea
            </button>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-surface rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">
          ℹ️ Cum funcționează
        </p>
        <ul className="space-y-1 list-disc pl-4">
          <li>
            <strong>Brand DNA</strong> — Crawlează site-ul clientului cu
            Playwright și analizează culori, fonturi, ton, audiență
          </li>
          <li>
            <strong>AI Content</strong> — Generează articole SEO, ad copy,
            social captions folosind Brand DNA ca context
          </li>
          <li>
            API key-ul este stocat local în <code>.data/settings.json</code> —
            nu este trimis nicăieri extern în afara provider-ului AI
          </li>
          <li>
            Gemini (gratuit) este recomandat pentru testare. OpenAI (GPT-4o)
            oferă calitate superioară pentru content generation
          </li>
        </ul>
      </div>
    </div>
  )
}
