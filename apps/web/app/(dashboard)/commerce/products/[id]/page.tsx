import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@repo/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { imageUrl } from "@/lib/commerce/images/urls"
import { availabilityFromFlags } from "@/lib/commerce/availability"
import { loadSeoRows } from "@/lib/commerce/seo/data"
import { buildSeo } from "@/lib/commerce/seo/titles"
import { ImageManager } from "./image-manager"
import { ActiveToggle } from "./active-toggle"

export const dynamic = 'force-dynamic'

const BL = 'cuid_ecaroseria'
const ron = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n))
const dt = (d: Date | null | undefined) => (d ? d.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—")
const AVAIL: Record<string, string> = { in_stock: "în stoc", confirm_on_order: "confirmare la comandă", out_of_stock: "epuizat" }
const WH: Record<string, string> = { ath: "Atena (ath)", the: "Salonic (the)" }

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{children}</span></div>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
}

export default async function CommerceProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.commerceProduct.findUnique({
    where: { id },
    include: {
      category: { select: { nameRo: true, parent: { select: { nameRo: true } } } },
      feed: { select: { code: true, stockFlagMeaning: true } },
      stock: { select: { warehouse: true, rawFlag: true, updatedAt: true }, orderBy: { warehouse: "asc" } },
      oeCodes: { select: { raw: true }, take: 60, orderBy: { raw: "asc" } },
      competitors: { select: { competitor: true, priceRon: true, inStock: true, checkedAt: true, url: true } },
      links: { select: { type: true, related: { select: { id: true, supplierCode: true, nameRo: true, nameEn: true } } }, take: 20 },
    },
  })
  if (!p) notFound()

  const [listing, channel, fx, imgs, fitCount, fitments, priceEv, stockEv, demand, orders, reviews] = await Promise.all([
    db.commerceListing.findFirst({ where: { productId: id, businessLineId: BL }, include: { appliedRule: { select: { name: true, markupPct: true } } } }),
    db.commerceChannel.findUnique({ where: { businessLineId: BL }, select: { vatRate: true, storefrontUrl: true, config: true } }),
    db.commerceExchangeRate.findFirst({ where: { currency: "EUR" }, orderBy: { date: "desc" } }),
    db.$queryRaw<Array<{ id: string; objectKey: string; source: string; width: number | null; height: number | null }>>`
      SELECT id, "objectKey", source, width, height FROM "CommerceProductImage" WHERE "productId" = ${id} ORDER BY (source = 'manual') DESC, position, "objectKey"`,
    db.commerceFitment.count({ where: { productId: id } }),
    db.commerceFitment.findMany({
      where: { productId: id }, take: 60,
      select: { generation: { select: { name: true, variant: true, yearFrom: true, yearTo: true, model: { select: { name: true, make: { select: { name: true } } } } } } },
    }),
    db.$queryRaw<Array<{ oldPrice: string; newPrice: string; at: Date }>>`SELECT "oldPrice"::text, "newPrice"::text, "at" FROM "CommercePriceEvent" WHERE "productId" = ${id} ORDER BY "at" DESC LIMIT 15`,
    db.$queryRaw<Array<{ warehouse: string; oldFlag: number | null; newFlag: number; at: Date }>>`SELECT warehouse, "oldFlag", "newFlag", "at" FROM "CommerceStockEvent" WHERE "productId" = ${id} ORDER BY "at" DESC LIMIT 15`,
    db.$queryRaw<Array<{ v30: bigint; vall: bigint }>>`SELECT COALESCE(sum(views) FILTER (WHERE day >= current_date - 30), 0) AS v30, COALESCE(sum(views), 0) AS vall FROM "CommerceDemandDaily" WHERE "productId" = ${id}`,
    db.$queryRaw<Array<{ n: bigint; qty: bigint }>>`SELECT count(DISTINCT o.id) AS n, COALESCE(sum(i.qty), 0) AS qty FROM "CommerceOrderItem" i JOIN "CommerceOrder" o ON o.id = i."orderId" WHERE i."productId" = ${id} AND o.status <> 'cancelled'`,
    db.commerceSyncReview.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 5, select: { kind: true, status: true, oldCost: true, newCost: true, oldPriceRon: true, newPriceRon: true, createdAt: true } }).catch(() => []),
  ])

  const seoRow = (await loadSeoRows({ businessLineId: BL, productId: id }))[0]
  const seo = seoRow ? buildSeo(seoRow) : null

  const cost = Number(p.costPrice), rate = fx ? Number(fx.rate) : null, vat = channel ? Number(channel.vatRate) : 21
  const price = listing?.priceRon != null ? Number(listing.priceRon) : null
  const landed = rate && cost > 0 ? cost * rate : null
  const net = price != null ? price / (1 + vat / 100) : null
  const markup = net != null && landed ? (net / landed - 1) * 100 : null
  const meaning = p.feed.stockFlagMeaning
  const avail = availabilityFromFlags(p.stock.map((s) => s.rawFlag), meaning)
  const attrs = p.attributes && typeof p.attributes === "object" && !Array.isArray(p.attributes) ? Object.entries(p.attributes as Record<string, unknown>) : []
  const priceSyncOn = !!(channel?.config && typeof channel.config === "object" && (channel.config as any).priceSync?.enabled)

  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Produse</Link>
        <h1 className="text-2xl font-bold tracking-tight">{p.nameRo ?? p.nameEn}</h1>
        {p.nameRo && p.nameRo !== p.nameEn && <p className="text-sm text-muted-foreground">{p.nameEn}</p>}
        <div className="my-2"><ActiveToggle productId={p.id} isActive={p.isActive} /></div>
        <p className="text-sm text-muted-foreground">SKU <span className="font-mono">{p.supplierCode}</span>{p.category ? ` · ${p.category.parent ? `${p.category.parent.nameRo} › ` : ""}${p.category.nameRo}` : ""}{listing ? ` · slug ${listing.slug}` : " · fără listare în storefront"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Date produs">
          <Row k="SKU furnizor">{p.supplierCode}</Row>
          <Row k="Cod grup">{p.groupCode ?? "—"}</Row>
          <Row k="Cod OE principal">{p.oeMain ?? "—"}</Row>
          <Row k="Brand">{p.brand ?? "—"}</Row>
          <Row k="Calitate">{p.quality ?? "—"}</Row>
          <Row k="Parte">{p.side === "L" ? "stânga" : p.side === "R" ? "dreapta" : "—"}</Row>
          <Row k="Clasă volum">{p.bulkyClass ?? "—"}</Row>
          <Row k="Denumire RO">{p.nameRo ? <>{p.nameRo} <Badge variant="secondary" className="ml-1">{p.nameRoSource ?? "?"}</Badge></> : <span className="text-destructive">netradus</span>}</Row>
          <Row k="Denumire EN">{p.nameEn}</Row>
          <Row k="Denumire EL">{p.nameEl ?? "—"}</Row>
          <Row k="Feed">{p.feed.code}</Row>
          <Row k="Văzut prima dată">{dt(p.firstSeenAt)}</Row>
          <Row k="Ultima apariție în feed">{dt(p.lastSeenAt)}</Row>
        </Section>

        <Section title="Preț și cost">
          <Row k="Cost furnizor">{cost.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {p.costCurrency}</Row>
          <Row k={`Curs BNR${fx ? ` (${fx.date.toISOString().slice(0, 10)})` : ""}`}>{rate ?? "—"}</Row>
          <Row k="Cost în RON (fără TVA)">{ron(landed)}</Row>
          <Row k="Preț în storefront (cu TVA)">{ron(price)}</Row>
          <Row k={`Preț fără TVA (${vat}%)`}>{ron(net)}</Row>
          <Row k="Adaos efectiv">{markup == null ? "—" : `${markup.toFixed(1)}%`}</Row>
          <Row k="Sursă preț">{listing ? listing.priceSource : "—"}{listing?.appliedRule ? ` · ${listing.appliedRule.name}` : ""}</Row>
          <Row k="Preț manual">{ron(listing?.manualPriceRon != null ? Number(listing.manualPriceRon) : null)}</Row>
          <Row k="Preț de comparație">{ron(listing?.compareAtRon != null ? Number(listing.compareAtRon) : null)}</Row>
          <Row k="Preț actualizat">{dt(listing?.priceUpdatedAt)}</Row>
          <Row k="Listare activă">{listing ? (listing.isActive ? "da" : "nu") : "—"}</Row>
          {!priceSyncOn && <p className="mt-2 text-xs text-muted-foreground">Sincronizarea de preț cu furnizorul este oprită.</p>}
          {p.competitors.length > 0 && <div className="mt-3 text-sm"><div className="font-medium">Concurență</div>{p.competitors.map((c) => <div key={c.competitor} className="flex justify-between text-muted-foreground"><span>{c.competitor}{c.inStock === false ? " (epuizat)" : ""}</span><span>{ron(Number(c.priceRon))} · {dt(c.checkedAt)}</span></div>)}</div>}
        </Section>

        <Section title="Stoc și cerere">
          <Row k="Disponibilitate publică"><Badge variant={avail === "out_of_stock" ? "destructive" : "secondary"}>{AVAIL[avail]}</Badge></Row>
          <Row k="Mapare stoc">{meaning}</Row>
          {p.stock.map((s) => <Row key={s.warehouse} k={WH[s.warehouse] ?? s.warehouse}>{s.rawFlag === 1 ? "disponibil" : "epuizat"} <span className="text-xs text-muted-foreground">({dt(s.updatedAt)})</span></Row>)}
          {p.stock.length === 0 && <Row k="Depozite">fără date</Row>}
          <Row k="Vizualizări storefront (30 zile / total)">{Number(demand[0]?.v30 ?? 0)} / {Number(demand[0]?.vall ?? 0)}</Row>
          <Row k="Comenzi (nr. / unități)">{Number(orders[0]?.n ?? 0)} / {Number(orders[0]?.qty ?? 0)}</Row>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Istoric de preț">
          {priceEv.length === 0 ? <p className="text-sm text-muted-foreground">Nicio schimbare înregistrată încă.</p> : priceEv.map((e, i) => {
            const o = Number(e.oldPrice), n = Number(e.newPrice), pct = o > 0 ? ((n / o - 1) * 100).toFixed(1) : "—"
            return <Row key={i} k={dt(e.at)}>{ron(o)} → {ron(n)} <span className="text-xs text-muted-foreground">({Number(pct) > 0 ? "+" : ""}{pct}%)</span></Row>
          })}
        </Section>
        <Section title="Istoric de stoc la furnizor">
          {stockEv.length === 0 ? <p className="text-sm text-muted-foreground">Nicio schimbare înregistrată încă.</p> : stockEv.map((e, i) => (
            <Row key={i} k={dt(e.at)}>{WH[e.warehouse] ?? e.warehouse}: {e.oldFlag === 0 ? "epuizat" : e.oldFlag === 1 ? "disponibil" : "—"} → <b>{e.newFlag === 1 ? "disponibil" : "epuizat"}</b></Row>
          ))}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Coduri OE (${p.oeCodes.length})`}>
          {p.oeCodes.length === 0 ? <p className="text-sm text-muted-foreground">Fără coduri OE.</p> : <div className="flex flex-wrap gap-2">{p.oeCodes.map((o) => <Badge key={o.raw} variant="secondary" className="font-mono">{o.raw}</Badge>)}</div>}
        </Section>
        <Section title="Atribute">
          {attrs.length === 0 ? <p className="text-sm text-muted-foreground">Fără atribute.</p> : attrs.map(([k, v]) => <Row key={k} k={k}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</Row>)}
        </Section>
      </div>

      {seo && seoRow && (
        <Section title="SEO (propunere, neaplicată)">
          <Row k="Titlu">{seo.title} <span className="text-xs text-muted-foreground">({seo.title.length}/70)</span></Row>
          <Row k="Descriere">{seo.description}</Row>
          <Row k="Slug propus"><span className="font-mono text-xs break-all">{seo.slug}</span></Row>
          <Row k="Slug curent"><span className="font-mono text-xs break-all">{seoRow.currentSlug}</span></Row>
          <Row k="Titlu SEO salvat">{seoRow.currentSeoTitle ?? "—"}</Row>
        </Section>
      )}

      <Section title={`Compatibilitate vehicule (${fitCount})`}>
        {fitCount === 0 ? <p className="text-sm text-muted-foreground">Fără vehicule asociate.</p> : (
          <>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {fitments.map((f, i) => {
                const g = f.generation
                return <li key={i}><b>{g.model.make.name} {g.model.name}</b> <span className="text-muted-foreground">{g.name}{g.variant ? ` ${g.variant}` : ""}{g.yearFrom ? ` · ${g.yearFrom}–${g.yearTo ?? "azi"}` : ""}</span></li>
              })}
            </ul>
            {fitCount > fitments.length && <p className="mt-2 text-xs text-muted-foreground">Se afișează primele {fitments.length} din {fitCount}.</p>}
          </>
        )}
      </Section>

      {p.links.length > 0 && (
        <Section title="Produse legate">
          {p.links.map((l) => <Row key={l.related.id} k={l.type}><Link className="text-primary hover:underline" href={`/commerce/products/${l.related.id}`}><span className="font-mono">{l.related.supplierCode}</span></Link> {l.related.nameRo ?? l.related.nameEn}</Row>)}
        </Section>
      )}

      {reviews.length > 0 && (
        <Section title="Sincronizare furnizor: revizuiri">
          {reviews.map((r, i) => <Row key={i} k={`${dt(r.createdAt)} · ${r.kind}`}><Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge> {r.oldCost != null ? `cost ${Number(r.oldCost)} → ${Number(r.newCost)}` : ""} {r.oldPriceRon != null ? `· preț ${ron(Number(r.oldPriceRon))} → ${ron(Number(r.newPriceRon))}` : ""}</Row>)}
        </Section>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Poze ({imgs.length})</CardTitle></CardHeader>
        <CardContent>
          <ImageManager productId={id} images={imgs.map((i) => ({ id: i.id, url: imageUrl(i.objectKey), source: i.source, key: i.objectKey, width: i.width, height: i.height }))} />
        </CardContent>
      </Card>
    </div>
  )
}
