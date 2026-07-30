import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  try {
    const { leadId, agentId, variables } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { businessLine: true }
    });

    if (!lead || !lead.phone) {
      return NextResponse.json({ error: 'Lead nu a fost găsit sau nu are număr de telefon asociat.' }, { status: 404 });
    }

    // Agent ID din frontend sau .env
    const elevenLabsAgentId = agentId || process.env.ELEVENLABS_DEFAULT_AGENT_ID;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsAgentId || !elevenLabsApiKey) {
      return NextResponse.json({ error: 'Configurarea ElevenLabs (API Key sau Agent ID) lipsește.' }, { status: 500 });
    }

    // Formatăm numărul de telefon conform cerințelor E.164 (dacă nu e deja)
    let phone = lead.phone.trim();
    if (phone.startsWith('07')) {
      phone = '+40' + phone.substring(1);
    }

    const dynamicVariables = {
      lead_name: lead.contactPerson,
      company_name: lead.companyName,
      ...variables
    };

    console.log('[ElevenLabs] Initiating outbound call to:', phone);

    // Apelăm ElevenLabs Outbound API (necesită integrare Twilio în contul ElevenLabs)
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        agent_id: elevenLabsAgentId,
        phone_number: phone,
        dynamic_variables: dynamicVariables
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ElevenLabs] Eroare apel outbound:', data);
      return NextResponse.json({ error: 'Nu s-a putut iniția apelul.', details: data }, { status: response.status });
    }

    // Creăm o activitate în baza de date cu status "în curs"
    await db.activity.create({
      data: {
        action: 'ai_call_initiated',
        entityType: 'lead',
        entityId: lead.id,
        entityName: lead.companyName,
        leadId: lead.id,
        businessLineId: lead.businessLineId,
        details: { conversationId: data.conversation_id, status: 'pending' },
      }
    });

    return NextResponse.json({ success: true, conversationId: data.conversation_id });
  } catch (error) {
    console.error('[API] POST /api/voice/outbound error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
