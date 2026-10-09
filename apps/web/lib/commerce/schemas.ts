import { z } from 'zod'

export const RuleBody = z.object({
  businessLineId: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  priority: z.number().int().min(0).max(10000).default(100),
  categoryId: z.string().max(40).nullable().default(null),
  brand: z.string().trim().max(60).nullable().default(null),
  quality: z.enum(['OE', 'A', 'B', 'aftermarket']).nullable().default(null),
  costMin: z.number().min(0).max(1e7).nullable().default(null),
  costMax: z.number().min(0).max(1e7).nullable().default(null),
  markupPct: z.number().min(0).max(1000),
  minMarginRon: z.number().min(0).max(1e6).nullable().default(null),
  bulkySurchargeRon: z.number().min(0).max(1e5).default(0),
  competitorUndercutRon: z.number().min(0).max(1e5).nullable().default(null),
  isActive: z.boolean().default(true),
})

export const RulePatch = z.object({
  name: z.string().trim().min(1).max(120),
  priority: z.number().int().min(0).max(10000),
  categoryId: z.string().max(40).nullable(),
  brand: z.string().trim().max(60).nullable(),
  quality: z.enum(['OE', 'A', 'B', 'aftermarket']).nullable(),
  costMin: z.number().min(0).max(1e7).nullable(),
  costMax: z.number().min(0).max(1e7).nullable(),
  markupPct: z.number().min(0).max(1000),
  minMarginRon: z.number().min(0).max(1e6).nullable(),
  bulkySurchargeRon: z.number().min(0).max(1e5),
  competitorUndercutRon: z.number().min(0).max(1e5).nullable(),
  isActive: z.boolean(),
}).partial()

export const ChannelPatch = z.object({
  isEnabled: z.boolean(),
  storefrontUrl: z.string().trim().url().max(200).refine((u) => /^https?:\/\//i.test(u), 'URL invalid').nullable(),
  vatRate: z.number().min(0).max(50),
  transportPct: z.number().min(0).max(200),
  defaultMarkupPct: z.number().min(0).max(1000),
  minMarginRon: z.number().min(0).max(1e5),
  roundingMode: z.enum(['99', '90', 'integer', 'none']),
}).partial().strict()
