/** Post-commit notifications for storefront orders. Never throws: failures are logged, the order stays saved. */
import { db } from '@repo/db'
import { sendRawEmail } from '@/lib/email'
import { sendTelegramAlert } from '@/lib/notifications/telegram'
import type { OrderSummary } from './orders'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ron = (n: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(n)

function customerEmail(o: OrderSummary) {
  const rows = o.items.map((i) =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(i.name)}<br><span style="color:#888;font-size:12px">Cod: ${esc(i.sku)}</span></td>` +
    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>` +
    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${ron(i.totalRon)}</td></tr>`).join('')
  const sh = o.shipping
  const html = `<!DOCTYPE html><html lang="ro"><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:16px">
<h2 style="margin:0 0 4px">Am primit comanda ta ${esc(o.number)}</h2>
<p>Mulțumim, ${esc(o.customer.name)}! Te contactăm telefonic în cel mai scurt timp pentru confirmarea comenzii, a stocului și a costului de transport.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tr><th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Produs</th><th style="padding:6px 8px;border-bottom:2px solid #ccc">Cant.</th><th align="right" style="padding:6px 8px;border-bottom:2px solid #ccc">Total</th></tr>${rows}
<tr><td colspan="2" style="padding:8px;text-align:right"><b>Total produse (TVA inclus)</b></td><td style="padding:8px;text-align:right"><b>${ron(o.totalRon)}</b></td></tr></table>
<p style="font-size:14px">Transport: se confirmă telefonic.<br>Plată: ramburs, la livrare.<br>Livrare la: ${esc(sh.address)}, ${esc(sh.city)}, ${esc(sh.county)}${sh.postalCode ? `, ${esc(sh.postalCode)}` : ''}</p>
${o.notes ? `<p style="font-size:14px">Observațiile tale: ${esc(o.notes)}</p>` : ''}
<p style="color:#888;font-size:12px">Ai primit acest mesaj pentru că ai plasat o comandă pe ecaroseria.ro.</p></body></html>`
  const text = [
    `Am primit comanda ta ${o.number}`, '', `Mulțumim, ${o.customer.name}! Te contactăm telefonic pentru confirmarea comenzii, a stocului și a costului de transport.`, '',
    ...o.items.map((i) => `- ${i.name} (cod ${i.sku}) x ${i.quantity} = ${ron(i.totalRon)}`),
    `Total produse (TVA inclus): ${ron(o.totalRon)}`, 'Transport: se confirmă telefonic. Plată: ramburs, la livrare.',
    `Livrare la: ${sh.address}, ${sh.city}, ${sh.county}${sh.postalCode ? `, ${sh.postalCode}` : ''}`,
  ].join('\n')
  return { html, text }
}

export async function notifyNewOrder(o: OrderSummary): Promise<void> {
  // Customer confirmation
  try {
    const { html, text } = customerEmail(o)
    await sendRawEmail({ to: o.customer.email, subject: `Comanda ${o.number} a fost primită`, html, text, businessLine: 'ecaroseria' })
  } catch (e) { console.error('[storefront/orders] customer email failed', o.number, e) }

  // Internal: Telegram + activity feed in the ERP
  try {
    await sendTelegramAlert(
      `🛒 <b>Comandă nouă ${esc(o.number)}</b> (eCaroseria)\n👤 ${esc(o.customer.name)} · ${esc(o.customer.phone)}\n📧 ${esc(o.customer.email)}\n` +
      o.items.map((i) => `• ${esc(i.name)} × ${i.quantity}`).join('\n') +
      `\n💰 ${ron(o.totalRon)} (TVA incl., ramburs)${o.bulky ? '\n📦 produse voluminoase' : ''}\n\n🔗 https://admin.asns.ro/crm/lead-uri/${o.leadId}`,
      'HTML',
    )
  } catch (e) { console.error('[storefront/orders] telegram failed', o.number, e) }
  try {
    await db.activity.create({
      data: {
        action: 'created', entityType: 'lead', entityId: o.leadId, entityName: `Comandă ${o.number} — ${o.customer.name}`,
        businessLineId: o.businessLineId, details: { source: 'storefront-ecaroseria', order: o.number, total: o.totalRon }, leadId: o.leadId,
      },
    })
  } catch (e) { console.error('[storefront/orders] activity failed', o.number, e) }
}
