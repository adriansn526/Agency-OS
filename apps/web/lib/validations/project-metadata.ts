import * as z from "zod"

export const lighthouseSchema = z.object({
  performance: z.number().min(0).max(100).optional(),
  accessibility: z.number().min(0).max(100).optional(),
  bestPractices: z.number().min(0).max(100).optional(),
  seo: z.number().min(0).max(100).optional(),
  updatedAt: z.string().optional() // ISO date string
})

export const webDevMetadataSchema = z.object({
  stagingUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  productionUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  adminUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  figmaUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  githubUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  driveUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  lighthouse: lighthouseSchema.optional(),
  pipelineStage: z.enum(['discovery', 'design', 'frontend', 'backend', 'qa', 'launch']).optional(),
  
  // Existing generic fields that we should preserve
  tasks: z.array(z.any()).optional(),
  timeEntries: z.array(z.any()).optional(),
  checklist: z.array(z.any()).optional(),
  phases: z.array(z.any()).optional(),
  kpis: z.array(z.any()).optional()
}).catchall(z.any()) // Allow other metadata to exist without failing validation
