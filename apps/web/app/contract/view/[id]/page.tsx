"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Loader2, Printer, CheckCircle2, Calendar, Building2, FileText } from "lucide-react"

interface ContractSection {
  id: string
  title: string
  content: string
}

interface Anexa2Phase {
  id: string
  name: string
  tasks: string[]
  period: string
  deliverable: string
}

interface Anexa2Deliverable {
  name: string
  frequency: string
  format?: string
}

interface Anexa2Reporting {
  frequency: string
  includes: string[]
}

interface ContractData {
  id: string
  number: string
  status: string
  value: number
  currency: string
  duration: number
  startDate: string
  endDate: string
  signedAt?: string
  sections: Record<string, ContractSection>
  anexa2?: { phases?: Anexa2Phase[]; deliverables?: Anexa2Deliverable[]; reporting?: Anexa2Reporting }
  companyDetails: any
  clientDetails: any
  businessLine?: { name: string; slug: string }
  client?: { companyName: string }
  offer?: { number: string }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })
}

function formatCurrency(v: number, c: string) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: c, minimumFractionDigits: 0 }).format(v)
}

export default function PublicContractViewPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/public/${id}`)
        if (!res.ok) throw new Error("Not found")
        const json = await res.json()
        setContract(json.data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">Contract negăsit</p>
          <p className="text-sm text-gray-500">Link-ul poate fi expirat sau invalid.</p>
        </div>
      </div>
    )
  }

  // Sections can be indexed by number or by id
  const sectionsArray: ContractSection[] = Object.values(contract.sections)
    .sort((a: any, b: any) => {
      const numA = parseInt((a.id || a.title || '').replace(/\D/g, "")) || 0
      const numB = parseInt((b.id || b.title || '').replace(/\D/g, "")) || 0
      return numA - numB
    })

  const company = contract.companyDetails as any
  const client = contract.clientDetails as any
  const anexa2 = contract.anexa2

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top toolbar (hidden in print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-indigo-600" />
            <span className="font-semibold text-gray-900">Contract {contract.number}</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Contract content */}
      <div className="max-w-4xl mx-auto p-6 md:p-10 print:p-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:rounded-none">

          {/* ─── HEADER ─── */}
          <div className="p-8 md:p-12 border-b border-gray-100">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">CONTRACT DE PRESTĂRI SERVICII</h1>
              <p className="text-lg text-indigo-600 font-semibold">{contract.number}</p>
              {contract.offer?.number && (
                <p className="text-xs text-gray-400 mt-1">Ref. Ofertă: {contract.offer.number}</p>
              )}
            </div>

            {/* Contract meta */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500" />
                {contract.duration === 0
                  ? <>începând de la {formatDate(contract.startDate)} pe o perioadă nedeterminată</>
                  : <>{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</>
                }
              </span>
              {contract.duration !== 0 && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-500" />
                  {contract.duration} luni
                </span>
              )}
              <span className="font-bold text-indigo-600 text-base">
                {formatCurrency(contract.value, contract.currency)} / lunar
              </span>
            </div>
          </div>

          {/* ─── CONTRACT SECTIONS (Art. 1–12) ─── */}
          <div className="p-8 md:p-12 space-y-8">
            {sectionsArray.map((section) => (
              <div key={section.id} className="break-inside-avoid">
                <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                  {section.title}
                </h2>
                {section.content && (
                  <div
                    className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: section.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ─── ANEXA 2 — Statement of Work ─── */}
          {anexa2 && (anexa2.phases?.length || anexa2.deliverables?.length || anexa2.reporting) && (
            <div className="p-8 md:p-12 border-t border-gray-100 space-y-8 break-inside-avoid">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
                ANEXA 2 — Caiet de Sarcini (Statement of Work)
              </h2>

              {/* Phases */}
              {anexa2.phases && anexa2.phases.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-4">Fazele Proiectului</h3>
                  <div className="space-y-4">
                    {anexa2.phases.map((phase, idx) => (
                      <div key={phase.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            <span className="text-indigo-600 mr-2">Faza {idx + 1}.</span>
                            {phase.name}
                          </h4>
                          <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            {phase.period}
                          </span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1 mb-2">
                          {phase.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-400 mt-1">•</span>
                              {task}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-gray-500">
                          <b>Livrabil:</b> {phase.deliverable}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {anexa2.deliverables && anexa2.deliverables.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-4">Livrabile Recurente</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-500 font-medium">Serviciu</th>
                        <th className="text-left py-2 text-gray-500 font-medium">KPI / Livrabil</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Frecvență</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anexa2.deliverables.map((d: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 text-gray-800 font-medium">{d.service || d.name || '—'}</td>
                          <td className="py-2 text-gray-600">{d.kpi || '—'}</td>
                          <td className="py-2 text-gray-600">{d.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reporting */}
              {anexa2.reporting && (
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-3">Raportare</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <b>Frecvență:</b> {anexa2.reporting.frequency}
                  </p>
                  {anexa2.reporting.includes && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {anexa2.reporting.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── SIGNATURES ─── */}
          <div className="p-8 md:p-12 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-8 mt-4">
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">PRESTATOR</p>
                <p className="font-semibold text-gray-900">{company?.legalName || company?.name || 'ASNS SRL'}</p>
                <p className="text-sm text-gray-500 mt-1">{company?.representative || ''}</p>
                <div className="mt-8 pt-8 border-t border-dashed border-gray-300">
                  <p className="text-xs text-gray-400">Semnătura și ștampila</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">BENEFICIAR</p>
                <p className="font-semibold text-gray-900">{client?.name || contract.client?.companyName || ''}</p>
                <p className="text-sm text-gray-500 mt-1">{client?.representative || ''}</p>
                <div className="mt-8 pt-8 border-t border-dashed border-gray-300">
                  <p className="text-xs text-gray-400">Semnătura și ștampila</p>
                </div>
              </div>
            </div>

            {/* Legal disclaimer for digital documents */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
                Prezentul contract a fost generat și transmis în format electronic. Conform art. 5 și art. 7 din Legea nr. 455/2001 
                privind semnătura electronică, documentele în formă electronică, cărora li s-a încorporat, atașat sau asociat o 
                semnătură electronică extinsă, sunt asimilate, în ceea ce privește condițiile și efectele lor, cu înscrisurile sub 
                semnătură privată. Contractul transmis prin mijloace electronice și acceptat de ambele părți are aceeași valoare juridică 
                ca și contractul încheiat în formă scrisă, conform art. 9 din Legea nr. 365/2002 privind comerțul electronic.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
