"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Plus, Clock, Pencil, Archive, Copy, Trash2, ChevronDown } from "lucide-react"

// ────────────────────────────────────────────────
// Shared Modal Shell
// ────────────────────────────────────────────────
function ModalShell({ open, onClose, title, children, width = "max-w-md" }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className={cn("relative bg-surface rounded-2xl border border-border shadow-2xl w-full mx-4 animate-scale-in", width)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// Input Helpers
// ────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"

// ────────────────────────────────────────────────
// 1. ADD TASK MODAL
// ────────────────────────────────────────────────
export function AddTaskModal({ open, onClose, teamMembers, onAdd }: {
  open: boolean; onClose: () => void; teamMembers: string[]
  onAdd: (task: { title: string; assignee: string; dueDate: string; hours: number }) => void
}) {
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState(teamMembers[0] || "")
  const [dueDate, setDueDate] = useState("")
  const [hours, setHours] = useState(4)

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), assignee, dueDate, hours })
    setTitle(""); setDueDate(""); setHours(4)
    onClose()
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Task Nou">
      <div className="space-y-4">
        <Field label="Titlu Task">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Implementare pagină contact" className={inputClass} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
              {teamMembers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Ore Estimate">
            <input type="number" min={1} max={100} value={hours} onChange={(e) => setHours(+e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Due Date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
          <button onClick={handleSubmit} disabled={!title.trim()} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-colors flex items-center gap-1.5">
            <Plus size={12} /> Adaugă Task
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────
// 2. EDIT PROJECT MODAL
// ────────────────────────────────────────────────
export function EditProjectModal({ open, onClose, project, onSave }: {
  open: boolean; onClose: () => void
  project: { name: string; status: string; startDate: string; deadline: string; budget: number }
  onSave: (data: { name: string; status: string; startDate: string; deadline: string; budget: number }) => void
}) {
  const [name, setName] = useState(project.name)
  const [status, setStatus] = useState(project.status)
  const [startDate, setStartDate] = useState(project.startDate)
  const [deadline, setDeadline] = useState(project.deadline)
  const [budget, setBudget] = useState(project.budget)

  useEffect(() => {
    setName(project.name); setStatus(project.status)
    setStartDate(project.startDate); setDeadline(project.deadline); setBudget(project.budget)
  }, [project])

  const handleSubmit = () => {
    onSave({ name, status, startDate, deadline, budget })
    onClose()
  }

  const statusOptions = [
    { value: "planificare", label: "Planificare" },
    { value: "in_lucru", label: "În Lucru" },
    { value: "review", label: "Review" },
    { value: "finalizat", label: "Finalizat" },
    { value: "suspendat", label: "Suspendat" },
  ]

  return (
    <ModalShell open={open} onClose={onClose} title="Editează Proiect" width="max-w-lg">
      <div className="space-y-4">
        <Field label="Nume Proiect">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Deadline">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Buget (EUR)">
          <input type="number" min={0} value={budget} onChange={(e) => setBudget(+e.target.value)} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5">
            <Pencil size={12} /> Salvează
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────
// 3. LOG TIME MODAL
// ────────────────────────────────────────────────
export function LogTimeModal({ open, onClose, teamMembers, tasks, onLog }: {
  open: boolean; onClose: () => void; teamMembers: string[]; tasks: string[]
  onLog: (entry: { member: string; task: string; date: string; hours: number; note: string }) => void
}) {
  const [member, setMember] = useState(teamMembers[0] || "")
  const [task, setTask] = useState(tasks[0] || "")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0] || "")
  const [hours, setHours] = useState(2)
  const [note, setNote] = useState("")

  const handleSubmit = () => {
    if (!hours) return
    onLog({ member, task, date, hours, note })
    setNote(""); setHours(2)
    onClose()
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Loghează Timp">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Membru">
            <select value={member} onChange={(e) => setMember(e.target.value)} className={inputClass}>
              {teamMembers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Ore">
            <input type="number" min={0.5} step={0.5} max={24} value={hours} onChange={(e) => setHours(+e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Task">
          <select value={task} onChange={(e) => setTask(e.target.value)} className={inputClass}>
            {tasks.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notă (opțional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce ai lucrat..." className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5">
            <Clock size={12} /> Loghează
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────
// 4. MORE ACTIONS DROPDOWN
// ────────────────────────────────────────────────
export function MoreActionsMenu({ onAction }: { onAction: (action: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const items = [
    { key: "duplicate", label: "Duplică Proiect", icon: Copy, class: "text-foreground" },
    { key: "archive", label: "Arhivează", icon: Archive, class: "text-foreground" },
    { key: "delete", label: "Șterge Proiect", icon: Trash2, class: "text-destructive" },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl border border-border shadow-xl py-1 z-50 animate-scale-in">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => { onAction(item.key); setOpen(false) }}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-muted transition-colors", item.class)}
              >
                <Icon size={13} /> {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
