import { z } from 'zod'

export const reviewInventoryAnomalySchema = z
  .object({
    decision: z.enum(['Confirmed', 'Dismissed']),
    note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự.'),
  })
  .superRefine((values, context) => {
    if (values.decision === 'Confirmed' && !values.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Vui lòng ghi chú khi xác nhận bất thường.',
      })
    }
  })

export type ReviewInventoryAnomalyFormValues = z.infer<typeof reviewInventoryAnomalySchema>
