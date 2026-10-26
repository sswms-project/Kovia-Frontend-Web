import { z } from 'zod'

export const returnDocumentReasonSchema = z.object({
  reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự.'),
})
export type ReturnDocumentReasonValues = z.infer<typeof returnDocumentReasonSchema>
