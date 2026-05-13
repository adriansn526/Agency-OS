"use client"

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Send, X, Sparkles, ExternalLink, Lightbulb, BarChart3, ArrowRight, Loader2, History, Trash2, Plus, Check, XCircle } from "lucide-react"

// ────────────────────────────────────────────
// Context — shared open/close state
// ────────────────────────────────────────────

interface CopilotContextType {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

const CopilotContext = createContext<CopilotContextType>({ open: false, setOpen: () => {}, toggle: () => {} })

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <CopilotContext.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </CopilotContext.Provider>
  )
}

export function useCopilot() {
  return useContext(CopilotContext)
}

// ────────────────────────────────────────────
// Chat Types
// ────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "ai"
  content: string
  actions?: { label: string; href: string }[]
  loading?: boolean
  streaming?: boolean
  toolsUsed?: string[]
  actionsPerformed?: { type: string; detail: string }[]
  actionProposals?: { actionId: string; actionType: string; payload: Record<string, unknown>; reasoning: string; message: string; status?: string }[]
}

interface ConversationSummary {
  id: string
  title: string | null
  messageCount: number
  updatedAt: string
}

// ────────────────────────────────────────────
// AI Streaming — real Gemini API call
// ────────────────────────────────────────────

async function streamCopilotResponse(
  messages: ChatMessage[],
  pathname: string,
  conversationId: string | null,
  onChunk: (text: string) => void,
  onTool: (name: string) => void,
  onAction: (action: string, path: string, reason: string) => void,
  onActionProposal: (proposal: { actionId: string; actionType: string; payload: Record<string, unknown>; reasoning: string; message: string }) => void,
  onMeta: (meta: { conversationId?: string }) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  try {
    const res = await fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, pathname, conversationId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }))
      onError(err.error || `HTTP ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError("No stream"); return }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data: ")) continue
        try {
          const data = JSON.parse(trimmed.slice(6))
          if (data.type === "text") onChunk(data.content)
          else if (data.type === "tool") onTool(data.name)
          else if (data.type === "action") onAction(data.action, data.path, data.reason)
          else if (data.type === "action_proposal") onActionProposal(data)
          else if (data.type === "meta") onMeta(data)
          else if (data.type === "done") onDone()
          else if (data.type === "error") onError(data.content)
        } catch { /* skip malformed */ }
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : "Connection error")
  }
}

// ────────────────────────────────────────────
// Quick action suggestions based on current page
// ────────────────────────────────────────────

function getPageSuggestions(pathname: string): { label: string; query: string; icon: React.ElementType }[] {
  if (pathname.startsWith("/crm")) return [
    { label: "Câți clienți activi am?", query: "Câți clienți activi am?", icon: BarChart3 },
    { label: "Lead-uri cu probabilitate mare", query: "Lead-uri cu probabilitate mare", icon: Lightbulb },
  ]
  if (pathname.startsWith("/finance")) return [
    { label: "Care e MRR-ul total?", query: "Care e MRR-ul total?", icon: BarChart3 },
    { label: "Facturi restante?", query: "Facturi restante?", icon: Lightbulb },
  ]
  if (pathname.startsWith("/offers")) return [
    { label: "Câte oferte active am?", query: "Câte oferte active am?", icon: BarChart3 },
    { label: "Fă-mi un sumar", query: "Fă-mi un sumar", icon: Lightbulb },
  ]
  if (pathname.startsWith("/projects")) return [
    { label: "Status proiecte", query: "Status proiecte", icon: BarChart3 },
    { label: "Fă-mi un sumar", query: "Fă-mi un sumar", icon: Lightbulb },
  ]
  if (pathname.startsWith("/marketing")) return [
    { label: "Câte campanii active am?", query: "Câte campanii active am?", icon: BarChart3 },
    { label: "Raport marketing", query: "Fă-mi un raport marketing", icon: Lightbulb },
  ]
  return [
    { label: "Raport executiv complet", query: "Generează un raport executiv", icon: BarChart3 },
    { label: "Câți clienți activi am?", query: "Câți clienți activi am?", icon: Lightbulb },
  ]
}

// ────────────────────────────────────────────
// Sidebar Panel Component
// ────────────────────────────────────────────

export function AICopilotPanel() {
  const { open, setOpen } = useCopilot()
  const pathname = usePathname()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const suggestions = getPageSuggestions(pathname)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200)
      // Load conversation list
      fetch('/api/ai/copilot/conversations').then(r => r.json()).then(d => {
        if (d.data) setConversations(d.data)
      }).catch(() => {})
    }
  }, [open])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/copilot/conversations/${id}`)
      const data = await res.json()
      if (data.data) {
        setConversationId(id)
        setMessages(data.data.messages.map((m: any) => ({ role: m.role, content: m.content, toolsUsed: m.toolsUsed, actionsPerformed: m.actionsPerformed })))
        setShowHistory(false)
      }
    } catch { /* ignore */ }
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/ai/copilot/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (conversationId === id) { setConversationId(null); setMessages([]) }
    } catch { /* ignore */ }
  }, [conversationId])

  const startNewConversation = useCallback(() => {
    setConversationId(null)
    setMessages([])
    setShowHistory(false)
  }, [])

  const handleApproveAction = useCallback(async (actionId: string, approve: boolean) => {
    try {
      await fetch(`/api/ai/copilot/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approve ? 'approved' : 'rejected' }),
      })
      setMessages(prev => prev.map(msg => {
        if (!msg.actionProposals) return msg
        return { ...msg, actionProposals: msg.actionProposals.map(p => p.actionId === actionId ? { ...p, status: approve ? 'approved' : 'rejected' } : p) }
      }))
    } catch { /* ignore */ }
  }, [])

  const [isStreaming, setIsStreaming] = useState(false)

  const handleSend = useCallback((text?: string) => {
    const userMsg = (text || input).trim()
    if (!userMsg || isStreaming) return
    setInput("")
    setIsStreaming(true)

    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }]
    setMessages([...updatedMessages, { role: "ai", content: "", loading: true, streaming: true, toolsUsed: [], actionProposals: [] }])

    let accumulated = ""
    const tools: string[] = []
    const performedActions: { type: string; detail: string }[] = []
    const proposals: ChatMessage['actionProposals'] = []

    streamCopilotResponse(
      updatedMessages,
      pathname,
      conversationId,
      (chunk) => {
        accumulated += chunk
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]!
          copy[copy.length - 1] = { ...last, content: accumulated, loading: false, streaming: true, toolsUsed: [...tools] }
          return copy
        })
      },
      (toolName) => {
        tools.push(toolName)
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]!
          copy[copy.length - 1] = { ...last, toolsUsed: [...tools] }
          return copy
        })
      },
      (action, path, reason) => {
        if (action === 'navigate' && path) {
          performedActions.push({ type: 'navigate', detail: `${reason || 'Navigare'}: ${path}` })
          setTimeout(() => { router.push(path) }, 800)
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]!
            copy[copy.length - 1] = { ...last, actionsPerformed: [...performedActions] }
            return copy
          })
        }
      },
      // onActionProposal
      (proposal) => {
        proposals.push({ ...proposal, status: 'pending' })
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]!
          copy[copy.length - 1] = { ...last, actionProposals: [...proposals] }
          return copy
        })
      },
      // onMeta
      (meta) => {
        if (meta.conversationId) setConversationId(meta.conversationId)
      },
      () => {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]!
          copy[copy.length - 1] = { ...last, streaming: false, loading: false }
          return copy
        })
        setIsStreaming(false)
      },
      (error) => {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]!
          copy[copy.length - 1] = { ...last, content: `⚠️ ${error}`, loading: false, streaming: false }
          return copy
        })
        setIsStreaming(false)
      }
    )
  }, [input, messages, pathname, isStreaming, conversationId])

  return (
    <>
      {/* Mobile backdrop only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Push Sidebar — inline flex child on desktop, fixed on mobile */}
      <div
        className={cn(
          "h-full flex flex-col bg-surface border-l border-border flex-shrink-0 transition-all duration-300 ease-out overflow-hidden",
          // Desktop: inline push (width animates)
          "hidden md:flex",
          open ? "w-[400px]" : "w-0 border-l-0"
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-violet-600/5 to-pink-600/5 flex-shrink-0 min-w-[400px]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">AI Copilot</p>
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">v3</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{pathname}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowHistory(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Istoric conversații">
                  <History size={14} />
                </button>
                <button onClick={startNewConversation} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Conversație nouă">
                  <Plus size={14} />
                </button>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conversation history dropdown */}
            {showHistory && (
              <div className="border-b border-border bg-muted/30 max-h-[200px] overflow-y-auto min-w-[400px]">
                {conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nicio conversație anterioară</p>
                ) : conversations.map(c => (
                  <div key={c.id} className={cn("flex items-center gap-2 px-4 py-2 hover:bg-muted/60 cursor-pointer text-xs group", conversationId === c.id && "bg-violet-500/10")}>
                    <button onClick={() => loadConversation(c.id)} className="flex-1 text-left truncate text-foreground">
                      {c.title || 'Fără titlu'}
                      <span className="text-muted-foreground ml-1">({c.messageCount} msg)</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity" title="Șterge">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state / Welcome */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-w-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/10 to-pink-600/10 flex items-center justify-center mb-4">
                  <Sparkles size={28} className="text-violet-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Ce vrei să afli?</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
                  Întreabă despre clienți, proiecte, financiar sau oferte. AI analizează datele tale instant.
                </p>

                {/* Context-aware suggestions */}
                <div className="w-full space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left">Sugestii pentru pagina curentă</p>
                  {suggestions.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.label}
                        onClick={() => handleSend(s.query)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-xl text-left transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-violet-500" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{s.label}</span>
                        <ArrowRight size={12} className="ml-auto text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    )
                  })}
                </div>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {["Fă-mi un sumar", "Câți clienți activi?", "MRR total", "Oferte active"].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.length > 0 && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-w-[400px]">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "ai" && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={11} className="text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground border border-border/50"
                    )}>
                      {msg.loading ? (
                        <div className="flex items-center gap-2 py-1">
                          {msg.toolsUsed && msg.toolsUsed.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-violet-400">
                              <Loader2 size={12} className="animate-spin" />
                              <span className="text-[10px]">Analizez date...</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Tool usage badges */}
                          {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {msg.toolsUsed.map((t, ti) => (
                                <span key={ti} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-violet-500/10 text-violet-400 rounded border border-violet-500/20">
                                  🔧 {t.replace('get_', '').replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Action badges (navigate, etc.) */}
                          {msg.actionsPerformed && msg.actionsPerformed.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {msg.actionsPerformed.map((a, ai) => (
                                <span key={ai} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                                  {a.type === 'navigate' ? '🧭' : '⚡'} {a.detail}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Action approval cards */}
                          {msg.actionProposals && msg.actionProposals.length > 0 && (
                            <div className="space-y-2 mb-2">
                              {msg.actionProposals.map((p) => (
                                <div key={p.actionId} className={cn(
                                  "rounded-lg border p-2.5 text-[11px]",
                                  p.status === 'approved' ? "bg-emerald-500/5 border-emerald-500/30" :
                                  p.status === 'rejected' ? "bg-red-500/5 border-red-500/30" :
                                  "bg-amber-500/5 border-amber-500/30"
                                )}>
                                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                                    {p.status === 'approved' ? <Check size={11} className="text-emerald-400" /> :
                                     p.status === 'rejected' ? <XCircle size={11} className="text-red-400" /> :
                                     <span>🔄</span>}
                                    <span>{p.actionType.replace(/_/g, ' ')}</span>
                                    {p.status && <span className={cn("ml-auto text-[9px] font-normal",
                                      p.status === 'approved' ? "text-emerald-400" : p.status === 'rejected' ? "text-red-400" : "text-amber-400"
                                    )}>{p.status === 'approved' ? '✅ Executat' : p.status === 'rejected' ? '❌ Anulat' : '⏳ Așteaptă'}</span>}
                                  </div>
                                  <p className="text-muted-foreground mb-1.5">{p.message}</p>
                                  {p.status === 'pending' && (
                                    <div className="flex gap-1.5">
                                      <button onClick={() => handleApproveAction(p.actionId, true)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-medium transition-colors">
                                        <Check size={10} /> Confirmă
                                      </button>
                                      <button onClick={() => handleApproveAction(p.actionId, false)} className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded-md text-[10px] font-medium transition-colors border border-border">
                                        <XCircle size={10} /> Anulează
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                            __html: msg.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                              + (msg.streaming ? '<span class="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm"></span>' : '')
                          }} />
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-border/30">
                              {msg.actions.map((a) => (
                                <a
                                  key={a.href}
                                  href={a.href}
                                  onClick={() => setOpen(false)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                >
                                  <ExternalLink size={10} /> {a.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-surface flex-shrink-0 min-w-[400px]">
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  className="text-[10px] text-muted-foreground hover:text-foreground mb-2 transition-colors"
                >
                  ✨ Conversație nouă
                </button>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend() } }}
                  placeholder="Întreabă ceva..."
                  className="flex-1 px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile: fixed panel (overlay) — full chat with bottom nav clearance */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 flex flex-col bg-surface border-l border-border shadow-2xl transition-transform duration-300 ease-out md:hidden",
          "w-[85vw] max-w-[380px]",
          "h-[calc(100dvh-70px)]", // Leave space for bottom nav bar
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-violet-600/5 to-pink-600/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">AI Copilot</p>
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">Beta</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{pathname}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Empty state / Welcome (mobile) */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-5 text-center overflow-y-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/10 to-pink-600/10 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-violet-500" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Ce vrei să afli?</h3>
                <p className="text-[11px] text-muted-foreground mb-5 max-w-[240px]">
                  Întreabă despre clienți, proiecte, financiar sau oferte.
                </p>

                {/* Context-aware suggestions */}
                <div className="w-full space-y-1.5">
                  {suggestions.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.label}
                        onClick={() => handleSend(s.query)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-xl text-left transition-all"
                      >
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={12} className="text-violet-500" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{s.label}</span>
                        <ArrowRight size={11} className="ml-auto text-muted-foreground/30" />
                      </button>
                    )
                  })}
                </div>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {["Fă-mi un sumar", "Clienți activi?", "MRR", "Oferte"].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="px-2 py-1 text-[10px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground rounded-lg border border-border/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages (mobile) */}
            {messages.length > 0 && (
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "ai" && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={10} className="text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground border border-border/50"
                    )}>
                      {msg.loading ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                            __html: msg.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                          }} />
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/30">
                              {msg.actions.map((a) => (
                                <a
                                  key={a.href}
                                  href={a.href}
                                  onClick={() => setOpen(false)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                >
                                  <ExternalLink size={9} /> {a.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input (mobile) — above bottom nav */}
            <div className="px-3 py-2.5 border-t border-border bg-surface flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  className="text-[10px] text-muted-foreground hover:text-foreground mb-1.5 transition-colors"
                >
                  ✨ Conversație nouă
                </button>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend() } }}
                  placeholder="Întreabă ceva..."
                  className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
