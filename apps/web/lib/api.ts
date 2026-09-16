// ─── API Fetch Helpers ───
// Centralized API calls for frontend → backend integration

const BASE = ''  // Same origin

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    cache: 'no-store',
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`)
  return res.json()
}

// ─── Response types ───

export interface APIClient {
  id: string
  businessLineId: string
  entityType: string
  companyName: string
  cui: string | null
  regCom: string | null
  contactPerson: string
  email: string
  phone: string | null
  address: string | null
  website: string | null
  status: string
  industry: string | null
  notes: string | null
  customFields: any
  createdAt: string
  updatedAt: string
  businessLine: { slug: string; name: string; icon?: string; color?: string }
  _count?: { projects: number; offers: number; invoices: number; contracts: number }
  // Detail includes
  projects?: any[]
  offers?: any[]
  contracts?: any[]
  invoices?: any[]
  activities?: any[]
}

export interface APILead {
  id: string
  businessLineId: string
  entityType: string
  companyName: string
  contactPerson: string
  email: string
  phone: string | null
  status: string
  source: string | null
  value: number | null
  probability: number | null
  priority: string | null
  notes: string | null
  assignedTo: string | null
  nextAction: string | null
  nextActionDate: string | null
  createdAt: string
  updatedAt: string
  businessLine: { slug: string; name: string; icon?: string; color?: string }
  convertedTo: { id: string; companyName: string } | null
}

export interface APIPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── CRM APIs ───

export async function fetchClients(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ data: APIClient[]; pagination: APIPagination }>(`/api/clients${qs}`)
}

export async function fetchClient(id: string) {
  return apiFetch<{ data: APIClient }>(`/api/clients/${id}`)
}

export async function createClient(body: Record<string, any>) {
  return apiFetch<{ data: APIClient }>('/api/clients', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateClient(id: string, body: Record<string, any>) {
  return apiFetch<{ data: APIClient }>(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function fetchLeads(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ data: APILead[]; pagination: APIPagination }>(`/api/leads${qs}`)
}

export async function fetchLead(id: string) {
  return apiFetch<{ data: APILead }>(`/api/leads/${id}`)
}

export async function createLead(body: Record<string, any>) {
  return apiFetch<{ data: APILead }>('/api/leads', { method: 'POST', body: JSON.stringify(body) })
}

export async function convertLead(id: string, body: Record<string, any>) {
  return apiFetch<{ data: any }>(`/api/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(body) })
}

// ─── Offers / Contracts / Activities (per client) ───

export async function fetchOffers(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ data: any[]; pagination: APIPagination }>(`/api/offers${qs}`)
}

export async function fetchContracts(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ data: any[]; pagination: APIPagination }>(`/api/contracts${qs}`)
}

export async function fetchActivitiesByEntity(entityId: string) {
  return apiFetch<{ data: any[] }>(`/api/activities/entity/${entityId}`)
}

// ─── Suppliers ───

export interface APISupplier {
  id: string
  tenantId: string
  name: string
  cui: string | null
  iban: string | null
  category: string | null
  isRecurring: boolean
  expectedDay: number | null
  status: string
  createdAt: string
  _count?: {
    invoices: number
  }
}

export async function fetchSuppliers(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ data: APISupplier[] }>(`/api/suppliers${qs}`)
}
export interface APISupplierPayment {
  id: string
  amount: number
  paidAt: string
  method: string | null
}

export interface APISupplierInvoice {
  id: string
  supplierId: string
  amount: number
  currency: string
  issueDate: string
  dueDate: string | null
  invoiceNumber: string | null
  pdfUrl: string
  status: string
  source: string
  extractionStatus: string
  createdAt: string
  payments?: APISupplierPayment[]
}

export interface APISupplierDetails extends APISupplier {
  invoices: APISupplierInvoice[]
}

export async function fetchSupplier(id: string) {
  return apiFetch<{ data: APISupplierDetails }>(`/api/suppliers/${id}`)
}

