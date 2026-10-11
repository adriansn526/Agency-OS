import { db } from '@repo/db'
import { parsePriceSyncSettings } from '../sync/settings'
import { connectionStatus, getOverview } from './engine'

/** Everything the "Programări" page needs: scheduler state, jobs, history, configured secrets (presence only), and whether the price sync writes. */
export async function loadSchedulesView() {
  const ov = await getOverview()
  const bl = await db.businessLine.findUnique({ where: { slug: process.env.COMMERCE_SYNC_BUSINESS_LINE || 'ecaroseria' }, select: { id: true } })
  const channel = bl ? await db.commerceChannel.findUnique({ where: { businessLineId: bl.id }, select: { config: true } }) : null
  return { ...ov, connections: connectionStatus(), priceSyncWrites: parsePriceSyncSettings(channel?.config).enabled }
}
