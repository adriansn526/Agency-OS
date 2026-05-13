"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Client, Lead } from "@repo/mock-data"

type PanelData =
  | { type: "client"; data: Client }
  | { type: "lead"; data: Lead }
  | null

interface PanelContextType {
  panelData: PanelData
  openClient: (client: Client) => void
  openLead: (lead: Lead) => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panelData, setPanelData] = useState<PanelData>(null)

  const openClient = useCallback((client: Client) => {
    setPanelData({ type: "client", data: client })
  }, [])

  const openLead = useCallback((lead: Lead) => {
    setPanelData({ type: "lead", data: lead })
  }, [])

  const closePanel = useCallback(() => {
    setPanelData(null)
  }, [])

  return (
    <PanelContext.Provider value={{ panelData, openClient, openLead, closePanel }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error("usePanel must be used within PanelProvider")
  return ctx
}
