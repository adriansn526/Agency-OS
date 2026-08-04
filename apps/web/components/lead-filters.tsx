"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Filter, Plus, X, ChevronDown, Search, Star, Globe, MapPin,
  Hash, BarChart3, Tag, Zap, SlidersHorizontal, RotateCcw,
  Flame, Smartphone, Building2, TrendingUp, Calendar,
} from "lucide-react"

/* ============================================================
   Types & Configuration
   ============================================================ */

export interface FilterCondition {
  id: string
  field: string
  operator: FilterOperator
  value: any
}

export type FilterOperator =
  | "equals" | "not_equals"
  | "contains" | "starts_with" | "not_contains"
  | "gt" | "gte" | "lt" | "lte"
  | "exists" | "not_exists"
  | "in" | "not_in"

type FieldType = "text" | "number" | "enum" | "boolean" | "date" | "exists"

interface FilterableProperty {
  key: string
  label: string
  icon: React.ReactNode
  type: FieldType
  group: string
  jsonPath?: string[]  // for customFields — e.g. ['bolt_rating']
  options?: { value: string; label: string }[]  // for enum type
}

interface OperatorDef {
  value: FilterOperator
  label: string
  symbol: string
}

const operatorsByType: Record<FieldType, OperatorDef[]> = {
  text: [
    { value: "contains", label: "conține", symbol: "⊃" },
    { value: "not_contains", label: "nu conține", symbol: "⊄" },
    { value: "equals", label: "este", symbol: "=" },
    { value: "not_equals", label: "nu este", symbol: "≠" },
    { value: "starts_with", label: "începe cu", symbol: "^" },
    { value: "exists", label: "există", symbol: "∃" },
    { value: "not_exists", label: "nu există", symbol: "∄" },
  ],
  number: [
    { value: "gte", label: "≥ mai mare sau egal", symbol: "≥" },
    { value: "gt", label: "> mai mare", symbol: ">" },
    { value: "lte", label: "≤ mai mic sau egal", symbol: "≤" },
    { value: "lt", label: "< mai mic", symbol: "<" },
    { value: "equals", label: "= egal", symbol: "=" },
    { value: "not_equals", label: "≠ diferit", symbol: "≠" },
    { value: "exists", label: "există", symbol: "∃" },
    { value: "not_exists", label: "nu există", symbol: "∄" },
  ],
  enum: [
    { value: "equals", label: "este", symbol: "=" },
    { value: "not_equals", label: "nu este", symbol: "≠" },
    { value: "in", label: "este oricare din", symbol: "∈" },
    { value: "not_in", label: "nu este niciunul din", symbol: "∉" },
  ],
  boolean: [
    { value: "equals", label: "este", symbol: "=" },
  ],
  date: [
    { value: "gt", label: "după", symbol: ">" },
    { value: "lt", label: "înainte de", symbol: "<" },
    { value: "gte", label: "de la", symbol: "≥" },
    { value: "lte", label: "până la", symbol: "≤" },
  ],
  exists: [
    { value: "exists", label: "există", symbol: "∃" },
    { value: "not_exists", label: "nu există", symbol: "∄" },
  ],
}

/* ── All filterable properties ── */

