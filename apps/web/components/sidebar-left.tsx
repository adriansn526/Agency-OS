"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Contact,
  FolderKanban,
  Receipt,
  Mail,
  BarChart3,
  FileText,
  UserCog,
  Zap,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  Send,
  ClipboardList,
  Shield,
  Languages,
  GitBranch,
  Megaphone,
  Filter,
  Link2,
  Bot,
  HardHat,
  Activity,
  Building2,
  Search,
  Radar,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string | number
  children?: { title: string; href: string; icon: React.ElementType }[]
}

const mainModules: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
]

const coreModules: NavItem[] = [
  {
    title: "CRM", href: "/crm", icon: Users,
    children: [
      { title: "Dashboard", href: "/crm", icon: LayoutDashboard },
      { title: "Clienți", href: "/crm/clienti", icon: Contact },
      { title: "Lead-uri", href: "/crm/lead-uri", icon: Target },
    ],
  },
  {
    title: "Marketing", href: "/marketing", icon: Megaphone,
    children: [
      { title: "Dashboard", href: "/marketing", icon: LayoutDashboard },
      { title: "Contacte", href: "/marketing/contacts", icon: Contact },
      { title: "Segmente", href: "/marketing/segments", icon: Filter },
      { title: "Șabloane", href: "/marketing/templates", icon: FileText },
      { title: "Campanii", href: "/marketing/campaigns", icon: Send },
      { title: "Pipeline", href: "/marketing/pipeline", icon: GitBranch },
      { title: "Short Links", href: "/marketing/short-links", icon: Link2 },
    ],
  },
  { title: "Proiecte", href: "/projects", icon: FolderKanban },
  { title: "Financiar", href: "/finance", icon: Receipt },
  { title: "Oferte", href: "/offers", icon: Send },
  { title: "Contracte", href: "/contracts", icon: FileText },
]

const secondaryModules: NavItem[] = [
  { title: "Comunicare", href: "/communications", icon: Mail, badge: "Soon" },
  { title: "Rapoarte", href: "/reports", icon: BarChart3 },
  { title: "SEO", href: "/seo", icon: Search },
  { title: "Monitoring", href: "/monitoring", icon: Radar },
  { title: "Documente", href: "/documents", icon: FileText, badge: "Soon" },
]

const advancedModules: NavItem[] = [
  { title: "HR", href: "/hr", icon: UserCog, badge: "Soon" },
  { title: "Automatizări", href: "/automations", icon: Zap, badge: "Soon" },
  { title: "Knowledge Base", href: "/wiki", icon: BookOpen, badge: "Soon" },
  { title: "Activity Log", href: "/activity", icon: ClipboardList },
]

const platformModules: NavItem[] = [
  {
    title: "IntraConstruct", href: "/intraconstruct", icon: HardHat,
    children: [
      { title: "Dashboard", href: "/intraconstruct", icon: LayoutDashboard },
      { title: "Tenanți", href: "/intraconstruct/tenants", icon: Building2 },
      { title: "AI Usage", href: "/intraconstruct/usage", icon: Activity },
    ],
  },
]

const settingsModules: NavItem[] = [
  {
    title: "Setări", href: "/settings", icon: Settings,
    children: [
      { title: "Companie", href: "/settings/company", icon: Contact },
      { title: "Business Lines", href: "/settings/business-lines", icon: LayoutDashboard },
      { title: "Pipeline-uri", href: "/settings/pipelines", icon: GitBranch },
      { title: "Integrări & AI", href: "/settings/integrations", icon: Bot },
      { title: "Roluri & Permisiuni", href: "/settings/roles", icon: Shield },
      { title: "Pachete Credite", href: "/settings/credit-packages", icon: Zap },
      { title: "Limbă", href: "/settings/language", icon: Languages },
    ],
  },
]

export function SidebarLeft() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isExactActive = (href: string) => pathname === href

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const showChildren = hasChildren && active && !collapsed

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? item.children![0]!.href : item.href}
          className={cn(
            "flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
            active
              ? "bg-sidebar-accent/10 text-sidebar-fg-active"
              : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-white/[0.04]",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.title : undefined}
        >
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-accent" />
          )}
          <item.icon
            size={18}
            className={cn(
              "flex-shrink-0 transition-colors",
              active ? "text-sidebar-accent" : "text-sidebar-fg group-hover:text-sidebar-fg-active"
            )}
          />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.title}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-sidebar-accent/10 text-sidebar-accent tracking-wider">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown size={14} className={cn("text-sidebar-fg/40 transition-transform", active && "rotate-180")} />
              )}
            </>
          )}
        </Link>

        {/* Children */}
        {showChildren && (
          <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border/40 pl-2">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2.5 mx-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 group",
                  isExactActive(child.href)
                    ? "text-sidebar-fg-active bg-white/[0.06]"
                    : "text-sidebar-fg/70 hover:text-sidebar-fg-active hover:bg-white/[0.03]"
                )}
              >
                <child.icon
                  size={14}
                  className={cn(
                    "flex-shrink-0",
                    isExactActive(child.href) ? "text-sidebar-accent" : "text-sidebar-fg/50"
                  )}
                />
                <span>{child.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSection = (items: NavItem[], label?: string) => (
    <div className="space-y-0.5">
      {label && !collapsed && (
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-fg/40">
          {label}
        </p>
      )}
      {collapsed && label && (
        <div className="mx-3 my-2 border-t border-sidebar-border" />
      )}
      {items.map(renderNavItem)}
    </div>
  )

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-14 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-accent to-[hsl(270,70%,60%)] flex items-center justify-center text-white text-[11px] font-extrabold tracking-tighter shadow-lg group-hover:shadow-sidebar-accent/30 transition-shadow">
            AS
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-sidebar-fg-active tracking-tight">Agency OS</p>
              <p className="text-[10px] text-sidebar-fg/50 -mt-0.5">ASNS Platform</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {renderSection(mainModules)}
        {renderSection(coreModules, "Core")}
        {renderSection(platformModules, "Platforme")}
        {renderSection(secondaryModules, "Secundar")}
        {renderSection(advancedModules, "Avansat")}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border">
        {renderSection(settingsModules)}
        <div className="p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full h-8 rounded-lg text-sidebar-fg hover:text-sidebar-fg-active hover:bg-white/[0.04] transition-all"
            title={collapsed ? "Expandează" : "Restrânge"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
