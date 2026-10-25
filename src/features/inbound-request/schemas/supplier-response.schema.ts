import { z } from 'zod'
import { operationalToday } from '@/lib/operational-date-time'
import { SUPPLIER_RESPONSE_DECISION } from '../types/inbound-request.types'

export const supplierResponseDecisionLabels: Record<
  (typeof SUPPLIER_RESPONSE_DECISION)[keyof typeof SUPPLIER_RESPONSE_DECISION],
  string
> = {
  Confirmed: 'Xác nhận đơn hàng',
  ProposedNewDate: 'Đề xuất ngày giao khác',
  Rejected: 'Từ chối đơn hàng',
}

export const supplierResponseSchema = z
  .object({
    decision: z.enum([
      SUPPLIER_RESPONSE_DECISION.Confirmed,
      SUPPLIER_RESPONSE_DECISION.ProposedNewDate,
      SUPPLIER_RESPONSE_DECISION.Rejected,
    ]),
    note: z.string().trim().max(500, 'Ghi chú không được vượt quá 500 ký tự.'),
    // yyyy-MM-dd from DatePickerField.
    proposedDate: z.string(),
  })
  .superRefine((values, context) => {
    if (values.decision === SUPPLIER_RESPONSE_DECISION.Rejected && !values.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Vui lòng nhập lý do từ chối.',
      })
    }
    if (values.decision !== SUPPLIER_RESPONSE_DECISION.ProposedNewDate) return
    if (!values.proposedDate) {
      context.addIssue({
        code: 'custom',
        path: ['proposedDate'],
        message: 'Vui lòng chọn ngày giao đề xuất.',
      })
    } else if (values.proposedDate < operationalToday()) {
      context.addIssue({
        code: 'custom',
        path: ['proposedDate'],
        message: 'Ngày giao đề xuất không được ở trong quá khứ.',
      })
    }
  })

export type SupplierResponseFormValues = z.infer<typeof supplierResponseSchema>
