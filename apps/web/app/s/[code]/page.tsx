import { redirect } from "next/navigation"
import { db } from "@repo/db"

// Public redirect — no auth required
// URL: /s/abc123 → 302 redirect to targetUrl + increment clicks
export default async function ShortLinkRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const link = await db.shortLink.findUnique({ where: { code } })

  if (!link) {
    redirect("/")
  }

  // Increment click counter (fire and forget)
  db.shortLink.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 } },
  }).catch(() => {})

  redirect(link.targetUrl)
}
