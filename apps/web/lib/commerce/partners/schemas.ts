import { z } from 'zod'

export const STATUSES = ['prospect', 'contacted', 'negotiating', 'active', 'inactive', 'declined'] as const
export const SERVICES = ['mount', 'paint', 'paint_mount'] as const
export const BULKY = ['small', 'standard', 'large', 'xlarge'] as const

const text = (max: number) => z.string().trim().max(max).transform((v) => v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim())
const optText = (max: number) => text(max).nullable().optional().transform((v) => (v ? v : null))

const url = z.string().trim().max(300).refine((v) => /^https?:\/\/[^\s]+$/i.test(v), 'URL invalid (http/https)')
const email = z.string().trim().max(200).email()
export const phoneRo = z.string().trim().max(40).transform((v) => v.replace(/[^\d+]/g, '')).refine((v) => /^\+?\d{7,15}$/.test(v), 'Telefon invalid')

export const PartnerFields = z.object({
  name: text(200).refine((v) => v.length > 0, 'Numele este obligatoriu'),
  status: z.enum(STATUSES).default('prospect'),
  address: optText(300),
  city: optText(100),
  county: optText(100),
  lat: z.number().min(-90).max(90).nullable().optional().transform((v) => v ?? null),
  lng: z.number().min(-180).max(180).nullable().optional().transform((v) => v ?? null),
  phone: phoneRo.nullable().optional().transform((v) => v ?? null),
  email: email.nullable().optional().transform((v) => v ?? null),
  website: url.nullable().optional().transform((v) => v ?? null),
  contactPerson: optText(120),
  services: z.array(z.enum(SERVICES)).max(3).default([]),
  googlePlaceId: z.string().trim().max(200).nullable().optional().transform((v) => v || null),
  googleMapsUrl: url.nullable().optional().transform((v) => v ?? null),
  rating: z.number().min(0).max(5).nullable().optional().transform((v) => v ?? null),
  ratingCount: z.number().int().min(0).max(1e7).nullable().optional().transform((v) => v ?? null),
  source: z.enum(['manual', 'csv', 'google_maps']).default('manual'),
  notes: optText(2000),
})
export const PartnerBody = PartnerFields
export const PartnerPatch = PartnerFields.partial().refine((v) => Object.keys(v).length > 0, 'Nimic de modificat')

export const RateRow = z.object({
  service: z.enum(SERVICES),
  bulkyClass: z.enum(BULKY).nullable().default(null),
  settlementRon: z.number().min(0).max(1e6),
  salePriceRon: z.number().min(0).max(1e6).nullable().default(null),
  leadTimeDays: z.number().int().min(0).max(365).nullable().default(null),
  isActive: z.boolean().default(true),
})
export const RatesBody = z.object({ rates: z.array(RateRow).max(40) })
