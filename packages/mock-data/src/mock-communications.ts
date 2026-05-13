import type { CommunicationEntry, CommunicationTemplate } from './types'

// ─── Mock Communication History ───

export const communicationHistory: CommunicationEntry[] = [
  // Swiss Amanet
  { id: 'comm-01', clientId: 'cli-003', clientName: 'Swiss Amanet SRL', channel: 'email', direction: 'outbound', subject: 'Raport SEO Lunar — Aprilie 2026', body: 'Atașăm raportul de performanță SEO pentru luna curentă cu rezultate pozitive pe toate KPI-urile.', date: '2026-04-11T14:30:00', emailStatus: 'opened', user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-02', clientId: 'cli-003', clientName: 'Swiss Amanet SRL', channel: 'call', direction: 'inbound', subject: 'Discuție buget Q2', body: 'Clientul dorește extinderea campaniei Google Ads cu 30%. Budget aprobat intern.', date: '2026-04-09T10:00:00', phone: '+40722345678', callResult: 'answered', duration: 22, user: 'Andrei', businessLine: 'agency' },
  { id: 'comm-03', clientId: 'cli-003', clientName: 'Swiss Amanet SRL', channel: 'video', direction: 'outbound', subject: 'Review Trimestrial Q1', body: 'Prezentare rezultate Q1, planificarea strategiei Q2. Participanți: echipa completă.', date: '2026-04-03T11:00:00', meetingType: 'review', meetingUrl: 'https://meet.asns.ro/swiss-amanet-q1-review', duration: 50, participants: ['contact@swissamanet.ro', 'alexandru@asns.ro', 'andrei@asns.ro'], user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-04', clientId: 'cli-003', clientName: 'Swiss Amanet SRL', channel: 'whatsapp', direction: 'outbound', subject: 'Follow-up ofertă LinkedIn Ads', body: 'Bună ziua! Vă contactăm referitor la propunerea de LinkedIn Ads trimisă săptămâna trecută. Aveți întrebări?', date: '2026-04-01T09:30:00', phone: '+40722345678', user: 'Andrei', businessLine: 'agency' },

  // QualityControl
  { id: 'comm-05', clientId: 'cli-002', clientName: 'QualityControl SRL', channel: 'email', direction: 'outbound', subject: 'Raport Trafic Organic — Martie 2026', body: 'Creștere de 23% pe clickuri organice. Top 10 keywords au crescut de la 38 la 42.', date: '2026-04-05T16:00:00', emailStatus: 'opened', user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-06', clientId: 'cli-002', clientName: 'QualityControl SRL', channel: 'call', direction: 'outbound', subject: 'Propunere upgrade pachet', body: 'Discutat posibilitatea adăugării Google Ads la pachetul existent. Clientul e interesat.', date: '2026-04-02T14:00:00', phone: '+40733456789', callResult: 'answered', duration: 15, user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-07', clientId: 'cli-002', clientName: 'QualityControl SRL', channel: 'sms', direction: 'outbound', subject: 'Reminder programare', body: 'Bună ziua! Vă reamintim de întâlnirea video programată pentru mâine la ora 10:00.', date: '2026-03-31T17:00:00', phone: '+40733456789', user: 'Andrei', businessLine: 'agency' },

  // Client cu restanță
  { id: 'comm-08', clientId: 'cli-007', clientName: 'Nord Digital GmbH', channel: 'email', direction: 'outbound', subject: 'Reminder factură restantă #F-2026-028', body: 'Vă reamintim că factura #F-2026-028 în valoare de 4,500€ este scadentă de 15 zile.', date: '2026-04-10T09:00:00', emailStatus: 'delivered', user: 'Andrei', businessLine: 'agency', templateId: 'tpl-reminder' },
  { id: 'comm-09', clientId: 'cli-007', clientName: 'Nord Digital GmbH', channel: 'call', direction: 'outbound', subject: 'Follow-up plată restantă', body: 'Clientul confirmă plata pentru săptămâna viitoare. Solicită o amânare de 7 zile.', date: '2026-04-08T11:30:00', phone: '+49151234567', callResult: 'answered', duration: 8, user: 'Andrei', businessLine: 'agency' },
  { id: 'comm-10', clientId: 'cli-007', clientName: 'Nord Digital GmbH', channel: 'whatsapp', direction: 'outbound', subject: 'Confirmare amânare plată', body: 'Bună ziua! Confirmăm amânarea plății cu 7 zile, noul termen fiind 17 Aprilie 2026.', date: '2026-04-08T12:00:00', phone: '+49151234567', user: 'Andrei', businessLine: 'agency' },

  // Client nou
  { id: 'comm-11', clientId: 'cli-005', clientName: 'Scandi Retail ApS', channel: 'video', direction: 'outbound', subject: 'Demo platformă Agency OS', body: 'Prezentare inițială a capabilităților SEO multilingv cu focus pe piețele nordice.', date: '2026-03-28T14:00:00', meetingType: 'demo', meetingUrl: 'https://meet.asns.ro/demo-scandi-retail', duration: 45, participants: ['info@scandiretail.dk', 'alexandru@asns.ro'], user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-12', clientId: 'cli-005', clientName: 'Scandi Retail ApS', channel: 'email', direction: 'outbound', subject: 'Ofertă SEO Multilingv', body: 'Ca urmare a demo-ului, vă trimitem oferta personalizată pentru SEO pe 6 piețe nordice.', date: '2026-03-29T10:00:00', emailStatus: 'opened', user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-13', clientId: 'cli-005', clientName: 'Scandi Retail ApS', channel: 'call', direction: 'inbound', subject: 'Clarificări ofertă', body: 'Clientul a sunat pentru detalii despre strategia de keyword research multilingv.', date: '2026-03-30T16:00:00', phone: '+4520123456', callResult: 'answered', duration: 35, user: 'Alexandru', businessLine: 'agency' },

  // Mixed channels
  { id: 'comm-14', clientId: 'cli-004', clientName: 'TechBuild Solutions', channel: 'sms', direction: 'outbound', subject: 'Confirmare lansare site', body: 'Bună ziua! Confirmăm lansarea site-ului nou mâine la ora 10:00. Vă rugăm verificați staging.', date: '2026-04-06T18:00:00', phone: '+40744567890', user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-15', clientId: 'cli-004', clientName: 'TechBuild Solutions', channel: 'email', direction: 'inbound', subject: 'Feedback site nou', body: 'Am verificat staging-ul, arată excelent! Confirmăm lansarea.', date: '2026-04-07T09:15:00', emailStatus: 'delivered', user: 'Alexandru', businessLine: 'agency' },

  // Fudly
  { id: 'comm-16', clientId: 'cli-fudly-001', clientName: 'La Giovanni', channel: 'call', direction: 'outbound', subject: 'Onboarding follow-up', body: 'Verificare funcționalitate meniu digital. Totul OK, clientul este mulțumit.', date: '2026-04-04T12:00:00', phone: '+40722111222', callResult: 'answered', duration: 12, user: 'Andrei', businessLine: 'fudly' },
  { id: 'comm-17', clientId: 'cli-fudly-002', clientName: 'Burger Joint', channel: 'whatsapp', direction: 'outbound', subject: 'Reminder activare plan', body: 'Bună ziua! Perioada de trial se încheie în 3 zile. Doriți să continuați cu planul Standard?', date: '2026-04-10T10:00:00', phone: '+40733222333', user: 'Andrei', businessLine: 'fudly' },

  // Incoming
  { id: 'comm-18', clientId: 'cli-008', clientName: 'Alpine Tech SRL', channel: 'call', direction: 'inbound', subject: 'Cerere urgentă modificări site', body: 'Clientul raportează un bug pe pagina de contact. Nu funcționează formularul.', date: '2026-04-12T08:45:00', phone: '+40755888999', callResult: 'answered', duration: 5, user: 'Alexandru', businessLine: 'agency' },
  { id: 'comm-19', clientId: 'cli-009', clientName: 'MediaPro Digital', channel: 'email', direction: 'inbound', subject: 'Solicitare raport ad-hoc', body: 'Avem nevoie de un raport detaliat pe keywords pentru board meeting de vineri.', date: '2026-04-11T11:20:00', emailStatus: 'delivered', user: 'Alexandru', businessLine: 'agency' },
]

// ─── Communication Templates ───

export const communicationTemplates: CommunicationTemplate[] = [
  // Follow-up
  { id: 'tpl-followup-offer', channel: 'whatsapp', name: 'Follow-up Ofertă', body: 'Bună ziua, {{contactPerson}}! Vă contactăm referitor la oferta {{offerNumber}} trimisă pe {{sentDate}}. Aveți întrebări?', variables: ['contactPerson', 'offerNumber', 'sentDate'], category: 'follow_up' },
  { id: 'tpl-followup-email', channel: 'email', name: 'Follow-up Ofertă', subject: 'Follow-up: Oferta {{offerNumber}}', body: 'Bună ziua {{contactPerson}},\n\nRevenim referitor la oferta {{offerNumber}} trimisă pe {{sentDate}} pentru {{companyName}}.\n\nSuntem disponibili pentru orice clarificări sau ajustări.\n\nCu stimă,\nEchipa ASNS', variables: ['contactPerson', 'offerNumber', 'sentDate', 'companyName'], category: 'follow_up' },

  // Reminder
  { id: 'tpl-reminder', channel: 'email', name: 'Reminder Plată', subject: 'Reminder: Factură #{{invoiceNumber}} scadentă', body: 'Bună ziua,\n\nVă reamintim că factura #{{invoiceNumber}} în valoare de {{amount}} {{currency}} este scadentă la {{dueDate}}.\n\nVă rugăm confirmați plata.\n\nMulțumim!', variables: ['invoiceNumber', 'amount', 'currency', 'dueDate'], category: 'reminder' },
  { id: 'tpl-reminder-sms', channel: 'sms', name: 'Reminder Plată SMS', body: 'ASNS: Factura #{{invoiceNumber}} ({{amount}}€) scadenta la {{dueDate}}. Detalii: {{email}}', variables: ['invoiceNumber', 'amount', 'dueDate', 'email'], category: 'reminder' },
  { id: 'tpl-reminder-whatsapp', channel: 'whatsapp', name: 'Reminder Plată WhatsApp', body: 'Bună ziua! Vă reamintim că factura #{{invoiceNumber}} în valoare de {{amount}}€ este scadentă la {{dueDate}}. Mulțumim!', variables: ['invoiceNumber', 'amount', 'dueDate'], category: 'reminder' },

  // Confirmation
  { id: 'tpl-confirm-meeting', channel: 'whatsapp', name: 'Confirmare Programare', body: 'Bună ziua! Confirmăm întâlnirea de {{meetingType}} programată pentru {{date}} la ora {{time}}. Link: {{meetingUrl}}', variables: ['meetingType', 'date', 'time', 'meetingUrl'], category: 'confirmation' },
  { id: 'tpl-confirm-sms', channel: 'sms', name: 'Confirmare Meeting SMS', body: 'ASNS: Confirmare meeting {{date}} ora {{time}}. Link: {{meetingUrl}}', variables: ['date', 'time', 'meetingUrl'], category: 'confirmation' },

  // Welcome
  { id: 'tpl-welcome', channel: 'email', name: 'Welcome New Client', subject: 'Bine ați venit în familia ASNS!', body: 'Dragă {{contactPerson}},\n\nVă mulțumim pentru încrederea acordată! Suntem bucuroși să începem colaborarea cu {{companyName}}.\n\nÎn curând veți primi acces la dashboard-ul vostru personalizat.\n\nCu entuziasm,\nEchipa ASNS', variables: ['contactPerson', 'companyName'], category: 'welcome' },

  // Report
  { id: 'tpl-report-seo', channel: 'email', name: 'Raport SEO Lunar', subject: 'Raport SEO — {{month}} {{year}}', body: 'Bună ziua {{contactPerson}},\n\nAtașăm raportul lunar de performanță SEO pentru {{companyName}}.\n\nHighlights:\n• Trafic organic: {{clicks}} clicks ({{clicksChange}})\n• Poziție medie: {{avgPosition}}\n• Keywords Top 10: {{top10Keywords}}\n\nRaportul detaliat este atașat.\n\nCu stimă,\nEchipa ASNS', variables: ['contactPerson', 'companyName', 'month', 'year', 'clicks', 'clicksChange', 'avgPosition', 'top10Keywords'], category: 'report' },
]

/** Get communications for a specific client */
export function getClientCommunications(clientId: string): CommunicationEntry[] {
  return communicationHistory.filter(c => c.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** Get templates by channel */
export function getTemplatesByChannel(channel: string): CommunicationTemplate[] {
  if (channel === 'all') return communicationTemplates
  return communicationTemplates.filter(t => t.channel === channel)
}

/** Get communication statistics */
export function getCommunicationStats() {
  const now = new Date()
  const thisMonth = communicationHistory.filter(c => {
    const d = new Date(c.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const byChannel: Record<string, number> = {}
  communicationHistory.forEach(c => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1 })

  return {
    totalThisMonth: thisMonth.length,
    totalAll: communicationHistory.length,
    byChannel,
    callsThisMonth: thisMonth.filter(c => c.channel === 'call').length,
    emailsThisMonth: thisMonth.filter(c => c.channel === 'email').length,
    avgCallDuration: Math.round(communicationHistory.filter(c => c.channel === 'call' && c.duration).reduce((s, c) => s + (c.duration || 0), 0) / Math.max(1, communicationHistory.filter(c => c.channel === 'call').length)),
    emailOpenRate: 75, // mock
    responseRate: 62, // mock
  }
}
