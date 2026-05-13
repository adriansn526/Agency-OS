"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Contact,
  Target,
  FolderKanban,
  Receipt,
  Send,
  FileText,
  BarChart3,
  ClipboardList,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react"

/* ── Primary tabs (always visible) ── */
const primaryTabs = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/crm", icon: Users, label: "CRM" },
  { href: "/offers", icon: Send, label: "Oferte" },
  { href: "/finance", icon: Receipt, label: "Financiar" },
]

/* ── CRM subpages ── */
const crmSubpages = [
  { href: "/crm", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/crm/clienti", icon: Contact, label: "Clienți" },
  { href: "/crm/lead-uri", icon: Target, label: "Lead-uri" },
]

/* ── More menu items ── */
const moreItems = [
  { href: "/projects", icon: FolderKanban, label: "Proiecte" },
  { href: "/contracts", icon: FileText, label: "Contracte" },
  { href: "/activity", icon: ClipboardList, label: "Activity Log" },
  { href: "/reports", icon: BarChart3, label: "Rapoarte" },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  const isCrmActive = pathname.startsWith("/crm")

  // Close more menu on route change
  useEffect(() => {
    setShowMore(false)
  }, [pathname])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    if (showMore) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showMore])

  return (
    <div ref={menuRef} className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* ── CRM submenu — always visible when on CRM pages ── */}
      {isCrmActive && (
        <div className="bg-surface/98 backdrop-blur-xl border-t border-border/60">
          <div className="flex items-center justify-around px-2 py-1.5">
            {crmSubpages.map((sub) => {
              const active = sub.exact
                ? pathname === sub.href
                : pathname === sub.href || pathname.startsWith(sub.href + "/")
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground active:bg-muted/10"
                  )}
                >
                  <sub.icon size={14} />
                  <span>{sub.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── More menu flyout ── */}
      {showMore && (
        <div className="bg-surface/98 backdrop-blur-xl border-t border-l border-r border-border/60 rounded-t-2xl mx-2 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mai multe</span>
            <button
              onClick={() => setShowMore(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-2 space-y-0.5">
            {moreItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 active:bg-muted/10"
                  )}
                >
                  <item.icon size={18} className={cn(active ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Main bottom bar ── */}
      <nav className="bg-surface/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-200 relative",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
                )}
                <tab.icon size={22} className={cn("transition-transform duration-200", active && "scale-110")} />
                <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>{tab.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-200 relative",
              showMore ? "text-primary" : "text-muted-foreground active:text-foreground"
            )}
          >
            <MoreHorizontal size={22} className={cn("transition-transform duration-200", showMore && "scale-110")} />
            <span className={cn("text-[10px] font-medium leading-none", showMore && "font-semibold")}>Mai mult</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
