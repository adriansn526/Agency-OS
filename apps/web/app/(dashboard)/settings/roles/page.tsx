"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Shield, Eye, Pencil, DollarSign, Check, X } from "lucide-react"
import type { UserRole } from "@repo/mock-data"
import { users } from "@repo/mock-data"

const roles: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: "admin",    label: "Admin",    description: "Acces complet la toate modulele și toate liniile de business", color: "text-destructive" },
  { value: "manager",  label: "Manager",  description: "Gestionează liniile de business asignate, CRM, proiecte, financiar", color: "text-primary" },
  { value: "operator", label: "Operator", description: "Vede doar proiectele și taskurile asignate, fără acces financiar", color: "text-accent" },
  { value: "viewer",   label: "Viewer",   description: "Read-only pe modulele la care are acces, fără acces financiar", color: "text-muted-foreground" },
]

const permissions = [
  { key: "see_all", label: "Vede tot", icon: Eye },
  { key: "create_edit", label: "Creare / Editare", icon: Pencil },
  { key: "financial", label: "Acces financiar", icon: DollarSign },
]

const permMatrix: Record<UserRole, boolean[]> = {
  admin:    [true, true, true],
  manager:  [false, true, true],
  operator: [false, false, false],
  viewer:   [true, false, false],
}

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin")

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Roluri & Permisiuni</h1>
        </div>
        <p className="text-sm text-muted-foreground">Configurare roluri și drepturi acces (Faza 1 — mock, logica reală în Faza 2)</p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => setSelectedRole(r.value)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              selectedRole === r.value ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/30"
            )}
          >
            <p className={cn("text-sm font-bold", r.color)}>{r.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{r.description}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {users.filter((u) => u.role === r.value).length} utilizatori
            </p>
          </button>
        ))}
      </div>

      {/* Permission Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Matrice Permisiuni</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Rol</th>
              {permissions.map((p) => {
                const Icon = p.icon
                return (
                  <th key={p.key} className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase">
                    <div className="flex items-center justify-center gap-1"><Icon size={12} /> {p.label}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.value} className={cn("border-b border-border/50", selectedRole === r.value && "bg-primary/5")}>
                <td className="px-4 py-3">
                  <span className={cn("text-sm font-semibold", r.color)}>{r.label}</span>
                </td>
                {permMatrix[r.value].map((allowed, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {allowed ? (
                      <Check size={16} className="text-success inline-block" />
                    ) : (
                      <X size={16} className="text-destructive/40 inline-block" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Users with this role */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Utilizatori cu rolul <span className="text-primary">{roles.find((r) => r.value === selectedRole)?.label}</span>
        </h3>
        <div className="space-y-2">
          {users.filter((u) => u.role === selectedRole).map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{u.initials}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{u.name}</p>
                <p className="text-[11px] text-muted-foreground">{u.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
