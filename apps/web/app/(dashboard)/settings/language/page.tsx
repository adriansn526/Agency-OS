"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Languages, Check } from "lucide-react"

const languages = [
  { code: "ro", label: "Română", flag: "🇷🇴", description: "Limba implicită a platformei" },
  { code: "en", label: "English", flag: "🇬🇧", description: "Interface language" },
]

export default function LanguagePage() {
  const [selected, setSelected] = useState("ro")

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Languages size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Limbă / Language</h1>
        </div>
        <p className="text-sm text-muted-foreground">Selectează limba interfeței platformei</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className={cn(
              "flex items-center gap-4 p-5 rounded-xl border text-left transition-all",
              selected === lang.code ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/30"
            )}
          >
            <span className="text-3xl">{lang.flag}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{lang.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{lang.description}</p>
            </div>
            {selected === lang.code && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check size={13} className="text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4 max-w-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Notă Faza 1:</strong> Toggle-ul de limbă va fi funcțional cu traduceri complete (next-intl) în iterația următoare.
          Momentan interfața este în Română, limba implicită a platformei.
        </p>
      </div>
    </div>
  )
}
