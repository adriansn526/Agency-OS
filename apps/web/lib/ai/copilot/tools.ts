// ─── AI Copilot — Tool Definitions & Executors (Phase 3) ───
// Internal tools: Prisma DB queries via db-queries.ts
// External tools: Google Ads, PostHog, GSC via external-tools.ts
// Action tools: approval-based write ops via action-system.ts

import {
  queryDashboardStats,
  queryClients,
  queryLeads,
  queryProjects,
  queryOffers,
  queryInvoices,
  queryRevenueHistory,
  queryMarketingStats,
  searchEntity,
  generateSummaryReport,
  // Phase 4 CRUD
  createClient, updateClient, deleteClient,
  createLead, updateLead, deleteLead,
  createProject, updateProject,
  createInvoice, updateInvoiceStatus,
  createOffer, updateOfferStatus,
  createCampaign, updateCampaignStatus, deleteCampaign,
} from './db-queries'
import { externalToolDefinitions, executeExternalTool } from './external-tools'
import { proposeAction } from './action-system'

// ────────────────────────────────────────────
// Tool Definitions (for Gemini function calling schema)
// ────────────────────────────────────────────

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const copilotTools: ToolDefinition[] = [
  {
    name: 'get_dashboard_stats',
    description: 'Obține KPI-urile globale ale companiei din baza de date: total clienți activi, proiecte active, MRR, lead-uri deschise, rata de conversie, facturi restante, venituri lunare',
    parameters: {
      type: 'object',
      properties: {
        business_line: {
          type: 'string',
          enum: ['all', 'agency', 'fudly', 'climaticpro'],
          description: 'Filtrare pe linie de business. Default: all',
        },
      },
    },
  },
  {
    name: 'get_clients',
    description: 'Obține lista de clienți reali din baza de date cu detalii (nume, status, linie de business, nr proiecte/facturi). Poate filtra pe status sau linie de business.',
    parameters: {
      type: 'object',
      properties: {
        business_line: {
          type: 'string',
          enum: ['all', 'agency', 'fudly', 'climaticpro'],
          description: 'Filtrare pe linie de business',
        },
        status: {
          type: 'string',
          enum: ['activ', 'inactiv', 'prospect', 'all'],
          description: 'Filtrare pe status',
        },
      },
    },
  },
  {
    name: 'get_leads',
    description: 'Obține pipeline-ul de lead-uri din baza de date: nume, valoare estimată, probabilitate, sursă, stadiu. Poate filtra pe linie de business sau probabilitate minimă.',
    parameters: {
      type: 'object',
      properties: {
        business_line: {
          type: 'string',
          enum: ['all', 'agency', 'fudly', 'climaticpro'],
          description: 'Filtrare pe linie de business',
        },
        min_probability: {
          type: 'number',
          description: 'Probabilitate minimă (0-100). Ex: 70 pentru lead-uri fierbinți',
        },
      },
    },
  },
  {
    name: 'get_projects',
    description: 'Obține lista proiectelor din baza de date: nume, client, status, progres, dată deadline. Poate filtra pe status.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['in_lucru', 'finalizat', 'in_asteptare', 'planificare', 'anulat', 'all'],
          description: 'Filtrare pe status proiect',
        },
      },
    },
  },
  {
    name: 'get_offers',
    description: 'Obține ofertele comerciale din baza de date: client, valoare, status (draft, trimisa, acceptata, refuzata). Calculează pipeline value.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'trimisa', 'vizualizata', 'acceptata', 'respinsa', 'expirata', 'active', 'all'],
          description: 'Filtrare pe status. "active" = draft + trimisa + vizualizata',
        },
      },
    },
  },
  {
    name: 'get_invoices',
    description: 'Obține facturile din baza de date: număr, client, sumă, status (platita, restanta, trimisa). Calculează total restanțe.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['platita', 'restanta', 'trimisa', 'emisa', 'all'],
          description: 'Filtrare pe status factură',
        },
      },
    },
  },
  {
    name: 'get_revenue_history',
    description: 'Obține istoricul veniturilor pe ultimele 6 luni din baza de date, detaliat per linie de business cu trend de creștere.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_marketing_stats',
    description: 'Obține KPI-uri marketing din baza de date: total contacte, segmente, campanii active, open rate, rata de conversie, campanii recente.',
    parameters: {
      type: 'object',
      properties: {
        business_line: {
          type: 'string',
          enum: ['agency', 'fudly', 'climaticpro'],
          description: 'Linia de business pentru care vrei date marketing (obligatoriu)',
        },
      },
    },
  },
  {
    name: 'search_entity',
    description: 'Caută în baza de date după text: clienți, lead-uri, proiecte, oferte. Returnează rezultate cu linkuri de navigare directe.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Textul de căutat (nume firmă, persoană, email, cod ofertă)',
        },
        entity_type: {
          type: 'string',
          enum: ['client', 'lead', 'project', 'offer', 'all'],
          description: 'Filtrează pe tipul entității. Default: all',
        },
      },
    },
  },
  {
    name: 'navigate_to',
    description: 'Navighează utilizatorul la o pagină specifică din Agency OS. Folosește când utilizatorul cere să fie dus undeva sau după un search pentru a deschide o entitate.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Calea în aplicație, ex: /crm/clienti, /finance, /projects/abc123, /crm/lead-uri/xyz',
        },
        reason: {
          type: 'string',
          description: 'Motivul navigării (afișat utilizatorului)',
        },
      },
    },
  },
  {
    name: 'update_lead_status',
    description: 'Schimbă statusul unui lead în baza de date. Folosește doar după ce ai găsit lead-ul prin search sau get_leads. Creează activity log automat.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'ID-ul lead-ului (obținut din search_entity sau get_leads)',
        },
        new_status: {
          type: 'string',
          description: 'Noul status al lead-ului (ex: contactat, calificat, propunere, negociere, castigat, pierdut)',
        },
      },
    },
  },
  {
    name: 'generate_summary_report',
    description: 'Generează un raport executiv complet cu toate KPI-urile, alertele (facturi restante, lead-uri fierbinți), trenduri venituri. Ideal pentru sumar zilnic/săptămânal.',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['all', 'agency', 'fudly', 'climaticpro'],
          description: 'Scope-ul raportului. Default: all',
        },
      },
    },
  },
  // ── Phase 4: CRUD tools (approval-based) ──
  {
    name: 'create_client',
    description: 'Creează un client nou în ERP. Necesită: companyName, contactPerson, email, business_line. Opțional: phone, website, status, notes.',
    parameters: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Numele firmei' },
        contactPerson: { type: 'string', description: 'Persoana de contact' },
        email: { type: 'string', description: 'Email contact' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        phone: { type: 'string', description: 'Telefon (opțional)' },
        website: { type: 'string', description: 'Website (opțional)' },
        status: { type: 'string', enum: ['activ', 'inactiv', 'prospect'], description: 'Status inițial. Default: prospect' },
        notes: { type: 'string', description: 'Note (opțional)' },
      },
      required: ['companyName', 'contactPerson', 'email', 'business_line'],
    },
  },
  {
    name: 'update_client',
    description: 'Actualizează un câmp al unui client existent. Câmpuri permise: status, contactPerson, email, phone, website, notes, companyName, industry, address.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID-ul clientului (obținut din search_entity sau get_clients)' },
        field: { type: 'string', enum: ['status', 'contactPerson', 'email', 'phone', 'website', 'notes', 'companyName', 'industry', 'address'], description: 'Câmpul de actualizat' },
        value: { type: 'string', description: 'Noua valoare' },
      },
      required: ['client_id', 'field', 'value'],
    },
  },
  {
    name: 'delete_client',
    description: 'Dezactivează un client (soft delete). Funcționează doar dacă clientul nu are proiecte sau facturi asociate.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID-ul clientului' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'create_lead',
    description: 'Creează un lead nou în pipeline. Necesită: companyName, contactPerson, email, business_line. Opțional: source, value, probability, priority, phone, city.',
    parameters: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Numele firmei' },
        contactPerson: { type: 'string', description: 'Persoana de contact' },
        email: { type: 'string', description: 'Email contact' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        source: { type: 'string', enum: ['website', 'referral', 'linkedin', 'cold_outreach', 'google_ads', 'manual'], description: 'Sursa lead-ului' },
        value: { type: 'number', description: 'Valoare estimată deal (EUR)' },
        probability: { type: 'number', description: 'Probabilitate conversie (0-100)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Prioritate' },
        phone: { type: 'string', description: 'Telefon (opțional)' },
        city: { type: 'string', description: 'Oraș (opțional)' },
      },
      required: ['companyName', 'contactPerson', 'email', 'business_line'],
    },
  },
  {
    name: 'update_lead',
    description: 'Actualizează un câmp al unui lead existent. Câmpuri permise: status, probability, priority, value, notes, contactPerson, email, phone, source, nextAction, assignedTo, city.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'ID-ul lead-ului' },
        field: { type: 'string', enum: ['status', 'probability', 'priority', 'value', 'notes', 'contactPerson', 'email', 'phone', 'source', 'nextAction', 'assignedTo', 'city'], description: 'Câmpul de actualizat' },
        value: { type: 'string', description: 'Noua valoare (numerele se convertesc automat)' },
      },
      required: ['lead_id', 'field', 'value'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Șterge un lead (soft delete). Nu funcționează dacă lead-ul a fost deja convertit în client.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'ID-ul lead-ului' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'create_project',
    description: 'Creează un proiect nou pentru un client existent. Necesită: name, client_id, business_line. Opțional: budget, due_date.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Numele proiectului' },
        client_id: { type: 'string', description: 'ID-ul clientului (obținut din search_entity)' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        budget: { type: 'number', description: 'Buget estimat (EUR)' },
        due_date: { type: 'string', description: 'Deadline (YYYY-MM-DD)' },
      },
      required: ['name', 'client_id', 'business_line'],
    },
  },
  {
    name: 'update_project',
    description: 'Actualizează un câmp al unui proiect. Câmpuri permise: status, progress, currentPhase, notes, name, assignedTo.',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID-ul proiectului' },
        field: { type: 'string', enum: ['status', 'progress', 'currentPhase', 'notes', 'name', 'assignedTo'], description: 'Câmpul de actualizat' },
        value: { type: 'string', description: 'Noua valoare' },
      },
      required: ['project_id', 'field', 'value'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Creează o factură nouă cu număr auto-generat. Necesită: client_id, business_line, amount, due_date. Opțional: type, direction, currency.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID-ul clientului' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        amount: { type: 'number', description: 'Suma facturii' },
        due_date: { type: 'string', description: 'Data scadență (YYYY-MM-DD)' },
        type: { type: 'string', enum: ['proforma', 'fiscala', 'subscriptie'], description: 'Tip factură. Default: fiscala' },
        direction: { type: 'string', enum: ['emisa', 'primita'], description: 'Direcție. Default: emisa' },
        currency: { type: 'string', enum: ['EUR', 'RON'], description: 'Monedă. Default: EUR' },
      },
      required: ['client_id', 'business_line', 'amount', 'due_date'],
    },
  },
  {
    name: 'update_invoice_status',
    description: 'Schimbă statusul unei facturi. Dacă status = platita, setează automat data plății.',
    parameters: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'ID-ul facturii' },
        new_status: { type: 'string', enum: ['emisa', 'trimisa', 'platita', 'restanta', 'anulata'], description: 'Noul status' },
      },
      required: ['invoice_id', 'new_status'],
    },
  },
  {
    name: 'create_offer',
    description: 'Creează o ofertă comercială draft cu număr auto-generat. Necesită: client_id, business_line, value, service_name.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID-ul clientului' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        value: { type: 'number', description: 'Valoarea ofertei' },
        service_name: { type: 'string', description: 'Denumirea serviciului/produsului oferit' },
        currency: { type: 'string', enum: ['EUR', 'RON'], description: 'Monedă. Default: EUR' },
        valid_days: { type: 'number', description: 'Zile de valabilitate. Default: 30' },
      },
      required: ['client_id', 'business_line', 'value', 'service_name'],
    },
  },
  {
    name: 'update_offer_status',
    description: 'Schimbă statusul unei oferte comerciale.',
    parameters: {
      type: 'object',
      properties: {
        offer_id: { type: 'string', description: 'ID-ul ofertei' },
        new_status: { type: 'string', enum: ['draft', 'trimisa', 'vizualizata', 'acceptata', 'respinsa', 'expirata'], description: 'Noul status' },
      },
      required: ['offer_id', 'new_status'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Creează o campanie marketing nouă. Necesită: name, business_line, template_id, channel. Opțional: segment_id, scheduled_at.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Numele campaniei' },
        business_line: { type: 'string', enum: ['agency', 'fudly', 'climaticpro'], description: 'Linia de business' },
        channel: { type: 'string', enum: ['sms', 'email', 'linkedin', 'facebook', 'instagram', 'tiktok'], description: 'Canal de comunicare' },
        template_id: { type: 'string', description: 'ID-ul template-ului de mesaj' },
        segment_id: { type: 'string', description: 'ID-ul segmentului de audiență (opțional)' },
        scheduled_at: { type: 'string', description: 'Data programare (YYYY-MM-DDTHH:MM:SS). Dacă e setat, campania e scheduled automat.' },
      },
      required: ['name', 'business_line', 'channel', 'template_id'],
    },
  },
  {
    name: 'update_campaign_status',
    description: 'Schimbă statusul unei campanii marketing (pause, resume, complete).',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID-ul campaniei' },
        new_status: { type: 'string', enum: ['draft', 'scheduled', 'running', 'paused', 'completed'], description: 'Noul status' },
      },
      required: ['campaign_id', 'new_status'],
    },
  },
  {
    name: 'delete_campaign',
    description: 'Șterge o campanie marketing. Funcționează doar dacă campania nu are mesaje trimise.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID-ul campaniei' },
      },
      required: ['campaign_id'],
    },
  },
  // ── External integration tools (Phase 3) ──
  ...externalToolDefinitions,
]

