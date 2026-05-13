import { db } from './index'
import type { Prisma } from '@prisma/client'

interface LogActivityInput {
  businessLineId?: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: Record<string, unknown>
  clientId?: string
  leadId?: string
  projectId?: string
  offerId?: string
  contractId?: string
}

export async function logActivity(input: LogActivityInput) {
  return db.activity.create({
    data: {
      businessLineId: input.businessLineId,
      userId: input.userId,
      userName: input.userName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      details: (input.details as Prisma.InputJsonValue) ?? undefined,
      clientId: input.clientId,
      leadId: input.leadId,
      projectId: input.projectId,
      offerId: input.offerId,
      contractId: input.contractId,
    }
  })
}
