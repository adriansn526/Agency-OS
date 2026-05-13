"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: "sm" | "md" | "lg"
}

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  if (!open) return null

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full bg-surface rounded-2xl border border-border shadow-lg overflow-hidden animate-fade-in",
          sizeClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/* ============================================================
   Form Input Components
   ============================================================ */

interface InputProps {
  label: string
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  half?: boolean
}

export function FormInput({ label, id, type = "text", placeholder, value, onChange, required, half }: InputProps) {
  return (
    <div className={cn(half && "col-span-1")}>
      <label htmlFor={id} className="block text-xs font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
      />
    </div>
  )
}

interface SelectProps {
  label: string
  id: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  half?: boolean
}

export function FormSelect({ label, id, value, onChange, options, required, half }: SelectProps) {
  return (
    <div className={cn(half && "col-span-1")}>
      <label htmlFor={id} className="block text-xs font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
      >
        <option value="">Selectează...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function FormTextarea({ label, id, placeholder, value, onChange, rows = 3 }: InputProps & { rows?: number }) {
  return (
    <div className="col-span-full">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
      />
    </div>
  )
}

export function FormActions({ onCancel, submitLabel = "Salvează" }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
      >
        Anulează
      </button>
      <button
        type="submit"
        className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
      >
        {submitLabel}
      </button>
    </div>
  )
}
