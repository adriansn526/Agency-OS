import * as z from "zod"

export const lighthouseSchema = z.object({
  performance: z.number().min(0).max(100).optional(),
  accessibility: z.number().min(0).max(100).optional(),
  bestPractices: z.number().min(0).max(100).optional(),
  seo: z.number().min(0).max(100).optional(),
  updatedAt: z.string().optional() // ISO date string
})

// TODO: Migrate to Integration Registry
// TODO: Restrict API metadata payload based on fieldsVisibility
export const webDevMetadataSchema = z.object({
  stagingUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  productionUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  adminUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  figmaUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  githubUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  driveUrl: z.string().url("Trebuie să fie un URL valid").optional().or(z.literal("")),
  lighthouse: lighthouseSchema.optional(),
  pipelineStage: z.enum(['discovery', 'design', 'frontend', 'backend', 'qa', 'launch']).optional(),
  pipelineDetails: z.record(z.string(), z.object({
    assignee: z.string().optional(),
    dueDate: z.string().optional()
  })).optional(),
  
  // Phase 2 Fields
  domainExpiryDate: z.string().optional(),
  sslExpiryDate: z.string().optional(),
  dnsProvider: z.string().optional(),
  internalNotes: z.string().optional(),
  stack: z.array(z.string()).optional(),
  changelog: z.array(z.object({
    date: z.string(),
    message: z.string()
  })).optional(),
  
  // Existing generic fields that we should preserve
  tasks: z.array(z.any()).optional(),
  timeEntries: z.array(z.any()).optional(),
  checklist: z.array(z.object({
    item: z.string(),
    done: z.boolean().optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional()
  }).catchall(z.any())).optional(),
  phases: z.array(z.any()).optional(),
  kpis: z.array(z.any()).optional()
}).catchall(z.any()) // Allow other metadata to exist without failing validation
