// ─── SMSO.ro SMS Integration ───
// https://app.smso.ro/api/v1
// API Key stored in DB via Settings UI

const SMSO_BASE = 'https://app.smso.ro/api/v1'

interface SMSOResponse {
  status: string
  message?: string
  data?: any
}

interface SMSOSendResult {
  messageId: string
  status: string
  to: string
}

// Cache API key per request lifecycle
let _cachedApiKey: string | null = null

/**
 * Get SMSO API key from file-based settings store
 */
async function getApiKey(): Promise<string> {
  if (_cachedApiKey) return _cachedApiKey

  // Dynamic import to avoid circular deps at module load time
  const { readSettings } = await import('@/app/api/settings/_store')
  const settings = readSettings()

  if (!settings.integrations?.smso?.apiKey) {
    throw new Error('SMSO API Key nu este configurat. Mergi la Setări → Integrări.')
  }

  _cachedApiKey = settings.integrations.smso.apiKey
  return _cachedApiKey
}

/**
 * Reset cached API key (after settings update)
 */
export function resetSMSOCache() {
  _cachedApiKey = null
}

/**
 * Set API key directly (for testing or when reading from env)
 */
export function setSMSOApiKey(key: string) {
  _cachedApiKey = key
}

/**
 * Make authenticated request to SMSO API
 */
async function smsoFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = await getApiKey()
  
  const res = await fetch(`${SMSO_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': apiKey,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SMSO API Error (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Check account balance (may not be available on all SMSO plans)
 */
export async function getBalance(): Promise<{ balance: number; currency: string }> {
  try {
    const data = await smsoFetch('/balance')
    return {
      balance: data.balance || data.data?.balance || 0,
      currency: data.currency || 'RON',
    }
  } catch {
    // Balance endpoint may not exist, return unknown
    return { balance: -1, currency: 'RON' }
  }
}

/**
 * Send a single SMS
 */
export async function sendSMS(
  to: string, 
  body: string, 
  sender?: string
): Promise<SMSOSendResult> {
  // Normalize phone: ensure +40 prefix
  const phone = normalizePhone(to)
  
  // If no sender provided, get the first available sender from settings or API
  let senderId: number | string | undefined = sender
  if (!senderId) {
    try {
      const { readSettings } = await import('@/app/api/settings/_store')
      const settings = readSettings()
      const configured = settings.integrations?.smso?.sender
      if (configured) senderId = isNaN(Number(configured)) ? configured : Number(configured)
    } catch {}
  }
  if (!senderId) {
    // Fetch from API as last resort — use numeric ID
    try {
      const senders = await smsoFetch('/senders')
      if (Array.isArray(senders) && senders.length > 0) {
        senderId = senders[0].id // Use numeric ID, not name
      }
    } catch {}
  }
  if (!senderId) {
    throw new Error('Nu există un sender configurat. Configurează Sender ID în Setări → Integrări.')
  }

  const payload: any = {
    to: phone,
    body,
    sender: typeof senderId === 'number' ? senderId : (isNaN(Number(senderId)) ? senderId : Number(senderId)),
  }

  const data = await smsoFetch('/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    messageId: data.id || data.data?.id || '',
    status: data.status || 'sent',
    to: phone,
  }
}

/**
 * Send bulk SMS (max 100 per batch)
 */
export async function sendBulkSMS(
  messages: Array<{ to: string; body: string }>,
  sender?: string
): Promise<SMSOSendResult[]> {
  const results: SMSOSendResult[] = []
  
  // SMSO rate limit: ~10 req/sec, so we batch and add small delays
  const BATCH_SIZE = 10
  
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    
    const batchResults = await Promise.allSettled(
      batch.map(msg => sendSMS(msg.to, msg.body, sender))
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          messageId: '',
          status: 'failed',
          to: batch[batchResults.indexOf(result)]?.to || '',
        })
      }
    }

    // Rate limit: wait 1 second between batches
    if (i + BATCH_SIZE < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Get delivery report for a message
 */
export async function getDeliveryReport(messageId: string): Promise<{
  status: string
  deliveredAt?: string
}> {
  const data = await smsoFetch(`/report/${messageId}`)
  return {
    status: data.status || 'unknown',
    deliveredAt: data.deliveredAt || data.data?.deliveredAt,
  }
}

/**
 * Test connection (verify API key works)
 * Uses a lightweight sender list request to validate credentials
 */
export async function testConnection(apiKey?: string): Promise<{
  success: boolean
  senders?: Array<{ name: string; pricePerMessage: number }>
  error?: string
}> {
  const prevKey = _cachedApiKey
  try {
    if (apiKey) {
      _cachedApiKey = apiKey
    }
    const senders = await smsoFetch('/senders')
    if (Array.isArray(senders) && senders.length > 0) {
      return {
        success: true,
        senders: senders.map((s: any) => ({ name: s.name, pricePerMessage: s.pricePerMessage })),
      }
    }
    return { success: true, senders: [] }
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' }
  } finally {
    if (apiKey) {
      _cachedApiKey = prevKey
    }
  }
}

/**
 * Normalize Romanian phone numbers
 * Accepts: 07XXXXXXXX, +407XXXXXXXX, 407XXXXXXXX, 004XXXXXXXXX
 * Returns: +40XXXXXXXXX
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '')
  
  if (cleaned.startsWith('004')) {
    cleaned = '+' + cleaned.slice(2)
  } else if (cleaned.startsWith('07')) {
    cleaned = '+40' + cleaned.slice(1)
  } else if (cleaned.startsWith('40') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  return cleaned
}
