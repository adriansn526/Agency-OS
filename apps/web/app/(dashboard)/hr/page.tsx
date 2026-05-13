"use client"

import { UserCog, Clock, CalendarOff, Users } from "lucide-react"

const teamMembers = [
  { name: "Alexandru Stanescu", role: "Fondator & Lead Developer", avatar: "AS", status: "online" },
  { name: "Andrei Mihai", role: "SEO Specialist & Ads Manager", avatar: "AM", status: "online" },
  { name: "Maria Ionescu", role: "Web Developer", avatar: "MI", status: "away" },
]

const features = [
  { icon: <Users size={20} />, title: "Echipă & Roluri", desc: "Membrii echipei cu specializări și disponibilitate" },
  { icon: <Clock size={20} />, title: "Timesheets", desc: "Ore lucrate per proiect, per membru" },
  { icon: <CalendarOff size={20} />, title: "Concedii", desc: "Calendar concedii și disponibilitate" },
]

export default function HRPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">HR Lite</h1>
        <p className="text-sm text-muted-foreground">Echipă, timesheets, concedii & disponibilitate</p>
      </div>

      {/* Team preview */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Echipa ASNS ({teamMembers.length} membri)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {teamMembers.map((m) => (
            <div key={m.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{m.avatar}</div>
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${m.status === "online" ? "bg-success" : "bg-warning"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-dashed border-border p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto"><UserCog size={28} className="text-primary" /></div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Modul HR</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">Gestionare echipă, tracking ore lucrate per proiect, și calendar concedii.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <span className="text-primary">{f.icon}</span>
              <span className="text-xs font-medium text-foreground">{f.title}</span>
            </div>
          ))}
        </div>
        <span className="inline-block mt-6 px-4 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">Coming Soon</span>
      </div>
    </div>
  )
}