const filterableProperties: FilterableProperty[] = [
  // ─── Lead (General) ───
  { key: "companyName", label: "Companie", icon: <Building2 size={13} />, type: "text", group: "Lead" },
  { key: "createdAt", label: "Data Creării", icon: <Calendar size={13} />, type: "date", group: "Lead" },
  { key: "contactPerson", label: "Persoană Contact", icon: <Search size={13} />, type: "text", group: "Lead" },
  { key: "city", label: "Oraș", icon: <MapPin size={13} />, type: "text", group: "Lead" },
  { key: "status", label: "Status", icon: <Tag size={13} />, type: "enum", group: "Lead",
    options: [
      { value: "nou", label: "Nou" }, { value: "cold", label: "Cold" },
      { value: "trial", label: "Trial" }, { value: "onboarding", label: "Onboarding" },
      { value: "activ_fudly", label: "Activ" },
      { value: "churn_risk", label: "Churn Risk" }, { value: "churned", label: "Churned" },
      { value: "contactat", label: "Contactat" }, { value: "calificat", label: "Calificat" },
      { value: "oferta_trimisa", label: "Ofertă Trimisă" }, { value: "negociere", label: "Negociere" },
      { value: "castigat", label: "Câștigat" }, { value: "pierdut", label: "Pierdut" },
    ]
  },
  { key: "source", label: "Sursă", icon: <Zap size={13} />, type: "text", group: "Lead" },
  { key: "priority", label: "Prioritate", icon: <TrendingUp size={13} />, type: "enum", group: "Lead",
    options: [
      { value: "urgent", label: "Urgent" }, { value: "high", label: "Ridicat" },
      { value: "medium", label: "Mediu" }, { value: "low", label: "Scăzut" },
    ]
  },
  { key: "probability", label: "Probabilitate", icon: <BarChart3 size={13} />, type: "number", group: "Lead" },
  { key: "estimatedValue", label: "Valoare (EUR)", icon: <Hash size={13} />, type: "number", group: "Lead" },

  // ─── Contact ───
  { key: "email", label: "Email", icon: <Globe size={13} />, type: "text", group: "Contact" },
  { key: "phone", label: "Telefon", icon: <Smartphone size={13} />, type: "text", group: "Contact" },
  { key: "phone2", label: "Telefon 2", icon: <Smartphone size={13} />, type: "text", group: "Contact" },
  { key: "phone3", label: "Telefon 3", icon: <Smartphone size={13} />, type: "text", group: "Contact" },
  { key: "email2", label: "Email 2", icon: <Globe size={13} />, type: "text", group: "Contact" },
  { key: "contactRole", label: "Funcție Contact", icon: <Search size={13} />, type: "text", group: "Contact" },

  // ─── Business (CSV imported) ───
  { key: "cui", label: "CUI (Cod Fiscal)", icon: <Hash size={13} />, type: "text", group: "Business" },
  { key: "county", label: "Județ", icon: <MapPin size={13} />, type: "text", group: "Business" },
  { key: "industry", label: "Industrie", icon: <Tag size={13} />, type: "enum", group: "Business",
    options: [
      { value: "agricultura", label: "Agricultură" }, { value: "comert", label: "Comerț" },
      { value: "constructii", label: "Construcții" }, { value: "medical", label: "Medical" },
      { value: "fonduri", label: "Fonduri" }, { value: "altele", label: "Altele" },
    ]
  },
  { key: "caenCode", label: "Cod CAEN", icon: <Hash size={13} />, type: "text", group: "Business" },
  { key: "caenDescription", label: "Descriere CAEN", icon: <Search size={13} />, type: "text", group: "Business" },
  { key: "revenue", label: "Cifra Afaceri (RON)", icon: <BarChart3 size={13} />, type: "number", group: "Business" },
  { key: "employees", label: "Nr. Angajați", icon: <Hash size={13} />, type: "number", group: "Business" },
  { key: "companyStatus", label: "Stare Firmă", icon: <Tag size={13} />, type: "enum", group: "Business",
    options: [
      { value: "Functiune", label: "Funcțiune" }, { value: "Dizolvare", label: "Dizolvare" },
      { value: "Radiere", label: "Radiere" },
    ]
  },
  { key: "foundedYear", label: "An Înființare", icon: <Hash size={13} />, type: "number", group: "Business" },
  { key: "website", label: "Website", icon: <Globe size={13} />, type: "text", group: "Business" },
  { key: "activityDomain", label: "Domeniu Activitate", icon: <Tag size={13} />, type: "text", group: "Business" },
  { key: "services", label: "Servicii", icon: <Search size={13} />, type: "text", group: "Business" },

  // ─── BoltFood (Custom Fields) ───
  { key: "cf.bolt_rating", label: "⭐ Rating Bolt", icon: <Star size={13} />, type: "number", group: "BoltFood", jsonPath: ["bolt_rating"] },
  { key: "cf.bolt_reviews", label: "Reviews Bolt", icon: <BarChart3 size={13} />, type: "number", group: "BoltFood", jsonPath: ["bolt_reviews"] },
  { key: "cf.bolt_url", label: "🔗 Profil Bolt", icon: <Globe size={13} />, type: "text", group: "BoltFood", jsonPath: ["bolt_url"] },
  { key: "cf.bolt_sponsored", label: "Sponsorizat", icon: <Zap size={13} />, type: "boolean", group: "BoltFood", jsonPath: ["bolt_sponsored"] },
  { key: "cf.interest_score", label: "🎯 Scor Interes", icon: <Flame size={13} />, type: "number", group: "BoltFood", jsonPath: ["interest_score"] },
  { key: "cf.segment", label: "Segment", icon: <Tag size={13} />, type: "enum", group: "BoltFood", jsonPath: ["segment"],
    options: [
      { value: "hot", label: "🔥 Hot" }, { value: "high", label: "🟢 High" },
      { value: "medium", label: "🟡 Medium" }, { value: "low", label: "⚪ Low" },
    ]
  },
  { key: "cf.quality_tier", label: "Calitate", icon: <Star size={13} />, type: "enum", group: "BoltFood", jsonPath: ["quality_tier"],
    options: [
      { value: "premium", label: "Premium" }, { value: "good", label: "Bun" },
      { value: "average", label: "Mediu" }, { value: "low", label: "Scăzut" },
    ]
  },
  { key: "cf.digital_presence", label: "Prezență Digitală", icon: <Smartphone size={13} />, type: "enum", group: "BoltFood", jsonPath: ["digital_presence"],
    options: [
      { value: "none", label: "Inexistentă" }, { value: "basic", label: "Basic" }, { value: "strong", label: "Puternică" },
    ]
  },
]

