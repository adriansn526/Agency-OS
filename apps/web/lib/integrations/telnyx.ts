/**
 * Telnyx Call Tracking Integration for Agency OS
 * Supports DNI (Dynamic Number Insertion) — each phone number maps to a traffic source
 */

const TELNYX_API_KEY = process.env.TELNYX_API_KEY || '';
const TELNYX_HOST = 'https://api.telnyx.com/v2';

async function telnyxFetch(path: string) {
  const res = await fetch(`${TELNYX_HOST}${path}`, {
    headers: { 'Authorization': `Bearer ${TELNYX_API_KEY}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Telnyx API ${res.status}: ${txt.substring(0, 200)}`);
  }

  return res.json();
}

// ─── Types ───

/** Phone number with source attribution (DNI) */
export interface TelnyxPhoneConfig {
  number: string;
  source: string;  // google_ads, organic, direct, facebook, referral, etc.
  label: string;   // Human-readable: "Google Ads", "Organic", "Direct"
}

export interface TelnyxCallStats {
  totalCalls: number;
  avgDuration: number;  // seconds
  totalDuration: number;
  bySource: Array<{
    source: string;
    label: string;
    count: number;
    avgDuration: number;
  }>;
  calls: Array<{
    id: string;
    from: string;
    to: string;
    duration: number;
    createdAt: string;
    downloadUrl: string | null;
    source: string;      // Traffic source attribution
    sourceLabel: string;  // Human-readable label
  }>;
}

// ─── Source mapping constants ───

const SOURCE_CONFIG: Record<string, { label: string; emoji: string }> = {
  google_ads: { label: 'Google Ads', emoji: '📢' },
  organic: { label: 'Organic', emoji: '🌱' },
  direct: { label: 'Direct', emoji: '📱' },
  facebook: { label: 'Facebook', emoji: '👤' },
  referral: { label: 'Referral', emoji: '🔗' },
  email: { label: 'Email', emoji: '✉️' },
  seo: { label: 'SEO', emoji: '🔍' },
  unknown: { label: 'Necunoscut', emoji: '❓' },
};

/**
 * Normalize phone configs: supports both old string[] and new TelnyxPhoneConfig[] formats
 */
function normalizePhoneConfigs(raw: unknown): TelnyxPhoneConfig[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any) => {
    if (typeof item === 'string') {
      // Legacy format — string[] with no source attribution
      return { number: item, source: 'unknown', label: 'Necunoscut' };
    }
    // New format — {number, source, label}
    return {
      number: item.number || '',
      source: item.source || 'unknown',
      label: item.label || SOURCE_CONFIG[item.source]?.label || item.source || 'Necunoscut',
    };
  });
}

/**
 * Get call recordings for project phone numbers within a date range
 * Supports DNI: each call is attributed to a source based on the phone number it came in on
 */
export async function getCallRecordings(
  phoneNumbersRaw: unknown,
  dateFrom: string,
  dateTo: string
): Promise<TelnyxCallStats> {
  if (!TELNYX_API_KEY) throw new Error('TELNYX_API_KEY not set');

  const phoneConfigs = normalizePhoneConfigs(phoneNumbersRaw);
  if (!phoneConfigs.length) {
    return { totalCalls: 0, avgDuration: 0, totalDuration: 0, bySource: [], calls: [] };
  }

  // Build phone → source lookup
  const phoneToSource = new Map<string, { source: string; label: string }>();
  for (const pc of phoneConfigs) {
    phoneToSource.set(pc.number, { source: pc.source, label: pc.label });
  }
  const phoneNumbers = phoneConfigs.map(p => p.number);

  // Fetch all recordings (paginated)
  let allRecordings: any[] = [];
  let page = 1;
  const pageSize = 100;
  
  while (page <= 3) {
    const data = await telnyxFetch(`/recordings?page[size]=${pageSize}&page[number]=${page}`);
    const recs = data.data || [];
    allRecordings = allRecordings.concat(recs);
    if (recs.length < pageSize) break;
    page++;
  }

  // Filter by phone numbers and date range
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo + 'T23:59:59Z');

  const filtered = allRecordings.filter((rec: any) => {
    const recDate = new Date(rec.created_at);
    const matchesPhone = phoneNumbers.some(
      ph => rec.to === ph || rec.from === ph
    );
    const matchesDate = recDate >= fromDate && recDate <= toDate;
    return matchesPhone && matchesDate;
  });

  // Sort by date DESC
  filtered.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalDuration = filtered.reduce(
    (sum: number, r: any) => sum + (r.duration_millis ? r.duration_millis / 1000 : 0), 0
  );

  // Map calls with source attribution
  const calls = filtered.map((rec: any) => {
    // Determine which of our numbers was involved (to = inbound to us)
    const matchedPhone = phoneNumbers.find(ph => rec.to === ph) 
      || phoneNumbers.find(ph => rec.from === ph) 
      || '';
    const attribution = phoneToSource.get(matchedPhone) || { source: 'unknown', label: 'Necunoscut' };

    return {
      id: rec.id,
      from: rec.from || '',
      to: rec.to || '',
      duration: rec.duration_millis ? Math.round(rec.duration_millis / 1000) : 0,
      createdAt: rec.created_at,
      downloadUrl: rec.download_urls?.mp3 || null,
      source: attribution.source,
      sourceLabel: attribution.label,
    };
  });

  // Aggregate by source
  const sourceMap = new Map<string, { label: string; count: number; totalDur: number }>();
  for (const call of calls) {
    const existing = sourceMap.get(call.source) || { label: call.sourceLabel, count: 0, totalDur: 0 };
    existing.count++;
    existing.totalDur += call.duration;
    sourceMap.set(call.source, existing);
  }

  const bySource = [...sourceMap.entries()].map(([source, data]) => ({
    source,
    label: data.label,
    count: data.count,
    avgDuration: data.count > 0 ? Math.round(data.totalDur / data.count) : 0,
  })).sort((a, b) => b.count - a.count);

  return {
    totalCalls: filtered.length,
    avgDuration: filtered.length > 0 ? Math.round(totalDuration / filtered.length) : 0,
    totalDuration: Math.round(totalDuration),
    bySource,
    calls,
  };
}
