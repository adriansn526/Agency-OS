import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@repo/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { imageUrl } from "@/lib/commerce/images/urls"
import { ImageManager } from "./image-manager"

export const dynamic = 'force-dynamic'

export default async function CommerceProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.commerceProduct.findUnique({ where: { id }, select: { id: true, supplierCode: true, nameRo: true, nameEn: true, category: { select: { nameRo: true } } } })
  if (!p) notFound()
  const imgs = await db.$queryRaw<Array<{ id: string; objectKey: string; source: string; width: number | null; height: number | null }>>`
    SELECT id, "objectKey", source, width, height FROM "CommerceProductImage" WHERE "productId" = ${id} ORDER BY (source = 'manual') DESC, position, "objectKey"`
  const listing = await db.commerceListing.findFirst({ where: { productId: id }, select: { slug: true } })
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl">
      <div>
        <Link href="/commerce/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Produse</Link>
        <h1 className="text-2xl font-bold tracking-tight">{p.nameRo ?? p.nameEn}</h1>
        <p className="text-sm text-muted-foreground">SKU <span className="font-mono">{p.supplierCode}</span>{p.category ? ` · ${p.category.nameRo}` : ""}{listing ? ` · slug ${listing.slug}` : ""}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Poze ({imgs.length})</CardTitle></CardHeader>
        <CardContent>
          <ImageManager
            productId={id}
            images={imgs.map((i) => ({ id: i.id, url: imageUrl(i.objectKey), source: i.source, key: i.objectKey, width: i.width, height: i.height }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
