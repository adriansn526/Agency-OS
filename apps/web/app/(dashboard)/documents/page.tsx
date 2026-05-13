"use client"

import { FileText, FilePlus, FileSignature, Shield, Archive } from "lucide-react"

const docTypes = [
  { icon: <FileSignature size={20} />, title: "Contract SEO", desc: "Generator automat cu completare CUI, perioadă, preț. DEJA CONSTRUIT.", ready: true },
  { icon: <FileText size={20} />, title: "Contract Web Dev", desc: "Template standardizat pentru proiecte de web development", ready: false },
  { icon: <FilePlus size={20} />, title: "Ofertă Comercială", desc: "Generator oferte cu servicii, prețuri, și condiții personalizabile", ready: false },
  { icon: <Shield size={20} />, title: "NDA", desc: "Non-Disclosure Agreement pre-completat pentru noi clienți", ready: false },
  { icon: <FileText size={20} />, title: "Act Adițional", desc: "Template pentru modificări contractuale și extensii", ready: false },
  { icon: <Archive size={20} />, title: "Arhivă Documente", desc: "Toate documentele centralizate per client, cu search și filtre", ready: false },
]

export default function DocumentsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Generator Documente</h1>
        <p className="text-sm text-muted-foreground">Contracte, oferte, NDA-uri — generate automat per client</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docTypes.map((doc) => (
          <div key={doc.title} className="bg-surface rounded-xl border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all duration-200 relative group cursor-pointer">
            {doc.ready && (
              <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase bg-success/10 text-success rounded-full">Activ</span>
            )}
            {!doc.ready && (
              <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase bg-muted text-muted-foreground rounded-full">Soon</span>
            )}
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
              {doc.icon}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{doc.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{doc.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
