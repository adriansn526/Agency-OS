// ─── AI Copilot — Action Approval System (Phase 3) ───
// Lightweight inline approval for write operations.
// Actions are proposed → user approves/rejects → executed if approved.

import { db } from '@repo/db'
import {
  updateLeadStatus,
  createClient, updateClient, deleteClient,
  createLead, updateLead, deleteLead,
  createProject, updateProject,
  createInvoice, updateInvoiceStatus,
  createOffer, updateOfferStatus,
  createCampaign, updateCampaignStatus, deleteCampaign,
} from './db-queries'

interface ActionPayload {
  [key: string]: unknown
}

/**
 * Propose a new action (saved as pending in DB)
 */
export async function proposeAction(
  conversationId: string,
  actionType: string,
  payload: ActionPayload,
  reasoning: string
): Promise<{ id: string; actionType: string; payload: ActionPayload; reasoning: string }> {
  const action = await db.copilotAction.create({
    data: {
      conversationId,
      actionType,
      status: 'pending',
      payload: payload as any,
      reasoning,
    },
  })

  return {
    id: action.id,
    actionType: action.actionType,
    payload: action.payload as ActionPayload,
    reasoning: action.reasoning || '',
  }
}

/**
 * Approve and execute a pending action
 */
export async function approveAction(actionId: string): Promise<{ success: boolean; result: unknown; error?: string }> {
  const action = await db.copilotAction.findUnique({
    where: { id: actionId },
  })

  if (!action) {
    return { success: false, result: null, error: 'Acțiunea nu a fost găsită.' }
  }

  if (action.status !== 'pending') {
    return { success: false, result: null, error: `Acțiunea a fost deja ${action.status}.` }
  }

  try {
    const payload = action.payload as ActionPayload
    let result: unknown = null

    // Execute based on action type
    switch (action.actionType) {
      case 'update_lead_status': {
        result = await updateLeadStatus(payload.leadId as string, payload.newStatus as string)
        break
      }
      // Phase 4 CRUD
      case 'create_client':
        result = await createClient(payload as any)
        break
      case 'update_client':
        result = await updateClient(payload.client_id as string, payload.field as string, payload.value as string)
        break
      case 'delete_client':
        result = await deleteClient(payload.client_id as string)
        break
      case 'create_lead':
        result = await createLead(payload as any)
        break
      case 'update_lead':
        result = await updateLead(payload.lead_id as string, payload.field as string, payload.value as string | number)
        break
      case 'delete_lead':
        result = await deleteLead(payload.lead_id as string)
        break
      case 'create_project':
        result = await createProject(payload as any)
        break
      case 'update_project':
        result = await updateProject(payload.project_id as string, payload.field as string, payload.value as string | number)
        break
      case 'create_invoice':
        result = await createInvoice(payload as any)
        break
      case 'update_invoice_status':
        result = await updateInvoiceStatus(payload.invoice_id as string, payload.new_status as string)
        break
      case 'create_offer':
        result = await createOffer(payload as any)
        break
      case 'update_offer_status':
        result = await updateOfferStatus(payload.offer_id as string, payload.new_status as string)
        break
      case 'create_campaign':
        result = await createCampaign(payload as any)
        break
      case 'update_campaign_status':
        result = await updateCampaignStatus(payload.campaign_id as string, payload.new_status as string)
        break
      case 'delete_campaign':
        result = await deleteCampaign(payload.campaign_id as string)
        break
      default: {
        return { success: false, result: null, error: `Tip de acțiune necunoscut: ${action.actionType}` }
      }
    }

    // Update action status
    await db.copilotAction.update({
      where: { id: actionId },
      data: {
        status: 'executed',
        result: result as any,
        approvedAt: new Date(),
        executedAt: new Date(),
      },
    })

    return { success: true, result }
  } catch (err) {
    // Mark as failed
    await db.copilotAction.update({
      where: { id: actionId },
      data: {
        status: 'failed',
        result: { error: err instanceof Error ? err.message : 'Eroare' } as any,
      },
    })

    return { success: false, result: null, error: err instanceof Error ? err.message : 'Eroare la executare' }
  }
}

/**
 * Reject a pending action
 */
export async function rejectAction(actionId: string): Promise<void> {
  await db.copilotAction.update({
    where: { id: actionId },
    data: { status: 'rejected' },
  })
}

/**
 * Get pending actions for a conversation
 */
export async function getPendingActions(conversationId: string) {
  return db.copilotAction.findMany({
    where: { conversationId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
}