/* ── Quick presets ── */

export interface FilterPreset {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  filters: Omit<FilterCondition, "id">[]
}

export const filterPresets: FilterPreset[] = [
  {
    id: "hot_leads",
    label: "🔥 Hot Leads",
    icon: <Flame size={13} />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    filters: [
      { field: "cf.interest_score", operator: "gte", value: 75 },
    ],
  },
  {
    id: "top_rated",
    label: "⭐ Rating 4.5+",
    icon: <Star size={13} />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    filters: [
      { field: "cf.bolt_rating", operator: "gte", value: 4.5 },
    ],
  },
  {
    id: "no_website",
    label: "📱 Fără Website",
    icon: <Smartphone size={13} />,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    filters: [
      { field: "cf.digital_presence", operator: "equals", value: "none" },
    ],
  },
  {
    id: "bucuresti",
    label: "🏙️ București",
    icon: <Building2 size={13} />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    filters: [
      { field: "city", operator: "contains", value: "Bucure" },
    ],
  },
  {
    id: "popular_no_site",
    label: "🎯 Popular + Fără Site",
    icon: <TrendingUp size={13} />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    filters: [
      { field: "cf.bolt_reviews", operator: "gte", value: 100 },
      { field: "cf.digital_presence", operator: "equals", value: "none" },
    ],
  },
  {
    id: "bolt_only",
    label: "🔒 Doar pe Bolt",
    icon: <Zap size={13} />,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    filters: [
      { field: "cf.bolt_url", operator: "exists", value: true },
      { field: "cf.digital_presence", operator: "not_equals", value: "strong" },
    ],
  },
]

/* ============================================================
   Filter Engine — Client-side evaluation
   ============================================================ */

function getFieldValue(lead: any, fieldKey: string): any {
  if (fieldKey.startsWith("cf.")) {
    const jsonKey = fieldKey.replace("cf.", "")
    return lead.customFields?.[jsonKey] ?? null
  }
  return lead[fieldKey] ?? null
}

