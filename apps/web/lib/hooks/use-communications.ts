import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ───
export interface Communication {
  id: string
  businessLineId: string | null
  clientId: string | null
  channel: string // email | call | whatsapp | sms | video
  direction: string // inbound | outbound
  subject: string
  body: string
  fromAddr: string | null
  toAddr: string | null
  emailStatus: string | null
  phone: string | null
  callResult: string | null
  duration: number | null
  meetingType: string | null
  meetingUrl: string | null
  participants: string[]
  userId: string | null
  userName: string | null
  tags: string[]
  attachments: string[]
  metadata: any
  createdAt: string
  updatedAt: string
  client?: { id: string; companyName: string; contactPerson?: string } | null
  businessLine?: { id: string; slug: string; name: string } | null
}

interface CommunicationsResponse {
  data: Communication[]
  total: number
  page: number
  totalPages: number
  stats: Record<string, number>
}

// ─── Hook: Fetch all communications ───
export function useAllCommunications(filters?: {
  clientId?: string
  channel?: string
  search?: string
}) {
  const [data, setData] = useState<Communication[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchComms = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters?.clientId) params.set('clientId', filters.clientId)
      if (filters?.channel) params.set('channel', filters.channel)
      if (filters?.search) params.set('search', filters.search)
      params.set('limit', '100')

      const res = await fetch(`/api/communications?${params}`)
      if (res.ok) {
        const json: CommunicationsResponse = await res.json()
        setData(json.data)
        setStats(json.stats)
        setTotal(json.total)
      }
    } catch (e) {
      console.error('Failed to fetch communications:', e)
    } finally {
      setLoading(false)
    }
  }, [filters?.clientId, filters?.channel, filters?.search])

  useEffect(() => { fetchComms() }, [fetchComms])

  return { communications: data, stats, total, loading, refetch: fetchComms }
}

// ─── Hook: Client communications ───
export function useClientCommunications(clientId: string | undefined) {
  return useAllCommunications(clientId ? { clientId } : undefined)
}

// ─── Hook: Create communication ───
export function useCreateCommunication() {
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (data: Partial<Communication> & { channel: string; subject: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        return json.data as Communication
      }
      return null
    } catch (e) {
      console.error('Failed to create communication:', e)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading }
}

// ─── Hook: Stats ───
export function useCommunicationStats() {
  const [stats, setStats] = useState({
    totalEmails: 0,
    totalCalls: 0,
    totalMessages: 0,
    totalVideos: 0,
    avgCallDuration: 0,
    responseRate: 0,
  })

  useEffect(() => {
    fetch('/api/communications?limit=1')
      .then(r => r.json())
      .then(json => {
        const s = json.stats || {}
        setStats({
          totalEmails: s.email || 0,
          totalCalls: s.call || 0,
          totalMessages: (s.whatsapp || 0) + (s.sms || 0),
          totalVideos: s.video || 0,
          avgCallDuration: 0,
          responseRate: 0,
        })
      })
      .catch(() => {})
  }, [])

  return stats
}

// ─── Hook: Templates (keep static for now) ───
export function useCommunicationTemplates() {
  return useMemo(() => [
    { id: 'tpl-1', channel: 'email', name: 'Reminder Plată', subject: 'Reminder factură restantă', body: 'Vă reamintim că factura #{invoice} este scadentă.' },
    { id: 'tpl-2', channel: 'email', name: 'Raport Lunar', subject: 'Raport de performanță', body: 'Atașăm raportul de performanță pentru luna curentă.' },
    { id: 'tpl-3', channel: 'email', name: 'Follow-up Ofertă', subject: 'Follow-up ofertă', body: 'Revin cu referire la oferta trimisă anterior.' },
    { id: 'tpl-4', channel: 'sms', name: 'Confirmare Întâlnire', body: 'Vă confirmăm întâlnirea programată pentru data de {date} la ora {hour}.' },
  ], [])
}
