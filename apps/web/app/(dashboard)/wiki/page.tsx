"use client"

import { BookOpen, FileText, CheckSquare, Code } from "lucide-react"

const wikiCategories = [
  { icon: <FileText size={20} />, title: "Proceduri Interne", desc: "Onboarding client, handoff proiect, comunicare echipă", count: 12 },
  { icon: <CheckSquare size={20} />, title: "Checklist-uri", desc: "SEO Audit, Launch Website, Google Ads Setup, QA Review", count: 8 },
  { icon: <Code size={20} />, title: "Documentație Tehnică", desc: "Stack-uri, deployment, API-uri, configurări server", count: 15 },
  { icon: <BookOpen size={20} />, title: "Ghiduri & Tutoriale", desc: "Best practices SEO, Google Ads, Web Performance", count: 6 },
]

export default function WikiPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Knowledge Base / Wiki</h1>
        <p className="text-sm text-muted-foreground">Proceduri, checklist-uri și documentație internă</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wikiCategories.map((cat) => (
          <div key={cat.title} className="bg-surface rounded-xl border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">{cat.icon}</div>
              <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{cat.count} articole</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{cat.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{cat.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center py-4">
        <span className="px-4 py-1.5 text-xs font-semibold bg-accent/10 text-accent rounded-full">Coming Soon</span>
      </div>
    </div>
  )
}
