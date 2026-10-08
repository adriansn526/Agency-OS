"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { BusinessLineSwitcher, EntityTypeSelector } from "@/components/business-line-switcher"
import { useCopilot } from "@/components/ai-copilot"
import { Search, Bell, Sparkles, LogOut, Settings, User, CreditCard, Shield, Globe, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { SystemAlertsSidebar } from "@/components/system-alerts-sidebar"

const breadcrumbMap: Record<string, string> = {
  "/crm": "CRM",
  "/crm/clienti": "Clienți",
  "/crm/lead-uri": "Lead-uri",
  "/projects": "Proiecte",
  "/finance": "Financiar",
  "/offers": "Oferte",
  "/activity": "Activity Log",
  "/reports": "Rapoarte",
  "/seo": "SEO Dashboard",
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
  "/intraconstruct": "IntraConstruct",
  "/intraconstruct/tenants": "Tenanți",
  "/intraconstruct/usage": "AI Usage",
  "/contracts": "Contracte",
  "/marketing": "Marketing",
  "/monitoring": "Monitoring",
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

  const [alertsOpen, setAlertsOpen] = useState(false)
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0)

  // Fetch count on mount
  useEffect(() => {
    fetch("/api/alerts")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUnreadAlertsCount(data.alerts.length)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <>
      <header className="border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-20">
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
            <button 
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-muted/60 text-muted-foreground text-xs hover:bg-muted transition-colors flex-shrink-0"
            >
              <Search size={14} />
              <span className={cn("hidden sm:inline", copilotOpen && "sm:hidden lg:inline")}>Caută...</span>
              <kbd className={cn("hidden lg:inline-flex items-center px-1.5 py-0.5 bg-surface rounded border border-border text-[10px] font-mono ml-1", copilotOpen && "lg:hidden xl:inline-flex")}>⌘K</kbd>
            </button>
            <button 
              onClick={() => setAlertsOpen(true)}
              className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-foreground-secondary hover:text-foreground transition-colors flex-shrink-0"
            >
              <Bell size={18} />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                  {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
                </span>
              )}
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
            <UserDropdown />
          </div>
        </div>

        {/* Entity Type selector — second row, only when needed */}
        <EntityTypeBar />
      </header>

      <SystemAlertsSidebar 
        open={alertsOpen} 
        onClose={() => setAlertsOpen(false)} 
        onAlertsChange={setUnreadAlertsCount} 
      />
    </>
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

function UserDropdown() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "AS"

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:shadow-glow transition-shadow flex-shrink-0"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">{session?.user?.name || "Adrian S."}</span>
                <span className="text-xs text-muted-foreground truncate">{session?.user?.email || "admin@agency.os"}</span>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              <Shield size={10} />
              {session?.user?.role || "ADMIN"}
            </div>
          </div>

          <div className="p-1.5 flex flex-col gap-0.5">
            <button className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/50 hover:text-primary rounded-md transition-colors w-full text-left">
              <User size={14} className="text-muted-foreground" />
              <span>Profil & Setări Cont</span>
            </button>
            <button className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/50 hover:text-primary rounded-md transition-colors w-full text-left">
              <Globe size={14} className="text-muted-foreground" />
              <span>Profil Companie</span>
            </button>
            <button className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/50 hover:text-primary rounded-md transition-colors w-full text-left">
              <Layers size={14} className="text-muted-foreground" />
              <span>Integrări & AI</span>
            </button>
            <button className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/50 hover:text-primary rounded-md transition-colors w-full text-left">
              <CreditCard size={14} className="text-muted-foreground" />
              <span>Plan & Billing</span>
            </button>
          </div>

          <div className="p-1.5 border-t border-border/50">
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors w-full text-left font-medium"
            >
              <LogOut size={14} />
              <span>Deconectare</span>
            </button>
          </div>
          
          <div className="px-4 py-2 bg-muted/30 border-t border-border/50 text-center">
            <span className="text-[10px] text-muted-foreground/60 font-mono">v1.2.0-beta (1a2b3c)</span>
          </div>
        </div>
      )}
    </div>
  )
}
