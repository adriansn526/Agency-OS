"use client"

import { useState, useRef, type KeyboardEvent } from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DomainChipsInputProps {
  value: string[]
  onChange: (domains: string[]) => void
  placeholder?: string
  label?: string
  className?: string
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
}

function isValidDomain(domain: string): boolean {
  return domain.length >= 4 && domain.includes(".") && !domain.includes(" ")
}

export function DomainChipsInput({
  value,
  onChange,
  placeholder = "Adaugă domeniu...",
  label,
  className,
}: DomainChipsInputProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addDomain = (raw: string) => {
    const domain = normalizeDomain(raw)
    if (!domain || !isValidDomain(domain)) return
    if (value.includes(domain)) return // no dupes
    onChange([...value, domain])
    setInput("")
  }

  const removeDomain = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addDomain(input)
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeDomain(value.length - 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text")
    // Support pasting multiple domains (comma, newline, or space separated)
    const domains = text.split(/[,\n\s]+/).filter(Boolean)
    const newDomains = [...value]
    for (const raw of domains) {
      const domain = normalizeDomain(raw)
      if (domain && isValidDomain(domain) && !newDomains.includes(domain)) {
        newDomains.push(domain)
      }
    }
    onChange(newDomains)
    setInput("")
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {label}
        </label>
      )}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 bg-muted/50 rounded-lg border border-border focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((domain, i) => (
          <span
            key={domain}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md transition-colors",
              i === 0
                ? "bg-primary/15 text-primary border border-primary/20"
                : "bg-muted text-foreground border border-border"
            )}
          >
            {i === 0 && <span className="text-[9px]">★</span>}
            {domain}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeDomain(i) }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (input) addDomain(input) }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {input && (
          <button
            type="button"
            onClick={() => addDomain(input)}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {value.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          ★ Domeniu principal • {value.length} domeni{value.length === 1 ? "u" : "i"} monitorizat{value.length === 1 ? "" : "e"}
        </p>
      )}
    </div>
  )
}
