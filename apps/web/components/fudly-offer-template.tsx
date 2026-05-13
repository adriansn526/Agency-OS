"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2, Utensils, CreditCard, Truck, Gift, Users, BarChart3,
  Sparkles, ShoppingCart, Timer, Zap, Info, Star, Phone, CalendarCheck,
  MessageCircle, HelpCircle,
} from "lucide-react"

interface FudlyOfferTemplateProps {
  offer: any
  validUntilStr: string
}

/* ─── ICON BENEFIT CARD ─── */
function BenefitCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType
  title: string
  desc: string
  color: string
}) {
  const colorClasses: Record<string, { bg: string; iconBg: string; iconText: string; border: string }> = {
    red:    { bg: "from-red-50 to-rose-50", iconBg: "bg-red-100", iconText: "text-red-600", border: "border-red-100" },
    orange: { bg: "from-orange-50 to-amber-50", iconBg: "bg-orange-100", iconText: "text-orange-600", border: "border-orange-100" },
    green:  { bg: "from-green-50 to-emerald-50", iconBg: "bg-green-100", iconText: "text-green-600", border: "border-green-100" },
    blue:   { bg: "from-blue-50 to-indigo-50", iconBg: "bg-blue-100", iconText: "text-blue-600", border: "border-blue-100" },
    purple: { bg: "from-purple-50 to-pink-50", iconBg: "bg-purple-100", iconText: "text-purple-600", border: "border-purple-100" },
    amber:  { bg: "from-amber-50 to-yellow-50", iconBg: "bg-amber-100", iconText: "text-amber-600", border: "border-amber-100" },
  }
  const c = colorClasses[color] || colorClasses.orange!
  return (
    <div className={cn("bg-gradient-to-br rounded-2xl p-5 border transition-all hover:shadow-lg hover:-translate-y-0.5", c.bg, c.border)}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", c.iconBg)}>
        <Icon className={cn("w-6 h-6", c.iconText)} />
      </div>
      <h4 className="text-base font-bold text-gray-900 mb-1.5">{title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  )
}

/* ─── INLINE TOOLTIP ─── */
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center gap-1 text-red-600 font-semibold underline decoration-dotted underline-offset-2 cursor-help"
      >
        {label}
        <Info className="w-3.5 h-3.5 text-red-400" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 leading-relaxed animate-in fade-in slide-in-from-bottom-1">
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

/* ─── STEP CARD (enhanced) ─── */
function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-bold text-gray-900 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   FUDLY OFFER TEMPLATE — Mobile-first, persuasive
   ═══════════════════════════════════════════════════ */

export function FudlyOfferTemplate({ offer, validUntilStr }: FudlyOfferTemplateProps) {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-4 py-16 md:py-24 text-center">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          <div className="relative max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm text-white/90 font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Propunere pentru {offer.entityName}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Sistemul tău de comenzi online.
              <br />
              <span className="text-orange-200">Fără comision pe comandă.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Propriul tău sistem de comenzi — controlul complet al relației cu clienții, fără intermediari.
            </p>
          </div>
        </div>
        {/* Wave separator */}
        <div className="h-8 bg-gradient-to-b from-orange-50 to-transparent -mt-1" />
      </section>

      {/* ── VALUE PROPOSITION ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 -mt-2 pb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="text-3xl font-extrabold text-green-600 mb-1">0%</div>
              <div className="text-sm font-medium text-gray-700">Comision pe comandă</div>
              <div className="text-xs text-gray-500 mt-1">Toți banii ajung la tine</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <div className="text-3xl font-extrabold text-blue-600 mb-1">100%</div>
              <div className="text-sm font-medium text-gray-700">Control asupra meniului</div>
              <div className="text-xs text-gray-500 mt-1">Prețuri, oferte, disponibilitate</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <div className="text-3xl font-extrabold text-purple-600 mb-1">24/7</div>
              <div className="text-sm font-medium text-gray-700">Comenzi non-stop</div>
              <div className="text-xs text-gray-500 mt-1">Fără program limitat</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
            Tot ce ai nevoie, într-un singur loc
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Fudly vine cu toate instrumentele necesare pentru a gestiona comenzile online ale restaurantului tău.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BenefitCard
            icon={Utensils}
            title="Meniu Digital Personalizat"
            desc="Meniu optimizat mobile cu categorii, imagini, opțiuni personalizabile și QR code pentru masă."
            color="red"
          />
          <BenefitCard
            icon={CreditCard}
            title="Integrare Plată Online"
            desc="Acceptă plăți cu cardul direct din aplicație. Securizat, rapid, fără bătăi de cap."
            color="blue"
          />
          {/* Delivery — split into 2 options */}
          <div className="sm:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-5 transition-all hover:shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-base font-bold text-gray-900">Integrare Livrare — Alege ce ți se potrivește</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">A</div>
                  <h5 className="text-sm font-bold text-gray-900">Livratori proprii</h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ai deja echipă de livrare? Le oferim o <span className="font-semibold text-green-700">aplicație dedicată</span> pentru gestionarea comenzilor, rute optimizate și notificări în timp real.
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">B</div>
                  <h5 className="text-sm font-bold text-gray-900">Glovo Delivery On Demand</h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Nu ai livratori? Folosești curierul Glovo, dar <span className="font-semibold text-green-700">clientul rămâne al tău</span>. Comanda vine prin Fudly, livrarea prin Glovo.
                </p>
              </div>
            </div>
          </div>
          <BenefitCard
            icon={Gift}
            title="Sistem de Fidelizare"
            desc="Recompensează clienții fideli prin puncte de loialitate. Fiecare comandă aduce puncte, punctele aduc recompense."
            color="purple"
          />
          <BenefitCard
            icon={Users}
            title="Shared Cart"
            desc="Mai mulți prieteni, o singură comandă. Fiecare adaugă ce vrea, cineva plătește — simplu."
            color="amber"
          />
          <BenefitCard
            icon={BarChart3}
            title="Dashboard & Analytics"
            desc="Vizualizează comenzile, veniturile și produsele populare în timp real. Decizii bazate pe date."
            color="orange"
          />
        </div>
      </section>

      {/* ── LOYALTY POINTS SCENARIO ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-4 right-4 text-6xl opacity-10">⭐</div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">Fidelizare prin puncte — Chiar de la prima comandă</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mihai adaugă în coș: Pizza Quattro Formaggi + Paste Carbonara</p>
                <p className="text-xs text-gray-600">
                  Fiecare produs aduce puncte: <span className="font-semibold text-purple-700">Pizza → 15 pct</span>, <span className="font-semibold text-purple-700">Paste → 15 pct</span>. Total: <span className="font-bold text-purple-700">30 puncte</span> din prima comandă.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">În coș vede: „Ai 30 puncte — alege un bonus gratuit!"</p>
                <p className="text-xs text-gray-600">
                  Apar recomandări instant: <span className="italic text-purple-700">Chifle cu usturoi (8 pct)</span>, <span className="italic text-purple-700">Sos extra (4 pct)</span>, sau <span className="italic text-purple-700">Tiramisu (20 pct)</span>. Mihai alege Tiramisu — <span className="font-semibold text-green-700">gratuit</span>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mihai plătește comanda, dar simte că a primit mai mult</p>
                <p className="text-xs text-gray-600">
                  Un desert de <span className="font-semibold text-purple-700">20 lei gratuit</span> chiar de la prima comandă. Revine pentru că știe: cu cât comandă mai mult, cu atât primește mai mult.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs text-purple-800 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Tu setezi regulile: câte puncte per produs, ce bonus-uri oferi, și de la câte puncte se activează.
            </p>
          </div>
        </div>
      </section>

      {/* ── SHARED CART SCENARIO ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-4 right-4 text-6xl opacity-10">🛒</div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-gray-900">Shared Cart — Cum funcționează?</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ana deschide meniul restaurantului</p>
                <p className="text-xs text-gray-600">Scanează QR code-ul de pe masă sau accesează link-ul de pe Google Maps</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Trimite link-ul la 3 prieteni</p>
                <p className="text-xs text-gray-600">Fiecare adaugă produsele dorite în coșul comun — Pizza Margherita, Pasta Carbonara, Tiramisu...</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ana confirmă și plătește comanda</p>
                <p className="text-xs text-gray-600">O singură comandă, o singură plată, fără confuzii. Restaurantul primește totul organizat pe o singură notă.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-200">
            <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Rezultat: +35% valoare medie per comandă când grupurile comandă împreună
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
            3 pași simpli
          </h2>
          <p className="text-gray-500 text-base">Fără tehnicieni, fără complicații</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <div className="space-y-6">
            <StepCard step={1} title="Ne ocupăm noi de meniu">
              Trimite-ne meniul tău (PDF, poze, sau link) și <span className="font-semibold text-red-600">noi aducem totul în platformă</span> — produse, categorii, prețuri, imagini. Tu doar verifici și aprobi.
            </StepCard>
            <div className="ml-5 border-l-2 border-dashed border-red-200 h-4" />
            <StepCard step={2} title="Primești comenzi">
              Clienții scanează QR code-ul sau accesează link-ul tău personalizat. Comenzile apar instant în dashboard.
            </StepCard>
            <div className="ml-5 border-l-2 border-dashed border-red-200 h-4" />
            <StepCard step={3} title="Crești profitul">
              Fără comision pe comandă — fiecare leu rămâne la tine. Plus, ai acces la{" "}
              <Tooltip label="unelte de marketing">
                <strong>Ce include:</strong><br />
                • Push notifications — anunțuri de meniu nou, oferte speciale<br/>
                • Sistem de puncte — fidelizezi automat clienții<br/>
                • Cupoane & reduceri — coduri promoționale personalizate<br/>
                • Analytics — afli ce produse merg și ce nu
              </Tooltip>
              {" "}care fidelizează clienții și îi aduc înapoi.
            </StepCard>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
            Alege planul potrivit
          </h2>
          <p className="text-gray-500 text-base">Fără costuri ascunse. Fără comision pe comenzi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 md:p-8 relative hover:border-red-300 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Lunar</h3>
              <p className="text-sm text-gray-500">Flexibilitate maximă</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-900">59</span>
              <span className="text-lg text-gray-500 ml-1">EUR/lună</span>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "Meniu digital nelimitat",
                "Comenzi online nelimitate",
                "Dashboard analytics",
                "Integrare plată online",
                "Suport email + chat",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-xs font-semibold text-green-700 flex items-center justify-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                Primele 14 zile sunt gratuite
              </p>
            </div>
          </div>

          {/* One-time Plan */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-red-300 p-6 md:p-8 relative ring-1 ring-red-200">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                RECOMANDAT
              </span>
            </div>
            <div className="mb-6 pt-2">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Licență Permanentă</h3>
              <p className="text-sm text-gray-500">Plătești o dată, folosești mereu</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-red-600">850</span>
              <span className="text-lg text-gray-500 ml-1">EUR</span>
              <span className="block text-xs text-gray-400 mt-1">plată unică — fără abonament</span>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "Tot ce include planul Lunar",
                "Sistem de fidelizare prin puncte",
                "Shared Cart (coș partajat)",
                "Integrare livrare avansată",
                "Suport prioritar telefonic",
                "Actualizări gratuite 12 luni",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-xs font-semibold text-red-700 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Cea mai bună valoare pe termen lung
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Oferta este valabilă până la {validUntilStr}. Toate prețurile nu includ TVA.
        </p>
      </section>
    </>
  )
}
