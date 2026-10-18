/**
 * What a phone call changes on a lead (pure, no I/O): the call outcome, the consents given on the phone, the callback and the pipeline stage.
 *
 * Stage rules: forward only, never for firms already onboarding/active (they are customers), "Refuză" is the one that ends contact (stage "refuzat" + opt-out,
 * like declining on the preview page). A callback is stored as the lead's next action ("Apel: …") with its date, and a finished call clears the old one.
 */
export const OUTCOMES = ['nu_raspunde', 'interesat', 'revin', 'refuza', 'numar_gresit'] as const
export type Outcome = (typeof OUTCOMES)[number]

export const OUTCOME_LABEL: Record<Outcome, string> = { nu_raspunde: 'Nu răspunde', interesat: 'Interesat', revin: 'Revin mai târziu', refuza: 'Refuză', numar_gresit: 'Număr greșit' }
export const CALL_PREFIX = 'Apel'
const PROTECTED = new Set(['onboarding', 'activ'])

export interface CallInput { outcome: Outcome; notes?: string; consentSms?: 'da' | 'nu' | null; consentEmail?: 'da' | 'nu' | null; callbackAt?: Date | null; durationSec?: number | null }
export interface LeadState { status: string; optOut: boolean; customFields: unknown; nextAction: string | null; nextActionDate: Date | null }

export interface CallPlan {
  status?: string
  optOut?: boolean
  customFields: Record<string, string>
  nextAction: string | null
  nextActionDate: Date | null
  call: { subject: string; body: string; callResult: string; durationMin: number | null }
  statusChange: { from: string; to: string } | null
}

export class CallInputError extends Error {}

const day = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bucharest' }).format(d) // YYYY-MM-DD in Bucharest time

/** `pipeline`: the stage keys of the lead's entity type, in order. */
export function planCall(lead: LeadState, input: CallInput, pipeline: string[], now: Date): CallPlan {
  if (!OUTCOMES.includes(input.outcome)) throw new CallInputError('Rezultat de apel necunoscut')
  const cb = input.callbackAt ?? null
  if (cb && Number.isNaN(cb.getTime())) throw new CallInputError('Data de reapel nu e validă')
  if (cb && cb.getTime() < now.getTime() - 60_000) throw new CallInputError('Data de reapel trebuie să fie în viitor')
  if (input.outcome === 'revin' && !cb) throw new CallInputError('Alege când revii (data și ora)')
  if ((input.outcome === 'refuza' || input.outcome === 'numar_gresit') && cb) throw new CallInputError('Nu se programează reapel după acest rezultat')

  // the stage the outcome points to, applied only when it is ahead of the current one
  const target = { interesat: 'in_discutii', revin: 'contactat', refuza: 'refuzat', nu_raspunde: null, numar_gresit: null }[input.outcome]
  const cur = pipeline.indexOf(lead.status), to = target ? pipeline.indexOf(target) : -1
  const move = !!target && to >= 0 && !PROTECTED.has(lead.status) && lead.status !== 'refuzat' && (cur < 0 || to > cur)
  const status = move ? target! : undefined

  const cf: Record<string, string> = { rezultat_apel: OUTCOME_LABEL[input.outcome], data_apel: day(now) }
  if (input.consentSms) cf.acord_sms = input.consentSms
  if (input.consentEmail) cf.acord_email = input.consentEmail

  const wasCallback = (lead.nextAction ?? '').startsWith(CALL_PREFIX)
  const label = OUTCOME_LABEL[input.outcome]
  return {
    status, optOut: input.outcome === 'refuza' && !PROTECTED.has(lead.status) ? true : undefined, customFields: cf,
    nextAction: cb ? `${CALL_PREFIX}: ${input.outcome === 'nu_raspunde' ? 'reîncerc' : 'revin'}` : wasCallback ? null : lead.nextAction,
    nextActionDate: cb ?? (wasCallback ? null : lead.nextActionDate),
    call: { subject: `Apel: ${label}`, body: (input.notes ?? '').trim() || label, callResult: label, durationMin: input.durationSec && input.durationSec > 0 ? Math.max(1, Math.round(input.durationSec / 60)) : null },
    statusChange: status ? { from: lead.status, to: status } : null,
  }
}
