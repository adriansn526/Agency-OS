"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { BlockRenderer } from "@/components/block-renderer"
import { FudlyOfferTemplate } from "@/components/fudly-offer-template"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  CheckCircle2, XCircle, MessageSquare, Download, Clock, Shield,
  Phone, Mail, Globe, FileText, Send, Activity, Loader2,
  CalendarDays, Sparkles, ArrowRight,
} from "lucide-react"

/* ── Simple Block Renderer for flat blocks without nested data ── */

function SimpleBlockRenderer({ block }: { block: any }) {
  switch (block.type) {
    case 'header':
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-300 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{block.content || block.title}</h2>
          {block.subtitle && <p className="text-lg text-gray-600 max-w-3xl mx-auto">{block.subtitle}</p>}
        </div>
      )
    case 'benefits':
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-green-200">
          {block.title && <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">{block.title}</h3>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(block.items || []).map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'pricing':
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-300">
          {block.title && <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">{block.title}</h3>}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-orange-600">{block.price} {block.currency || 'EUR'}</span>
              {block.period && <span className="text-lg text-gray-500 ml-1">/{block.period}</span>}
            </div>
            {block.features && (
              <div className="space-y-3">
                {block.features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-orange-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    case 'cta':
      return (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl shadow-xl p-6 md:p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">{block.title}</h3>
          {block.subtitle && <p className="text-orange-100">{block.subtitle}</p>}
        </div>
      )
    default:
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-gray-200">
          {block.title && <h3 className="text-xl font-bold text-gray-900 mb-4">{block.title}</h3>}
          {block.content && <p className="text-gray-700">{block.content}</p>}
          {block.items && (
            <ul className="space-y-2 mt-4">
              {block.items.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
  }
}

/* ── Page ── */

export default function PublicOfferPage() {
  const { token } = useParams<{ token: string }>()
  const [offer, setOffer] = useState<any>(null)
  const [delivery, setDelivery] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [response, setResponse] = useState<"accepted" | "rejected" | "demo_scheduled" | null>(null)
  const [showQuestion, setShowQuestion] = useState(false)
  const [questionText, setQuestionText] = useState("")
  const [questionSent, setQuestionSent] = useState(false)
  const [scrollDepth, setScrollDepth] = useState(0)
  const trackingSent = useRef(false)
  // Demo scheduling
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [scheduledDemoDate, setScheduledDemoDate] = useState("")

  // Fetch offer
  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/offers/public/${token}`)
        if (!res.ok) throw new Error("Not found")
        const json = await res.json()
        if (cancelled) return
        setOffer(json.offer || null)
        setDelivery(json.delivery || null)
        if (json.delivery?.clientResponse === 'accepted') setResponse('accepted')
        if (json.delivery?.clientResponse === 'rejected') setResponse('rejected')
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  // Scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      const pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0
      setScrollDepth(pct)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Tracking: scroll depth thresholds
  const scrollThresholds = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!delivery?.trackingEnabled) return
    const handleScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      const pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !scrollThresholds.current.has(t)) {
          scrollThresholds.current.add(t)
          fetch(`/api/offers/public/${token}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: [{ type: 'scroll_depth', metadata: { depth: t } }] }),
          }).catch(() => {})
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [delivery?.trackingEnabled, token])

  // Tracking: Intersection Observer for section viewing
  useEffect(() => {
    if (!delivery?.trackingEnabled || !offer?.blocks?.length) return
    const viewed = new Set<string>()
    const timers = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sid = entry.target.getAttribute('data-section-id')
          const stitle = entry.target.getAttribute('data-section-title') || ''
          if (!sid) return

          if (entry.isIntersecting) {
            timers.set(sid, Date.now())
            if (!viewed.has(sid)) {
              viewed.add(sid)
              fetch(`/api/offers/public/${token}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: [{ type: 'section_viewed', metadata: { section: stitle } }] }),
              }).catch(() => {})
            }
          } else {
            const st = timers.get(sid)
            if (st) {
              const dur = Math.round((Date.now() - st) / 1000)
              if (dur >= 2) {
                fetch(`/api/offers/public/${token}/events`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ events: [{ type: 'time_on_section', metadata: { section: stitle, duration: dur } }] }),
                }).catch(() => {})
              }
              timers.delete(sid)
            }
          }
        })
      },
      { threshold: 0.3 }
    )

    const timeout = setTimeout(() => {
      document.querySelectorAll('[data-section-id]').forEach((el) => observer.observe(el))
    }, 1000)

    return () => { clearTimeout(timeout); observer.disconnect() }
  }, [delivery?.trackingEnabled, offer?.blocks, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">Ofertă negăsită</p>
          <p className="text-sm text-gray-500">Link-ul este invalid sau oferta a expirat.</p>
        </div>
      </div>
    )
  }

  const handleAccept = async () => {
    setResponse("accepted")
    window.scrollTo({ top: 0, behavior: "smooth" })
    fetch(`/api/offers/public/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    }).catch(() => {})
  }

  const handleReject = async () => {
    setResponse("rejected")
    window.scrollTo({ top: 0, behavior: "smooth" })
    fetch(`/api/offers/public/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }).catch(() => {})
  }

  const handleScheduleDemo = async () => {
    if (!selectedDate || !selectedTime) return
    setDemoSubmitting(true)
    const demoDateTime = `${selectedDate}T${selectedTime}:00`
    try {
      await fetch(`/api/offers/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule_demo', demoDate: demoDateTime }),
      })
      setScheduledDemoDate(demoDateTime)
      setResponse("demo_scheduled")
      setShowCalendar(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      // silent
    } finally {
      setDemoSubmitting(false)
    }
  }

  const handleQuestion = async () => {
    setQuestionSent(true)
    fetch(`/api/offers/public/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'question', message: questionText }),
    }).catch(() => {})
    setTimeout(() => setShowQuestion(false), 2000)
  }

  const handlePdfDownload = () => {
    if (delivery?.trackingEnabled) {
      fetch(`/api/offers/public/${token}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [{ type: 'pdf_downloaded' }] }),
      }).catch(() => {})
    }
    window.print()
  }

  const validUntilStr = offer.validUntil ? formatDate(offer.validUntil) : '—'
  const customFields = (offer.customFields || {}) as Record<string, any>

  // Detect business line for themed UX
  const isFudly = offer.businessLineId?.includes('fudly') || offer.templateName?.toLowerCase().includes('fudly') || offer.entityType === 'restaurants'

  // Theme colors based on BL
  const theme = isFudly ? {
    bg: 'from-red-50 via-orange-50 to-amber-50',
    headerGradient: 'from-red-600 via-red-500 to-orange-500',
    accent: 'text-red-600',
    accentBg: 'bg-red-600',
    border: 'border-red-200',
    ctaGradient: 'from-red-600 to-orange-500',
    footerBorder: 'border-red-200',
    brandName: 'Fudly',
    brandIcon: '🍕',
    tagline: 'Sistemul tău de comenzi online',
  } : {
    bg: 'from-orange-50 to-amber-50',
    headerGradient: 'from-orange-600 via-amber-600 to-orange-600',
    accent: 'text-orange-600',
    accentBg: 'bg-orange-600',
    border: 'border-orange-200',
    ctaGradient: 'from-orange-600 to-amber-600',
    footerBorder: 'border-orange-200',
    brandName: 'ASNS',
    brandIcon: 'A',
    tagline: 'Digital Agency',
  }

  return (
    <div className={`public-offer light min-h-screen bg-gradient-to-br ${theme.bg} text-gray-900`} style={{ colorScheme: "light" }}>
      {/* Response Banner */}
      {response && (
        <div className={cn("sticky top-0 z-50 py-3 px-6 text-center text-sm font-medium text-white",
          response === "demo_scheduled" ? "bg-blue-600" : response === "accepted" ? "bg-emerald-600" : "bg-red-600"
        )}>
          {response === "demo_scheduled" ? (
            <span className="flex items-center justify-center gap-2">
              <CalendarDays size={16} />
              Demonstrația a fost programată{scheduledDemoDate ? ` pentru ${new Date(scheduledDemoDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })} la ora ${new Date(scheduledDemoDate).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : ''}. Te vom contacta pentru confirmare!
            </span>
          ) : response === "accepted" ? (
            <span className="flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Mulțumim! Oferta a fost acceptată. Vă vom contacta în cel mai scurt timp.</span>
          ) : (
            <span className="flex items-center justify-center gap-2"><XCircle size={16} /> Oferta a fost refuzată. Vom reveni cu o nouă propunere.</span>
          )}
        </div>
      )}

      {/* Header */}
      <header className={`bg-gradient-to-r ${theme.headerGradient} text-white py-4 md:py-5 px-4 sticky top-0 z-40 shadow-lg`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isFudly && <span className="text-2xl">{theme.brandIcon}</span>}
            <div>
              <p className="text-lg font-bold text-white">{isFudly ? theme.brandName : offer.entityName}</p>
              <p className="text-sm text-white/70">{isFudly ? `Propunere pentru ${offer.entityName}` : offer.templateName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`mailto:${isFudly ? 'restaurante@fudly.ro' : 'contact@asns.ro'}`} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30 transition-colors">
              <Mail size={14} /> Contact
            </a>
          </div>
        </div>
      </header>

      {/* ── FUDLY: Full persuasive template ── */}
      {isFudly ? (
        <FudlyOfferTemplate offer={offer} validUntilStr={validUntilStr} />
      ) : (
        <>
          {/* Hero Section - Generic */}
          <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{offer.templateName}</h1>
                <p className="text-lg text-gray-600">Pregătită pentru <span className="text-gray-900 font-semibold">{offer.entityName}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Valoare</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(offer.value)}</p>
                  <p className="text-xs text-gray-500">{offer.currency}{customFields.pret_lunar ? "/lună" : ""}</p>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Template</p>
                  <p className="text-sm font-semibold text-gray-900">{offer.templateName.replace("Ofertă ", "").replace("Propunere ", "").replace("Deviz ", "")}</p>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Validitate</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 justify-center">
                    <Clock size={13} className="text-green-600" /> {validUntilStr}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Blocks — with tracking attributes */}
          <section className="max-w-6xl mx-auto px-4 md:px-6 pb-8 space-y-12">
            {(offer.blocks || []).map((block: any, idx: number) => {
              const sectionId = `block-${idx}-${block.type || 'unknown'}`
              const isStructured = !!block.data
              return (
                <div key={sectionId} data-section-id={sectionId} data-section-title={block.title || block.type || `Section ${idx + 1}`}>
                  {isStructured ? (
                    <BlockRenderer block={block} variant="public" />
                  ) : (
                    <SimpleBlockRenderer block={block} />
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}

      {/* ── Custom Services Card (Fudly only) ── */}
      {isFudly && (
        <section className="max-w-4xl mx-auto px-4 md:px-6 pb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Mai mult decât un sistem de comenzi</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">Soluții digitale personalizate pentru afacerea ta</h3>
              <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
                Fiecare restaurant e diferit. De aceea, adaptăm platforma la nevoile tale specifice — de la design-ul meniului digital 
                la integrări cu sistemele tale existente. Echipa noastră te ghidează la fiecare pas.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Design personalizat', 'Integrări la cerere', 'Training echipă', 'Suport dedicat'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!response && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          {isFudly ? (
            /* ── Fudly: first-contact CTA ── */
            <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-2xl shadow-xl p-6 md:p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Următorul pas?</h3>
              <p className="text-red-100 mb-6">Alege cum preferi să continuăm</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => setShowCalendar(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                  <CalendarDays size={18} /> Programează o demonstrație
                </button>
                <a href="tel:+40731156333"
                  className="w-full sm:w-auto px-8 py-4 bg-red-700 text-white rounded-xl text-sm font-bold hover:bg-red-800 transition-all flex items-center justify-center gap-2 border-2 border-white/30">
                  <Phone size={18} /> Sună-mă
                </a>
                <button onClick={() => setShowQuestion(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-red-700 text-white rounded-xl text-sm font-bold hover:bg-red-800 transition-all flex items-center justify-center gap-2 border-2 border-white/30">
                  <MessageSquare size={18} /> Am o întrebare
                </button>
              </div>
            </div>
          ) : (
            /* ── Generic: Accept/Refuz ── */
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl shadow-xl p-6 md:p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Ce doriți să faceți?</h3>
              <p className="text-orange-100 mb-6">Alegeți una din opțiunile de mai jos</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={handleAccept}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-green-600 rounded-xl text-sm font-bold hover:bg-green-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                  <CheckCircle2 size={18} /> Accept Oferta
                </button>
                <button onClick={handleReject}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-700 text-white rounded-xl text-sm font-bold hover:bg-orange-800 transition-all flex items-center justify-center gap-2 border-2 border-white/30">
                  <XCircle size={18} /> Refuz
                </button>
                <button onClick={() => setShowQuestion(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-700 text-white rounded-xl text-sm font-bold hover:bg-orange-800 transition-all flex items-center justify-center gap-2 border-2 border-white/30">
                  <MessageSquare size={18} /> Am întrebări
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Demo Calendar Picker (Fudly) ── */}
      {showCalendar && (
        <section className="max-w-xl mx-auto px-4 md:px-6 pb-6">
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <CalendarDays size={20} className="text-red-600" /> Programează demonstrația
            </h3>
            <p className="text-sm text-gray-500 mb-5">Alege o dată și oră care ți se potrivește. Te vom contacta pentru confirmare.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-1 focus:ring-red-200 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ora</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-1 focus:ring-red-200 outline-none transition-colors bg-white"
                >
                  <option value="">Selectează ora</option>
                  {['09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleScheduleDemo}
                disabled={!selectedDate || !selectedTime || demoSubmitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {demoSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {demoSubmitting ? 'Se programează...' : 'Confirmă demonstrația'}
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Question */}
      {showQuestion && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-6">
          <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare size={14} className="text-orange-600" /> Trimite o întrebare
            </h3>
            {questionSent ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 size={14} /> Mesajul a fost trimis! Vă vom răspunde în cel mai scurt timp.
              </div>
            ) : (
              <>
                <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} placeholder="Scrieți întrebarea dvs. aici..."
                  className="w-full px-4 py-3 text-sm bg-orange-50/50 border-2 border-orange-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 resize-none mb-3" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowQuestion(false)} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">Anulează</button>
                  <button onClick={handleQuestion} className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 flex items-center gap-1.5">
                    <Send size={11} /> Trimite
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Download PDF */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-8">
        <button onClick={handlePdfDownload} className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl text-sm text-gray-700 font-medium hover:bg-orange-50 border-2 border-orange-200 transition-all shadow-sm">
          <Download size={14} /> Descarcă PDF
        </button>
      </section>

      {/* Footer */}
      <footer className={`border-t-2 ${theme.footerBorder} bg-white`}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center md:text-left">
            <div>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.ctaGradient} flex items-center justify-center mx-auto md:mx-0 mb-2`}>
                <span className="text-white font-bold text-xs">{isFudly ? '🍕' : 'A'}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">Advanced Systems & Network Solutions</p>
              <p className="text-[10px] text-gray-500 mt-1">CUI: RO18890424</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Str. Dr. Iacob Felix 63-69, Premium Plaza, București</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Contact</p>
              <div className="space-y-1.5">
                <p className="text-xs text-gray-600 flex items-center gap-1.5 justify-center md:justify-start"><Mail size={11} className={theme.accent} /> {isFudly ? 'restaurante@fudly.ro' : 'contact@asns.ro'}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1.5 justify-center md:justify-start"><Phone size={11} className={theme.accent} /> +40 731 156 333</p>
                <p className="text-xs text-gray-600 flex items-center gap-1.5 justify-center md:justify-start"><Globe size={11} className={theme.accent} /> {isFudly ? 'fudly.ro' : 'asns.ro'}</p>
              </div>
            </div>
          </div>
          <div className={`mt-6 pt-4 border-t ${theme.footerBorder} text-center`}>
            <p className="text-[10px] text-gray-500">&copy; {new Date().getFullYear()} Advanced Systems & Network Solutions. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>

      {/* Scroll Depth Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-orange-200 rounded-full text-[9px] text-gray-500 z-40 shadow-sm print:hidden">
        <Activity size={9} /> Scroll: {scrollDepth}%
      </div>
    </div>
  )
}
