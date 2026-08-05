import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { sendWhatsAppAlert } from '@/lib/integrations/openwa'

// Endpoint to receive Webhooks from OpenWA
export async function POST(req: Request) {
  try {
    // Basic webhook secret verification
    const secret = process.env.OPENWA_WEBHOOK_SECRET;
    const authHeader = req.headers.get('authorization') || req.headers.get('x-webhook-secret');
    
    if (secret && authHeader !== secret && authHeader !== `Bearer ${secret}`) {
      console.warn('[WhatsApp Webhook] Unauthorized attempt (secret mismatch), but proceeding for debug. Header:', authHeader);
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    // Verify event type (we only care about incoming messages)
    if (payload.event !== 'message.received' || !payload.data) {
      return NextResponse.json({ status: 'ignored', reason: 'not a message.received event' });
    }

    const message = payload.data.message;
    if (!message || message.fromMe) {
      return NextResponse.json({ status: 'ignored', reason: 'message from self' });
    }

    // Extract details
    const senderPhone = message.from; // Usually in format 407XXXXXXXX@c.us
    const messageText = message.body || '';
    
    // Ignore group messages or non-text messages if needed
    if (senderPhone.includes('@g.us') || !messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'group message or empty' });
    }

    // 1. Detect Domain from Message Text
    let domain = "WhatsApp"; // Default source

    // Extract domain (e.g., inchideriterase.ro) from text using a regex
    const domainMatch = messageText.match(/([a-zA-Z0-9-]+\.(ro|com|net|org|eu))/i);
    if (domainMatch && domainMatch[1]) {
      domain = domainMatch[1].toLowerCase();
    }

    // Always use the default Business Line (e.g. asns.ro or the first one)
    let businessLine = await db.businessLine.findFirst({ where: { domain: "asns.ro" } });
    if (!businessLine) {
      businessLine = await db.businessLine.findFirst(); // Absolute fallback
    }

    if (!businessLine) {
      console.error(`[WhatsApp Webhook] No business line found at all!`);
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // 2. Determine the sales agent phone number
    let agentPhone = process.env.SALES_AGENT_PHONE_NUMBER || '';
    
    // Check if there is specific routing in SALES_AGENT_ROUTING
    // Example format: {"inchideriterase.ro": "4071111111", "alt-domeniu.ro": "4072222222"}
    try {
      if (process.env.SALES_AGENT_ROUTING) {
        const routingMap = JSON.parse(process.env.SALES_AGENT_ROUTING);
        if (routingMap[domain]) {
          agentPhone = routingMap[domain];
        }
      }
    } catch (e) {
      console.error("[WhatsApp Webhook] Error parsing SALES_AGENT_ROUTING:", e);
    }

    if (!agentPhone) {
      console.error(`[WhatsApp Webhook] No agent phone configured for domain ${domain}.`);
    }

    // 1. Create a Lead in the CRM
    const newLead = await db.lead.create({
      data: {
        businessLineId: businessLine.id,
        entityType: 'pf',
        companyName: 'WhatsApp User',
        contactPerson: message._data?.notifyName || 'WhatsApp User',
        email: 'whatsapp@whatsapp.com',
        phone: senderPhone.replace('@c.us', ''),
        source: 'WhatsApp',
        sourcePage: 'OpenWA Webhook',
        sourceDomain: domain,
        status: 'nou',
        notes: `Mesaj original WhatsApp:\n${messageText}`,
      }
    });

    // 2. Send Alert to Sales Agent(s)
    if (agentPhone) {
      const phones = agentPhone.split(',').map(p => p.trim());
      for (const phone of phones) {
        if (phone) {
          await sendWhatsAppAlert(phone, senderPhone, messageText);
        }
      }
    }

    return NextResponse.json({ status: 'success', leadId: newLead.id });

  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