function evaluateCondition(lead: any, condition: FilterCondition): boolean {
  const value = getFieldValue(lead, condition.field)
  const target = condition.value

  switch (condition.operator) {
    case "equals":
      if (typeof value === "string" && typeof target === "string") {
        return value.toLowerCase() === target.toLowerCase()
      }
      return value == target // eslint-disable-line
    case "not_equals":
      if (typeof value === "string" && typeof target === "string") {
        return value.toLowerCase() !== target.toLowerCase()
      }
      return value != target // eslint-disable-line
    case "contains":
      return typeof value === "string" && value.toLowerCase().includes(String(target).toLowerCase())
    case "not_contains":
      return typeof value === "string" && !value.toLowerCase().includes(String(target).toLowerCase())
    case "starts_with":
      return typeof value === "string" && value.toLowerCase().startsWith(String(target).toLowerCase())
    case "gt":
      if (typeof value === "string" && typeof target === "string" && isNaN(Number(target))) return new Date(value) > new Date(target)
      return typeof value === "number" && value > Number(target)
    case "gte":
      if (typeof value === "string" && typeof target === "string" && isNaN(Number(target))) return new Date(value) >= new Date(target)
      return typeof value === "number" && value >= Number(target)
    case "lt":
      if (typeof value === "string" && typeof target === "string" && isNaN(Number(target))) return new Date(value) < new Date(target)
      return typeof value === "number" && value < Number(target)
    case "lte":
      if (typeof value === "string" && typeof target === "string" && isNaN(Number(target))) return new Date(value) <= new Date(target)
      return typeof value === "number" && value <= Number(target)
    case "exists":
      return value !== null && value !== undefined && value !== ""
    case "not_exists":
      return value === null || value === undefined || value === ""
    case "in":
      return Array.isArray(target) && target.includes(value)
    case "not_in":
      return Array.isArray(target) && !target.includes(value)
    default:
      return true
  }
}

export function applyFilters(leads: any[], filters: FilterCondition[]): any[] {
  if (filters.length === 0) return leads
  return leads.filter(lead => filters.every(f => evaluateCondition(lead, f)))
}

/* ============================================================
   UI Components
   ============================================================ */

let filterIdCounter = 0
function genFilterId() { return `f_${++filterIdCounter}_${Date.now()}` }

/* ── Property Selector Dropdown ── */

