import { z } from 'zod'

export const legalDraftSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tiêu đề').max(200),
  content: z.string().max(60000),
  summary: z.string().max(1000),
})

export type LegalDraftValues = z.infer<typeof legalDraftSchema>
