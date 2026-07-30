import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // ElevenLabs webhook sends conversation details
    const conversationId = payload.conversation_id || payload.id;
    
    if (!conversationId) {
      return NextResponse.json({ error: 'No conversation ID' }, { status: 400 });
    }

    // Găsim activitatea inițială bazată pe conversationId
    const activity = await db.activity.findFirst({
      where: {
        action: 'ai_call_initiated',
        details: {
          path: ['conversationId'],
          equals: conversationId
        }
      },
      orderBy: { createdAt: 'desc' },
      include: { lead: true }
    });

    if (!activity || !activity.leadId) {
      console.warn('[ElevenLabs Webhook] Nu s-a găsit activitatea asociată pentru conversația:', conversationId);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const leadId = activity.leadId;

    // Preluăm transcriptul complet din ElevenLabs API dacă nu e prezent detaliat în payload
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    let transcriptText = 'Transcript indisponibil.';
    let callDuration = payload.duration || 0;

    if (elevenLabsApiKey) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
          headers: {
            'xi-api-key': elevenLabsApiKey
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transcript && Array.isArray(data.transcript)) {
            transcriptText = data.transcript.map((msg: any) => `**${msg.role === 'agent' ? 'AI' : 'Client'}:** ${msg.content}`).join('\n\n');
          }
          if (data.metadata?.call_duration_secs) {
            callDuration = data.metadata.call_duration_secs;
          }
        }
      } catch (err) {
        console.error('[ElevenLabs Webhook] Eroare fetch transcript:', err);
      }
    }

    // Creăm o comunicare nouă de tip "ai_voice"
    await db.communication.create({
      data: {
        channel: 'ai_voice',
        direction: 'outbound',
        subject: `Apel AI Outbound (${Math.round(callDuration)} secunde)`,
        body: transcriptText,
        businessLineId: activity.businessLineId,
        metadata: {
          conversationId,
          rawPayload: payload,
          leadId: leadId // Salvez leadId aici pentru referință
        }
      }
    });

    // Actualizăm sau adăugăm o activitate de succes
    await db.activity.create({
      data: {
        action: 'ai_call_completed',
        entityType: 'lead',
        entityId: leadId,
        entityName: activity.entityName,
        leadId: leadId,
        businessLineId: activity.businessLineId,
        details: { duration: callDuration, conversationId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] ElevenLabs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
