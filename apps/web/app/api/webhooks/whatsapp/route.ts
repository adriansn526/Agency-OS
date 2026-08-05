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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    // Expected text: "Buna, sunt interesat de serviciile de pe inchideriterase.ro ..."
    const businessLines = await db.businessLine.findMany();
    let businessLine = null;
    let domain = "inchideriterase.ro"; // Default fallback

    const lowerMessage = messageText.toLowerCase();

    for (const bl of businessLines) {
      if (!bl.domain) continue;
      const domainKeyword = bl.domain.split('.')[0]; // e.g. "inchideriterase"
      if (lowerMessage.includes(domainKeyword) || lowerMessage.includes(bl.domain)) {
        businessLine = bl;
        domain = bl.domain;
        break;
      }
    }

    if (!businessLine) {
      // Fallback: try to find the default one
      businessLine = await db.businessLine.findFirst({ where: { domain: "inchideriterase.ro" } });
    }

    if (!businessLine) {
      console.error(`[WhatsApp Webhook] Business line not found for domain: ${domain}`);
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
        entityType: 'pf', // default to Persoana Fizica
        entityName: message._data?.notifyName || 'WhatsApp User',
        contactName: message._data?.notifyName || '',
        phone: senderPhone.replace('@c.us', ''),
        source: 'WhatsApp',
        sourcePage: 'OpenWA Webhook',
        sourceDomain: domain,
        status: 'nou',
        notes: `Mesaj original WhatsApp:\n${messageText}`,
      }
    });

    // 2. Send Alert to Sales Agent
    if (agentPhone) {
      await sendWhatsAppAlert(agentPhone, senderPhone, messageText);
    }

    return NextResponse.json({ status: 'success', leadId: newLead.id });

  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
