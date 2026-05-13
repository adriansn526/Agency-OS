"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import { businessLines, hasMultipleEntityTypes, type BusinessLine, type EntityType } from "@repo/mock-data"

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
  const [activeEntityTypeId, setActiveEntityTypeId] = useState<EntityTypeId>("all")

  // When switching business line, auto-select entity type
  const setActiveLineId = (id: BusinessLineId) => {
    setActiveLineIdRaw(id)
    if (id === "all") {
      setActiveEntityTypeId("all")
    } else {
      const bl = businessLines.find((bl) => bl.id === id)
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
    : businessLines.find((bl) => bl.id === activeLineId) || null

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
        lines: businessLines,
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
