import { redirect } from "next/navigation"

export default async function RedirectToNewOfferRoute({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/o/${token}`)
}
