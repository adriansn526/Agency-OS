'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format, subMonths } from 'date-fns'
import Link from 'next/link'

type Tab = 'ar' | 'ap' | 'bank'

export default function AccountingArchivePage() {
  const [activeTab, setActiveTab] = useState<Tab>('ar')
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 })
  const [loading, setLoading] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // SPV status
  const [spvWarning, setSpvWarning] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchData(1)
  }, [activeTab, month, statusFilter, sourceFilter, searchQuery])

  useEffect(() => {
    // Verificăm statusul SPV pentru fereastra de 45 de zile
    fetch('/api/accounting/spv/settings')
      .then(res => res.json())
      .then(json => {
        if (json?.data?.lastSyncAt) {
          const lastSync = new Date(json.data.lastSyncAt)
          const daysSince = Math.floor((new Date().getTime() - lastSync.getTime()) / (1000 * 3600 * 24))
          if (daysSince > 45) {
            setSpvWarning(`ATENȚIE: Ultima sincronizare SPV a fost acum ${daysSince} zile! Facturile mai vechi de 60 de zile se vor pierde definitiv.`)
          }
        } else {
          setSpvWarning('ATENȚIE: Nu s-a efectuat nicio sincronizare SPV. Facturile mai vechi de 60 de zile se pierd.')
        }
      })
      .catch(console.error)
  }, [])

  const fetchData = async (page: number) => {
    setLoading(true)
    try {
      let endpoint = ''
      let params = new URLSearchParams({ page: page.toString(), limit: '50', month })
      if (searchQuery) params.append('query', searchQuery)
      
      if (activeTab === 'ar') {
        endpoint = '/api/accounting/archive/invoices-out'
        params.append('status', statusFilter)
      } else if (activeTab === 'ap') {
        endpoint = '/api/accounting/archive/invoices-in'
        params.append('source', sourceFilter)
      } else if (activeTab === 'bank') {
        endpoint = '/api/accounting/archive/transactions'
        params.append('status', statusFilter)
      }

      const res = await fetch(`${endpoint}?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setData(json.data || [])
        setPagination(json.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (data.length === 0) return

    let csvContent = "DISCLAIMER: Estimari orientative, fara valoare legala fiscala.\n"
    
    // Antet
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object')
    csvContent += headers.join(",") + "\n"

    // Rânduri
    data.forEach(row => {
      const rowData = headers.map(header => {
        let val = row[header]
        if (val === null || val === undefined) val = ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      csvContent += rowData.join(",") + "\n"
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `export_${activeTab}_${month}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapoarte & Arhivă</h1>
          <p className="text-muted-foreground mt-2">
            Istoricul documentelor finalizate (Read-Only). Pentru documente în așteptare, folosește <Link href="/accounting/reconciliation" className="text-blue-500 hover:underline">Reconciliere</Link>.
          </p>
        </div>
        <div className="flex gap-4">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            onClick={(e) => (e.target as any).showPicker?.()} 
            className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
          />
          <Button variant="outline" onClick={exportCsv} disabled={loading || data.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {spvWarning && activeTab === 'ap' && (
        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fereastră Critică SPV</AlertTitle>
          <AlertDescription>{spvWarning}</AlertDescription>
        </Alert>
      )}

      {/* TABS (Manual simple UI) */}
      <div className="flex border-b">
        <button 
          onClick={() => { setActiveTab('ar'); setStatusFilter('all'); }} 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ar' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Facturi Emise (Clienți / AR)
        </button>
        <button 
          onClick={() => { setActiveTab('ap'); setStatusFilter('all'); }} 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ap' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Facturi Primite (Furnizori / AP)
        </button>
        <button 
          onClick={() => { setActiveTab('bank'); setStatusFilter('all'); }} 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bank' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Extrase de Cont (Trezorerie)
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex items-center justify-between py-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Caută..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          
          {activeTab === 'bank' && (
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Toate Tranzacțiile</option>
              <option value="matched">Doar Reconciliate</option>
              <option value="unmatched">Nereconciliate</option>
            </select>
          )}
          {activeTab === 'ar' && (
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Toate Facturile (AR)</option>
              <option value="confirmed">Confirmate / Venituri</option>
              <option value="pending_review">În Așteptare (Review SPV)</option>
            </select>
          )}
          {activeTab === 'ap' && (
            <select 
              value={sourceFilter} 
              onChange={e => setSourceFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Toate Sursele</option>
              <option value="spv">Doar e-Factura (SPV)</option>
              <option value="email">Email</option>
              <option value="manual">Încărcare Manuală</option>
              <option value="api">Sincronizare API</option>
            </select>
          )}
        </div>

        {activeTab === 'ap' && (
          <Button 
            disabled={isSyncing}
            onClick={async () => {
              setIsSyncing(true)
              try {
                const res = await fetch('/api/accounting/spv/sync', { method: 'POST', body: JSON.stringify({ days: 60 }) })
                const data = await res.json()
                if (res.ok) {
                  alert(data.message)
                  fetchData(1)
                } else {
                  alert(data.error)
                }
              } catch (e) {
                alert('Eroare la sincronizare')
              }
              setIsSyncing(false)
            }}
            className="bg-[#105C9C] hover:bg-[#0c467a] text-white h-9"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sincronizează SPV (Acum)
          </Button>
        )}
      </div>

      {/* CONTENT */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  {activeTab === 'ar' && (
                    <tr>
                      <th className="p-4 font-medium w-16 text-muted-foreground">#</th>
                      <th className="p-4 font-medium">Nr. Factură</th>
                      <th className="p-4 font-medium">Client</th>
                      <th className="p-4 font-medium">Data Emitere</th>
                      <th className="p-4 font-medium">Sumă</th>
                      <th className="p-4 font-medium">Status Plată</th>
                      <th className="p-4 font-medium">Sursă & Reguli</th>
                    </tr>
                  )}
                  {activeTab === 'ap' && (
                    <tr>
                      <th className="p-4 font-medium w-16 text-muted-foreground">#</th>
                      <th className="p-4 font-medium">Furnizor (OCR)</th>
                      <th className="p-4 font-medium">Data Facturii</th>
                      <th className="p-4 font-medium">Nr. Ctr.</th>
                      <th className="p-4 font-medium">Sumă Totală Brută</th>
                      <th className="p-4 font-medium">Cheltuială Deductibilă</th>
                      <th className="p-4 font-medium">TVA Dedus</th>
                      <th className="p-4 font-medium">Sursă & Reguli</th>
                    </tr>
                  )}
                  {activeTab === 'bank' && (
                    <tr>
                      <th className="p-4 font-medium">Data</th>
                      <th className="p-4 font-medium">Detalii</th>
                      <th className="p-4 font-medium text-right">Debit (Out)</th>
                      <th className="p-4 font-medium text-right">Credit (In)</th>
                      <th className="p-4 font-medium">Reconciliat</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y">
                  {data.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nu s-au găsit rezultate.</td></tr>
                  ) : data.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {activeTab === 'ar' && (
                        <>
                          <td className="p-4 text-muted-foreground text-xs">{(pagination.currentPage - 1) * 50 + i + 1}</td>
                          <td className="p-4 font-medium">{row.number}</td>
                          <td className="p-4">{row.client?.name || row.clientId}</td>
                          <td className="p-4">{new Date(row.issuedAt).toLocaleDateString('ro-RO')}</td>
                          <td className="p-4 font-medium">{Number(row.amount).toLocaleString('ro-RO')} {row.currency}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${row.status === 'emisa' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs">
                            <span className={`px-2 py-1 rounded-full text-[10px] mb-1 inline-block ${row.source === 'spv' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'}`}>
                              {String(row.source).toUpperCase()}
                            </span>
                            {row.source === 'spv' && row.extractionStatus === 'pending_review' && (
                              <span className="ml-2 px-2 py-1 rounded-full text-[10px] mb-1 inline-block bg-amber-100 text-amber-700 font-semibold">
                                ÎN AȘTEPTARE
                              </span>
                            )}
                            {row.source === 'spv' && (
                              <div className="mt-1 flex flex-col gap-1">
                                <a 
                                  href={`/api/accounting/archive/invoices-out/${row.id}/xml`} 
                                  target="_blank" 
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> Descarcă XML
                                </a>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                      
                      {activeTab === 'ap' && (
                        <>
                          <td className="p-4">{row.extractedSupplierName || row.supplier?.name || '-'}</td>
                          <td className="p-4">{row.issueDate ? new Date(row.issueDate).toLocaleDateString('ro-RO') : '-'}</td>
                          <td className="p-4 text-slate-500">{row.contractReference || '-'}</td>
                          <td className="p-4 font-medium">{Number(row.amount).toLocaleString('ro-RO')} {row.currency}</td>
                          <td className="p-4 text-rose-600 font-medium">
                            {Number(row.calculatedExpense || 0).toLocaleString('ro-RO')} {row.currency}
                          </td>
                          <td className="p-4 text-emerald-600 font-medium">
                            {Number(row.calculatedVat || 0).toLocaleString('ro-RO')} {row.currency}
                          </td>
                          <td className="p-4 text-xs">
                            <span className={`px-2 py-1 rounded-full text-[10px] mb-1 inline-block ${row.source === 'spv' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'}`}>
                              {String(row.source).toUpperCase()}
                            </span>
                            {row.source === 'spv' && (
                              <div className="mt-1 flex flex-col gap-1">
                                <a 
                                  href={`/api/accounting/archive/invoices-in/${row.id}/xml`} 
                                  target="_blank" 
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> Descarcă XML
                                </a>
                                <a 
                                  href="https://mfinante.gov.ro/ro/web/efactura/validare-xml-factura" 
                                  target="_blank" 
                                  className="text-[10px] text-slate-500 hover:underline"
                                  title="Afișare Lizibilă ANAF"
                                >
                                  ANAF Vizualizare ↗
                                </a>
                              </div>
                            )}
                            <br/>
                            <span className="text-muted-foreground">Chelt: {row.expensePct}% / TVA: {row.vatPct}%</span>
                          </td>
                        </>
                      )}

                      {activeTab === 'bank' && (
                        <>
                          <td className="p-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString('ro-RO')}</td>
                          <td className="p-4 text-xs max-w-[300px] truncate" title={row.details}>{row.details}</td>
                          <td className="p-4 text-right text-rose-600">{Number(row.debit) > 0 ? Number(row.debit).toLocaleString('ro-RO') : '-'}</td>
                          <td className="p-4 text-right text-emerald-600">{Number(row.credit) > 0 ? Number(row.credit).toLocaleString('ro-RO') : '-'}</td>
                          <td className="p-4">
                            {row.matchedByUserId ? (
                              <span className="text-emerald-500 text-xs font-medium">Reconciliat</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Pending</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Afișare pagină {pagination.currentPage} din {pagination.totalPages} ({pagination.totalItems} intrări totale)
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.currentPage === 1 || loading}
              onClick={() => fetchData(pagination.currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Înapoi
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.currentPage === pagination.totalPages || loading}
              onClick={() => fetchData(pagination.currentPage + 1)}
            >
              Următoarea <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
