"use client"

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from "react"
import { businessLines as mockBusinessLines, hasMultipleEntityTypes, type BusinessLine, type EntityType } from "@repo/mock-data"

type BusinessLineId = string | "all"
type EntityTypeId = string | "all"

interface BusinessLineContextType {
  // Level 1: Business Line
  activeLineId: BusinessLineId
  setActiveLineId: (id: BusinessLineId) => void
  activeLine: BusinessLine | null
  lines: BusinessLine[]
  isAll: boolean

  // Level 2: Entity Type
  activeEntityTypeId: EntityTypeId
  setActiveEntityTypeId: (id: EntityTypeId) => void
  activeEntityType: EntityType | null
  hasMultipleTypes: boolean
  entityTypes: EntityType[]

  // Filtering
  filterData: <T extends { businessLine: string }>(data: T[]) => T[]
  filterDataWithEntityType: <T extends { businessLine: string; entityType: string }>(data: T[]) => T[]
}

const BusinessLineContext = createContext<BusinessLineContextType | null>(null)

export function BusinessLineProvider({ children }: { children: ReactNode }) {
  const [activeLineId, setActiveLineIdRaw] = useState<BusinessLineId>("all")
  const [activeEntityTypeId, setActiveEntityTypeIdRaw] = useState<EntityTypeId>("all")
  const [isLoaded, setIsLoaded] = useState(false)
  const [lines, setLines] = useState<BusinessLine[]>(mockBusinessLines)

  // Fetch real business lines from DB
  useEffect(() => {
    fetch("/api/settings/business-lines")
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          const dbLines: BusinessLine[] = json.data.map((dbBl: any) => ({
            id: dbBl.id,
            name: dbBl.name,
            shortName: dbBl.name,
            icon: dbBl.icon || "🏢",
            color: dbBl.color || "#2563eb",
            bgClass: "bg-muted", 
            textClass: "text-foreground",
            entityTypes: dbBl.config?.entityTypes || [],
            projectTemplates: dbBl.config?.projectTemplates || [],
            offerTemplates: dbBl.config?.offerTemplates || [],
            metrics: dbBl.config?.metrics || [],
          }))
          setLines(dbLines)
        }
      })
      .catch((err) => console.error("Failed to fetch business lines for context:", err))
  }, [])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedBl = localStorage.getItem("agencyos_active_bl")
      const savedEt = localStorage.getItem("agencyos_active_et")
      if (savedBl) setActiveLineIdRaw(savedBl)
      if (savedEt) setActiveEntityTypeIdRaw(savedEt)
    } catch { /* silent */ }
    setIsLoaded(true)
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem("agencyos_active_bl", activeLineId)
      localStorage.setItem("agencyos_active_et", activeEntityTypeId)
    } catch { /* silent */ }
  }, [activeLineId, activeEntityTypeId, isLoaded])

  const setActiveEntityTypeId = (id: EntityTypeId) => {
    setActiveEntityTypeIdRaw(id)
  }

  // When switching business line, auto-select entity type
  const setActiveLineId = (id: BusinessLineId) => {
    setActiveLineIdRaw(id)
    if (id === "all") {
      setActiveEntityTypeId("all")
    } else {
      const bl = lines.find((bl) => bl.id === id)
      if (bl && bl.entityTypes.length === 1) {
        // Single entity type → auto-select
        setActiveEntityTypeId(bl.entityTypes[0]!.id)
      } else {
        // Multiple → show "all" first
        setActiveEntityTypeId("all")
      }
    }
  }

  const activeLine = activeLineId === "all"
    ? null
    : lines.find((bl) => bl.id === activeLineId) || null

  const entityTypes = activeLine?.entityTypes ?? []
  const hasMultipleTypes = entityTypes.length > 1

  const activeEntityType = useMemo(() => {
    if (!activeLine || activeEntityTypeId === "all") return null
    return activeLine.entityTypes.find((et) => et.id === activeEntityTypeId) || null
  }, [activeLine, activeEntityTypeId])

  const filterData = <T extends { businessLine: string }>(data: T[]): T[] => {
    if (activeLineId === "all") return data
    return data.filter((item) => item.businessLine === activeLineId)
  }

  const filterDataWithEntityType = <T extends { businessLine: string; entityType: string }>(data: T[]): T[] => {
    let result = filterData(data)
    if (activeEntityTypeId !== "all" && activeLine) {
      result = result.filter((item) => item.entityType === activeEntityTypeId)
    }
    return result
  }

  return (
    <BusinessLineContext.Provider
      value={{
        activeLineId,
        setActiveLineId,
        activeLine,
        lines,
        isAll: activeLineId === "all",
        activeEntityTypeId,
        setActiveEntityTypeId,
        activeEntityType,
        hasMultipleTypes,
        entityTypes,
        filterData,
        filterDataWithEntityType,
      }}
    >
      {children}
    </BusinessLineContext.Provider>
  )
}

export function useBusinessLine() {
  const ctx = useContext(BusinessLineContext)
  if (!ctx) throw new Error("useBusinessLine must be used within BusinessLineProvider")
  return ctx
}
