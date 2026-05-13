"use client"

import type { ReactNode } from "react"
import { SidebarLeft } from "@/components/sidebar-left"
import { Header } from "@/components/header"
import { ContextualPanel } from "@/components/contextual-panel"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { PanelProvider, usePanel } from "@/components/panel-context"
import { BusinessLineProvider } from "@/components/business-line-context"
import { CopilotProvider, AICopilotPanel, useCopilot } from "@/components/ai-copilot"
import { CommandPalette } from "@/components/command-palette"

function DashboardShell({ children }: { children: ReactNode }) {
  const { panelData, closePanel } = usePanel()
  const { open: copilotOpen } = useCopilot()

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* 1. Left Sidebar */}
      <SidebarLeft />

      {/* 2. Main Content Zone — shrinks when copilot is open */}
      <div className="flex-1 flex flex-col min-w-0 h-full transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-auto bg-background pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* 3. Right Contextual Panel */}
      <ContextualPanel panelData={panelData} onClose={closePanel} />

      {/* 4. AI Copilot — push sidebar (inline, not overlay) */}
      <AICopilotPanel />

      {/* 5. Mobile Bottom Tab Bar */}
      <MobileBottomNav />

      {/* 6. Command Palette — opens with / */}
      <CommandPalette />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <BusinessLineProvider>
      <CopilotProvider>
        <PanelProvider>
          <DashboardShell>{children}</DashboardShell>
        </PanelProvider>
      </CopilotProvider>
    </BusinessLineProvider>
  )
}
