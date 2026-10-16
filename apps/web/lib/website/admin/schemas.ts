import { z } from 'zod'
import { FIELD_TYPES } from './entry-data'

const keyRe = /^[a-z0-9_-]{2,60}$/
const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null))
const url = z.string().trim().max(500).url().refine((u) => /^https?:\/\//i.test(u), 'Doar http(s)').nullish().transform((v) => (v ? v : null))

export const fieldSchema = z.object({
  key: z.string().trim(), label: z.string().trim().min(1).max(60), type: z.enum(FIELD_TYPES as [string, ...string[]]),
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(), required: z.boolean().optional(), filterable: z.boolean().optional(),
})

export const collectionCreate = z.object({
  key: z.string().trim().regex(keyRe, 'Cheie invalidă (litere mici, cifre, - și _)'),
  name: z.string().trim().min(1).max(60), namePlural: z.string().trim().min(1).max(60),
  kind: z.enum(['listing', 'article', 'project', 'other']).default('listing'),
  fields: z.array(fieldSchema).max(60).default([]), sortOrder: z.number().int().min(0).max(10_000).default(0),
})
export const collectionPatch = collectionCreate.omit({ key: true }).partial().extend({ isActive: z.boolean().optional() })

export const channelPatch = z.object({ siteUrl: url, isEnabled: z.boolean().optional() }).partial()

const entryFields = {
  title: z.string().trim().min(2).max(160), slug: z.string().trim().regex(keyRe, 'Slug invalid').optional(),
  summary: optText(500), body: optText(50_000),
  status: z.enum(['draft', 'published', 'suspended']), verified: z.boolean(), featured: z.boolean(),
  city: optText(80), county: optText(80), address: optText(200),
  lat: z.number().min(-90).max(90).nullish(), lng: z.number().min(-180).max(180).nullish(),
  email: z.string().trim().email().max(200).nullish().transform((v) => (v ? v : null)),
  phone: optText(40), websiteUrl: url, coverUrl: url,
  seoTitle: optText(160), seoDescription: optText(320), data: z.record(z.string(), z.unknown()),
}
export const entryCreate = z.object({ collectionId: z.string().min(1), ...entryFields, status: entryFields.status.default('draft'), verified: entryFields.verified.default(false), featured: entryFields.featured.default(false), data: entryFields.data.default({}) })
export const entryPatch = z.object(entryFields).partial()

export const reviewPatch = z.object({ status: z.enum(['approved', 'rejected', 'pending']) })
