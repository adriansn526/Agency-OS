"use client"

import { useState, useEffect, useRef } from "react"
import { Archivo, Source_Serif_4 } from "next/font/google"
import "./oferta.css"

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-archivo",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
})

export default function PublicOfferClient({
  delivery,
  offer,
  companySettings,
}: {
  delivery: any
  offer: any
  companySettings: any
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(delivery.clientResponse === "accepted")
  const [error, setError] = useState("")
  const [activeId, setActiveId] = useState("")

  const modules = Array.isArray(offer.modules) ? offer.modules : []
  const generalBlocks = Array.isArray(offer.blocks) ? offer.blocks : []

  // Ensure unique IDs for blocks
  const blocksWithIds = generalBlocks.map((b: any, i: number) => ({
    ...b,
    htmlId: b.id || `s${i + 1}`
  }))

  const handleAccept = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Te rugăm să completezi numele și adresa de email.")
      return
    }
    setError("")
    setAccepting(true)

    try {
      const res = await fetch("/api/public/offers/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: delivery.token,
          name,
          email,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Eroare la acceptarea ofertei.")
      }

      setAccepted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  const printPdf = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  // Format Date logic
  const validUntilStr = offer.validUntil 
    ? new Date(offer.validUntil).toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" })
    : "Nedefinit"
    
  const sentAtStr = delivery.sentAt 
    ? new Date(delivery.sentAt).toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" })

  // Intersection Observer for TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-10% 0px -75% 0px" }
    )

    blocksWithIds.forEach((b: any) => {
      const el = document.getElementById(b.htmlId)
      if (el) observer.observe(el)
    })
    
    // Add sections that might not be in blocks
    const extraSections = ["s-pachete", "acceptare"]
    extraSections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [blocksWithIds])

  return (
    <div className={`oferta-theme ${archivo.variable} ${sourceSerif.variable}`}>
      <div className="wrap">
        
        {/* Cover */}
        <header className="cover">
          <div className="filebar">
            <div>Ofertă <b>{offer.number}</b></div>
            <div>Emisă <b>{sentAtStr}</b></div>
            <div>Valabilă până la <b>{validUntilStr}</b></div>
          </div>

          <h1>{offer.templateName || "Propunere Comercială"}</h1>
          
          <p className="lede">
            Aceasta este propunerea noastră detaliată. Te rugăm să o analizezi cu atenție.
          </p>

          <p className="addressee">
            În atenția
            <b>{offer.client?.contactPerson || offer.client?.companyName || offer.entityName} {offer.client?.companyName && offer.client.contactPerson ? `— ${offer.client.companyName}` : ''}</b>
          </p>

          {modules.length > 0 && (
            <div className="summary">
              <h2>Rezumat Pachete</h2>
              <div className="prices">
                {modules.map((m: any, idx: number) => (
                  <div key={idx}>
                    <span>{m.serviceName}</span>
                    <b>{m.price} {offer.currency}</b>
                  </div>
                ))}
              </div>
              <p className="summary-note">Prețuri fără TVA. Detaliile fiecărui pachet sunt descrise mai jos.</p>
            </div>
          )}

          <div className="actions">
            {!accepted && (
              <a className="btn" href="#acceptare">Accept oferta</a>
            )}
            <button className="btn ghost" type="button" onClick={printPdf}>Salvează ca PDF</button>
          </div>
        </header>

        {/* Body Grid with TOC */}
        <div className="body-grid">
          <nav className="toc" aria-label="Cuprins">
            <ol>
              {blocksWithIds.map((b: any, idx: number) => (
                <li key={b.htmlId}>
                  <a href={`#${b.htmlId}`} className={activeId === b.htmlId ? "on" : ""}>
                    {b.title || `Secțiunea ${idx + 1}`}
                  </a>
                </li>
              ))}
              {modules.length > 0 && (
                <li>
                  <a href="#s-pachete" className={activeId === "s-pachete" ? "on" : ""}>Pachete și investiție</a>
                </li>
              )}
              <li>
                <a href="#acceptare" className={activeId === "acceptare" ? "on" : ""}>Pentru a demara</a>
              </li>
            </ol>
          </nav>

          <main>
            {/* Dynamic General Blocks */}
            {blocksWithIds.map((block: any, idx: number) => {
              const isFeatures = block.type === "features" || (block.data && block.data.categories)

              return (
                <section key={block.htmlId} id={block.htmlId}>
                  <h2><i>{idx + 1}</i> {block.title}</h2>
                  
                  {isFeatures ? (
                    block.data.categories.map((cat: any, cIdx: number) => (
                      <div key={cIdx}>
                        <h3>{cat.name}</h3>
                        <ul className="list">
                          {cat.items?.map((item: string, iIdx: number) => (
                            <li key={iIdx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: block.data?.content || "" }} />
                  )}
                </section>
              )
            })}

            {/* Modules / Packs section */}
            {modules.length > 0 && (
              <section id="s-pachete">
                <h2><i>{blocksWithIds.length + 1}</i> Pachete și investiție</h2>
                
                <div className="packs">
                  {modules.map((m: any, idx: number) => {
                    const isRecommended = m.status === 'recommended' || (modules.length > 1 && idx === modules.length - 1)
                    return (
                      <div key={idx} className={`pack ${isRecommended ? 'pick' : ''}`}>
                        {isRecommended && <span className="pack-tag">Recomandat</span>}
                        <h3>{m.serviceName}</h3>
                        <p className="price">{m.price} {offer.currency}</p>
                        <p className="unit">{m.pricingUnit === 'lunar' ? 'pe lună' : m.pricingUnit === 'per_hour' ? 'pe oră' : 'preț fix'}</p>
                        
                        {m.blocks && m.blocks.length > 0 && (
                          <ul>
                            {m.blocks.map((b: any, bIdx: number) => (
                              <li key={bIdx}>{b.title}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Acceptance Section */}
            <section className="sign" id="acceptare">
              <h2 style={{ border: 0, padding: 0 }}><i></i>Pentru a demara</h2>
              
              {accepted ? (
                <div className="note" style={{ borderColor: 'var(--ink)' }}>
                  <p><b>Oferta a fost acceptată.</b></p>
                  <p>Îți mulțumim pentru confirmare. Un reprezentant te va contacta în scurt timp cu pașii următori.</p>
                </div>
              ) : (
                <>
                  <p>Confirmați pachetul ales completând datele de mai jos și apăsând butonul de acceptare.</p>
                  
                  <div className="sign-grid">
                    <div className="form-group">
                      <label>Nume și Prenume</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Ion Popescu"
                        disabled={accepting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Adresa de Email</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="ion@companie.ro"
                        disabled={accepting}
                      />
                    </div>
                  </div>
                  
                  {error && <div className="error-msg">{error}</div>}
                  
                  <div className="actions">
                    <button 
                      className="btn" 
                      onClick={handleAccept} 
                      disabled={accepting}
                    >
                      {accepting ? "Se confirmă..." : "Accept oferta"}
                    </button>
                    {companySettings?.phone && (
                      <a className="btn ghost" href={`tel:${companySettings.phone}`}>{companySettings.phone}</a>
                    )}
                  </div>
                </>
              )}
            </section>
          </main>
        </div>

        {/* Footer */}
        <footer>
          {companySettings?.legalName || offer.businessLine?.name} · {companySettings?.cif ? `CUI: ${companySettings.cif}` : ''} {companySettings?.email ? `· ${companySettings.email}` : ''} {companySettings?.phone ? `· ${companySettings.phone}` : ''}<br/>
          Document destinat exclusiv {offer.entityName}. Ofertă {offer.number}, emisă {sentAtStr}.
        </footer>
      </div>

      {/* Mobile Bar */}
      {!accepted && (
        <div className="bar">
          <div>
            <small>Total estimativ</small>
            <b>{offer.value} {offer.currency}</b>
          </div>
          <button onClick={() => document.getElementById("acceptare")?.scrollIntoView({ behavior: 'smooth' })}>
            Accept oferta
          </button>
        </div>
      )}
    </div>
  )
}