// ────────────────────────────────────────────
// Tool Executors (all async — Prisma queries)
// ────────────────────────────────────────────

type ToolArgs = Record<string, unknown>

export async function executeTool(name: string, args: ToolArgs, conversationId?: string): Promise<string> {
  try {
    // ── Try external tools first (Google Ads, PostHog, GSC) ──
    const externalResult = await executeExternalTool(name, args)
    if (externalResult !== null) return externalResult

    // ── Internal tools ──
    switch (name) {
      case 'get_dashboard_stats':
        return JSON.stringify(await queryDashboardStats(args.business_line as string))
      case 'get_clients':
        return JSON.stringify(await queryClients(args.business_line as string, args.status as string))
      case 'get_leads':
        return JSON.stringify(await queryLeads(args.business_line as string, args.min_probability as number))
      case 'get_projects':
        return JSON.stringify(await queryProjects(args.status as string))
      case 'get_offers':
        return JSON.stringify(await queryOffers(args.status as string))
      case 'get_invoices':
        return JSON.stringify(await queryInvoices(args.status as string))
      case 'get_revenue_history':
        return JSON.stringify(await queryRevenueHistory())
      case 'get_marketing_stats':
        return JSON.stringify(await queryMarketingStats(args.business_line as string))
      case 'search_entity':
        return JSON.stringify(await searchEntity(args.query as string, args.entity_type as string))
      case 'navigate_to':
        return JSON.stringify({
          __action: 'navigate',
          path: args.path as string,
          reason: args.reason as string || 'Navigare solicitată',
        })
      case 'update_lead_status': {
        // Phase 3: approval-based — propose action, don't execute directly
        if (conversationId) {
          const proposal = await proposeAction(
            conversationId,
            'update_lead_status',
            { leadId: args.lead_id, newStatus: args.new_status },
            `Schimbare status lead de la valoarea curentă la "${args.new_status}"`
          )
          return JSON.stringify({
            __action: 'propose',
            actionId: proposal.id,
            actionType: 'update_lead_status',
            payload: proposal.payload,
            reasoning: proposal.reasoning,
            message: `Acțiune propusă: schimbare status lead la "${args.new_status}". Așteaptă confirmarea utilizatorului.`,
          })
        }
        // Fallback: no conversationId, execute directly (backward compat)
        const { updateLeadStatus } = await import('./db-queries')
        return JSON.stringify(await updateLeadStatus(args.lead_id as string, args.new_status as string))
      }
      case 'generate_summary_report':
        return JSON.stringify(await generateSummaryReport(args.scope as string))

      // ── Phase 4: CRUD tools (all approval-based) ──
      case 'create_client':
      case 'update_client':
      case 'delete_client':
      case 'create_lead':
      case 'update_lead':
      case 'delete_lead':
      case 'create_project':
      case 'update_project':
      case 'create_invoice':
      case 'update_invoice_status':
      case 'create_offer':
      case 'update_offer_status':
      case 'create_campaign':
      case 'update_campaign_status':
      case 'delete_campaign': {
        if (!conversationId) {
          return JSON.stringify({ error: 'Acțiunile de scriere necesită o conversație activă.' })
        }
        // Build human-readable description
        const descriptions: Record<string, string> = {
          create_client: `Creare client: ${args.companyName} (${args.business_line})`,
          update_client: `Actualizare client [${args.client_id}]: ${args.field} → "${args.value}"`,
          delete_client: `Dezactivare client [${args.client_id}]`,
          create_lead: `Creare lead: ${args.companyName} — ${args.source || 'manual'} (${args.business_line})`,
          update_lead: `Actualizare lead [${args.lead_id}]: ${args.field} → "${args.value}"`,
          delete_lead: `Ștergere lead [${args.lead_id}]`,
          create_project: `Creare proiect: "${args.name}" pentru client [${args.client_id}]`,
          update_project: `Actualizare proiect [${args.project_id}]: ${args.field} → "${args.value}"`,
          create_invoice: `Creare factură: ${args.amount} ${args.currency || 'EUR'} pentru client [${args.client_id}]`,
          update_invoice_status: `Schimbare status factură [${args.invoice_id}] → "${args.new_status}"`,
          create_offer: `Creare ofertă: ${args.value} ${args.currency || 'EUR'} — ${args.service_name}`,
          update_offer_status: `Schimbare status ofertă [${args.offer_id}] → "${args.new_status}"`,
          create_campaign: `Creare campanie: "${args.name}" pe ${args.channel}`,
          update_campaign_status: `Schimbare status campanie [${args.campaign_id}] → "${args.new_status}"`,
          delete_campaign: `Ștergere campanie [${args.campaign_id}]`,
        }
        const proposal = await proposeAction(
          conversationId,
          name,
          args,
          descriptions[name] || name
        )
        return JSON.stringify({
          __action: 'propose',
          actionId: proposal.id,
          actionType: name,
          payload: proposal.payload,
          reasoning: proposal.reasoning,
          message: `Acțiune propusă: ${descriptions[name]}. Așteaptă confirmarea utilizatorului.`,
        })
      }

      default:
        return JSON.stringify({ error: `Tool "${name}" nu este disponibil.` })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eroare necunoscută'
    console.error(`[Copilot Tool] Error executing ${name}:`, msg)
    return JSON.stringify({ error: `Eroare la executarea tool-ului "${name}": ${msg}` })
  }
}
