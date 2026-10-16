/* eslint-disable @typescript-eslint/no-explicit-any */
export const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
export const textareaCls = inputCls.replace("h-9 ", "min-h-[84px] py-2 ")
export const labelCls = "block text-xs font-semibold text-foreground mb-1.5"

export class ApiError extends Error {
  constructor(message: string, readonly details?: string[]) { super(message) }
}

/** JSON helper for /api/website/*: returns `data`, throws ApiError with the server's message and issue list. */
export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(j.error || "Eroare", Array.isArray(j.details) ? j.details.map(String) : undefined)
  return j.data as T
}

export const STATUS_RO: Record<string, string> = { draft: "Ciornă", published: "Publicat", suspended: "Suspendat", pending: "În așteptare", approved: "Aprobată", rejected: "Respinsă" }
export const KIND_RO: Record<string, string> = { listing: "Listă (directoare)", article: "Articole", project: "Proiecte", other: "Altele" }
export const FIELD_TYPE_RO: Record<string, string> = { text: "Text", number: "Număr", select: "Alegere", date: "Dată", rating: "Rating 0–5", list: "Listă" }

export interface Field { key: string; label: string; type: "text" | "number" | "select" | "date" | "rating" | "list"; options?: string[]; required?: boolean; filterable?: boolean }
export interface Collection { id: string; key: string; name: string; namePlural: string; kind: string; fields: Field[]; sortOrder: number; isActive: boolean; entryCount?: number }

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) : "—")
