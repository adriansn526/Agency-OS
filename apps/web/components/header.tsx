"use client"

import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { BusinessLineSwitcher, EntityTypeSelector } from "@/components/business-line-switcher"
import { useCopilot } from "@/components/ai-copilot"
import { Search, Bell, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const breadcrumbMap: Record<string, string> = {
  "/crm": "CRM",
  "/crm/clienti": "Clienți",
  "/crm/lead-uri": "Lead-uri",
  "/projects": "Proiecte",
  "/finance": "Financiar",
  "/offers": "Oferte",
  "/activity": "Activity Log",
  "/reports": "Rapoarte",
  "/communications": "Comunicare",
  "/documents": "Documente",
  "/hr": "HR",
  "/automations": "Automatizări",
  "/wiki": "Knowledge Base",
  "/settings": "Setări",
  "/settings/business-lines": "Business Lines",
  "/settings/pipelines": "Pipeline-uri",
  "/settings/integrations": "Integrări & AI",
  "/settings/roles": "Roluri & Permisiuni",
  "/settings/language": "Limbă",
}

export function Header() {
  const pathname = usePathname()
  const { open: copilotOpen, toggle: toggleCopilot } = useCopilot()

  const segments = pathname.split("/").filter(Boolean)
  const crumbs = segments.length === 0
    ? [{ path: "/", label: "Dashboard" }]
    : segments.map((_, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/")
        return { path, label: breadcrumbMap[path] || segments[i]! }
      })

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-20 overflow-hidden">
      {/* Main bar */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6 gap-2 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-shrink overflow-hidden">
          <h1 className="md:hidden text-sm font-semibold text-foreground truncate">
            {crumbs.length > 0 ? crumbs[crumbs.length - 1]!.label : "Agency OS"}
          </h1>
          <nav className="hidden md:flex items-center gap-1 text-sm min-w-0 overflow-hidden">
            {crumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <span className="text-muted-foreground mx-0.5">/</span>}
                <span className={cn("font-medium truncate", i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground")}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Business Line Switcher — center (hidden when copilot open to save space) */}
        <div className={cn("hidden md:flex items-center flex-shrink-0", copilotOpen && "lg:hidden xl:flex")}>
          <BusinessLineSwitcher compact />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="md:hidden">
            <BusinessLineSwitcher compact />
          </div>
          <button className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-muted/60 text-muted-foreground text-xs hover:bg-muted transition-colors flex-shrink-0">
            <Search size={14} />
            <span className={cn("hidden sm:inline", copilotOpen && "sm:hidden lg:inline")}>Caută...</span>
            <kbd className={cn("hidden lg:inline-flex items-center px-1.5 py-0.5 bg-surface rounded border border-border text-[10px] font-mono ml-1", copilotOpen && "lg:hidden xl:inline-flex")}>⌘K</kbd>
          </button>
          <button className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-foreground-secondary hover:text-foreground transition-colors flex-shrink-0">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse-subtle" />
          </button>
          <button
            onClick={toggleCopilot}
            className={cn(
              "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0",
              copilotOpen
                ? "bg-gradient-to-br from-violet-600/15 to-pink-600/15 text-violet-500"
                : "hover:bg-muted text-foreground-secondary hover:text-foreground"
            )}
            title="AI Copilot"
          >
            <Sparkles size={17} />
          </button>
          <div className={cn("hidden sm:block", copilotOpen && "sm:hidden xl:block")}><ThemeToggle /></div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:shadow-glow transition-shadow flex-shrink-0">AS</div>
        </div>
      </div>

      {/* Entity Type selector — second row, only when needed */}
      <EntityTypeBar />
    </header>
  )
}

function EntityTypeBar() {
  return (
    <div className="px-4 md:px-6">
      <div className="py-1.5">
        <EntityTypeSelector />
      </div>
    </div>
  )
}
