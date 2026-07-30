import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  try {
    const { lead_id, new_status, notes } = await request.json();

    if (!lead_id || !new_status) {
      return NextResponse.json({ error: 'Missing lead_id or new_status' }, { status: 400 });
    }

    const lead = await db.lead.findUnique({ where: { id: lead_id } });
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const oldStatus = lead.status;

    // Update the lead status
    const updatedLead = await db.lead.update({
      where: { id: lead_id },
      data: {
        status: new_status,
        notes: notes ? `${lead.notes || ''}\n[AI Voice Note]: ${notes}`.trim() : lead.notes
      }
    });

    // Log the activity
    await db.activity.create({
      data: {
        action: 'status_changed',
        entityType: 'lead',
        entityId: lead.id,
        entityName: lead.companyName,
        leadId: lead.id,
        businessLineId: lead.businessLineId,
        details: { oldStatus, newStatus: new_status, source: 'ai_voice_agent' }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Lead status successfully updated from ${oldStatus} to ${new_status}.` 
    });
  } catch (error) {
    console.error('[API] ElevenLabs Tool error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