function PropertySelector({ value, onChange, onClose }: { value: string; onChange: (key: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  const groups = useMemo(() => {
    const filtered = filterableProperties.filter(p =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    )
    const map = new Map<string, FilterableProperty[]>()
    filtered.forEach(p => {
      if (!map.has(p.group)) map.set(p.group, [])
      map.get(p.group)!.push(p)
    })
    return map
  }, [search])

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            placeholder="Caută proprietate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-muted/50 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 border border-border"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {Array.from(groups.entries()).map(([group, props]) => (
          <div key={group}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{group}</div>
            {props.map(p => (
              <button
                key={p.key}
                onClick={() => { onChange(p.key); onClose() }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors",
                  value === p.key ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                <span className="text-muted-foreground">{p.icon}</span>
                <span className="font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Operator Selector ── */

function OperatorSelector({ fieldType, value, onChange }: { fieldType: FieldType; value: FilterOperator; onChange: (op: FilterOperator) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const operators = operatorsByType[fieldType] || operatorsByType.text

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const current = operators.find(o => o.value === value) || operators[0]!
  if (!current) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2.5 min-w-[80px] flex items-center justify-between gap-1.5 bg-muted/50 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="text-primary font-bold">{current.symbol}</span>
        <span className="truncate">{current.label}</span>
        <ChevronDown size={11} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-xl shadow-2xl z-50 p-1 animate-fade-in">
          {operators.map(op => (
            <button
              key={op.value}
              onClick={() => { onChange(op.value); setOpen(false) }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors",
                value === op.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              )}
            >
              <span className="w-5 text-center font-bold text-primary">{op.symbol}</span>
              <span>{op.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Value Input ── */

function ValueInput({ property, value, onChange }: { property: FilterableProperty; value: any; onChange: (v: any) => void }) {
  // exists/not_exists don't need value input
  if (!property) return null

  if (property.type === "exists") return null

  if (property.type === "enum" && property.options) {
    return (
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="h-8 px-2.5 min-w-[120px] bg-muted/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
      >
        <option value="">Selectează...</option>
        {property.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  if (property.type === "boolean") {
    return (
      <select
        value={String(value ?? "")}
        onChange={e => onChange(e.target.value === "true")}
        className="h-8 px-2.5 min-w-[100px] bg-muted/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        <option value="">Selectează...</option>
        <option value="true">Da</option>
        <option value="false">Nu</option>
      </select>
    )
  }

  return (
    <input
      type={property.type === "date" ? "date" : property.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={e => onChange(property.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
      placeholder={property.type === "number" ? "0" : "Valoare..."}
      step={property.type === "number" ? "0.1" : undefined}
      className="h-8 px-2.5 w-32 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
    />
  )
}

/* ── Single Filter Row ── */

function FilterRow({
  filter,
  index,
  onUpdate,
  onRemove,
}: {
  filter: FilterCondition
  index: number
  onUpdate: (f: FilterCondition) => void
  onRemove: () => void
}) {
  const [showPropertyPicker, setShowPropertyPicker] = useState(!filter.field)
  const property = filterableProperties.find(p => p.key === filter.field)
  const needsValue = filter.operator !== "exists" && filter.operator !== "not_exists"

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      {index > 0 && (
        <span className="text-[10px] font-bold uppercase text-primary/60 w-6 text-center flex-shrink-0">ȘI</span>
      )}
      {index === 0 && <span className="w-6 flex-shrink-0" />}

      {/* Property */}
      <div className="relative">
        <button
          onClick={() => setShowPropertyPicker(!showPropertyPicker)}
          className={cn(
            "h-8 px-2.5 min-w-[130px] flex items-center gap-1.5 rounded-lg text-xs font-medium border transition-colors",
            property
              ? "bg-muted/50 border-border text-foreground hover:bg-muted"
              : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
          )}
        >
          {property ? (
            <>
              <span className="text-muted-foreground">{property.icon}</span>
              <span className="truncate">{property.label}</span>
            </>
          ) : (
            <>
              <Plus size={12} />
              <span>Proprietate</span>
            </>
          )}
          <ChevronDown size={11} className="ml-auto text-muted-foreground flex-shrink-0" />
        </button>
        {showPropertyPicker && (
          <PropertySelector
            value={filter.field}
            onChange={key => {
              const prop = filterableProperties.find(p => p.key === key)
              const defaultOp = prop ? (operatorsByType[prop.type]?.[0]?.value || "equals") : "equals"
              onUpdate({ ...filter, field: key, operator: defaultOp, value: "" })
            }}
            onClose={() => setShowPropertyPicker(false)}
          />
        )}
      </div>

      {/* Operator */}
      {property && (
        <OperatorSelector
          fieldType={property.type}
          value={filter.operator}
          onChange={op => onUpdate({ ...filter, operator: op, value: (op === "exists" || op === "not_exists") ? true : filter.value })}
        />
      )}

      {/* Value */}
      {property && needsValue && (
        <ValueInput
          property={property}
          value={filter.value}
          onChange={v => onUpdate({ ...filter, value: v })}
        />
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}

/* ============================================================
   Main FilterBar Component
   ============================================================ */

export function FilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: {
  filters: FilterCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
  totalCount: number
  filteredCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const activePreset = useMemo(() => {
    return filterPresets.find(preset =>
      preset.filters.length === filters.length &&
      preset.filters.every(pf =>
        filters.some(f => f.field === pf.field && f.operator === pf.operator && f.value == pf.value)
      )
    )
  }, [filters])

  const addFilter = useCallback(() => {
    onFiltersChange([...filters, { id: genFilterId(), field: "", operator: "equals", value: "" }])
    setExpanded(true)
  }, [filters, onFiltersChange])

  const updateFilter = useCallback((index: number, updated: FilterCondition) => {
    const next = [...filters]
    next[index] = updated
    onFiltersChange(next)
  }, [filters, onFiltersChange])

  const removeFilter = useCallback((index: number) => {
    const next = filters.filter((_, i) => i !== index)
    onFiltersChange(next)
    if (next.length === 0) setExpanded(false)
  }, [filters, onFiltersChange])

  const applyPreset = useCallback((preset: FilterPreset) => {
    onFiltersChange(preset.filters.map(f => ({ ...f, id: genFilterId() })))
    setExpanded(true)
  }, [onFiltersChange])

  const clearAll = useCallback(() => {
    onFiltersChange([])
    setExpanded(false)
  }, [onFiltersChange])

  const hasFilters = filters.length > 0
  const isFiltered = filteredCount < totalCount

  return (
    <>
      {/* Inline controls — sits in the same flex row as search & status tabs */}
      <div className="flex items-center gap-1.5">
        {/* Presets (quick access) */}
        {filterPresets.slice(0, 4).map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded-md border transition-all whitespace-nowrap",
              activePreset?.id === preset.id
                ? preset.color + " border-current/30"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
            )}
          >
            {preset.label}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Advanced toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
            hasFilters
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal size={12} />
          <span className="hidden sm:inline">Filtre</span>
          {hasFilters && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
              {filters.length}
            </span>
          )}
        </button>

        {/* Active filter pills (collapsed) */}
        {hasFilters && !expanded && (
          <>
            {filters.slice(0, 2).map((f, i) => {
              const prop = filterableProperties.find(p => p.key === f.field)
              const op = operatorsByType[prop?.type || "text"]?.find(o => o.value === f.operator)
              return (
                <div key={f.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/5 border border-primary/15 rounded text-[10px]">
                  {i > 0 && <span className="text-[8px] text-primary/50 font-bold">ȘI</span>}
                  <span className="font-medium text-foreground truncate max-w-[60px]">{prop?.label || f.field}</span>
                  <span className="text-primary font-bold">{op?.symbol}</span>
                  {f.operator !== "exists" && f.operator !== "not_exists" && (
                    <span className="text-muted-foreground truncate max-w-[40px]">{String(f.value)}</span>
                  )}
                  <button onClick={() => removeFilter(filters.indexOf(f))} className="text-muted-foreground hover:text-red-400">
                    <X size={9} />
                  </button>
                </div>
              )
            })}
            {filters.length > 2 && (
              <span className="text-[9px] text-muted-foreground">+{filters.length - 2}</span>
            )}
          </>
        )}

        {/* Result counter */}
        {isFiltered && (
          <div className="flex items-center gap-1 pl-1.5 border-l border-border">
            <span className="text-[11px] font-bold text-primary tabular-nums">{filteredCount.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground">/{totalCount.toLocaleString()}</span>
          </div>
        )}

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>

      {/* Expanded filter builder — renders outside the inline row, full width */}
      {expanded && (
        <div className="absolute left-0 right-0 top-full mt-0 bg-surface border-t border-border/50 rounded-b-xl p-3 space-y-2 animate-fade-in z-40 shadow-lg">
          {/* Preset chips */}
          {!hasFilters && (
            <div className="flex items-center gap-1.5 flex-wrap pb-1">
              <span className="text-[10px] text-muted-foreground mr-1">Preset-uri:</span>
              {filterPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all",
                    preset.color, "hover:opacity-80"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter rows */}
          {filters.map((filter, i) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              index={i}
              onUpdate={f => updateFilter(i, f)}
              onRemove={() => removeFilter(i)}
            />
          ))}

          {/* Add filter */}
          <button
            onClick={addFilter}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary/70 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors ml-6"
          >
            <Plus size={13} />
            <span>Adaugă filtru</span>
          </button>
        </div>
      )}
    </>
  )
}
