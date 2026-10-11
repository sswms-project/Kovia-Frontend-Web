import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import {
  TRANSFER_DISCREPANCY_ACTIONS,
  TRANSFER_ESCALATION_ACTIONS,
  TRANSFER_PICK_REASONS,
} from '../types/transfer.types'
import { hasAtMostTwoDecimals } from '../utils/transfer-scan'

const note500 = z.string().trim().max(500, 'Ghi chú không được vượt quá 500 ký tự.')

export const transferPickSwitchSchema = z
  .object({
    toInventoryStockId: dotNetGuidSchema('Hãy chọn vị trí hoặc lô thay thế.'),
    quantity: z.number('Số lượng phải là số.').positive('Số lượng chuyển phải lớn hơn 0.'),
    reasonCode: z.enum(TRANSFER_PICK_REASONS, 'Hãy chọn lý do đổi vị trí.'),
    note: note500,
  })
  .superRefine((values, context) => {
    if (values.reasonCode === 'Other' && !values.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Hãy ghi chú rõ lý do khi chọn lý do khác.',
      })
    }
    if (!hasAtMostTwoDecimals(values.quantity)) {
      context.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Số lượng chỉ có tối đa 2 chữ số thập phân.',
      })
    }
  })

export const transferPickEscalateSchema = z.object({
  reasonCode: z.enum(TRANSFER_PICK_REASONS, 'Hãy chọn lý do báo quản lý.'),
  note: z
    .string()
    .trim()
    .min(1, 'Hãy mô tả vấn đề để quản lý xử lý.')
    .max(500, 'Ghi chú không được vượt quá 500 ký tự.'),
})

export const transferEscalationResolutionSchema = z
  .object({
    action: z.enum(TRANSFER_ESCALATION_ACTIONS, 'Hãy chọn cách xử lý.'),
    toInventoryStockId: z.string(),
    quantity: z.number('Số lượng phải là số.').positive('Số lượng phải lớn hơn 0.'),
    note: note500,
  })
  .superRefine((values, context) => {
    if (
      values.action === 'UseStock' &&
      !dotNetGuidSchema('').safeParse(values.toInventoryStockId).success
    ) {
      context.addIssue({
        code: 'custom',
        path: ['toInventoryStockId'],
        message: 'Hãy chọn vị trí hoặc lô thay thế.',
      })
    }
  })

export const transferPickReturnSchema = z.object({
  pickDetailId: dotNetGuidSchema('Lần lấy hàng cần trả không hợp lệ.'),
  quantity: z.number('Số lượng phải là số.').positive('Số lượng trả phải lớn hơn 0.'),
  scannedSlotCode: z.string().trim().min(1, 'Hãy quét mã vị trí để trả hàng.').max(100),
})

export const transferReceiptEntrySchema = z.object({
  lineId: dotNetGuidSchema('Dòng hàng không hợp lệ.'),
  lotId: z.string().nullable(),
  productLabel: z.string(),
  destinationSlotId: z.string(),
  scannedSlotCode: z.string().trim().max(100, 'Mã vị trí không được vượt quá 100 ký tự.'),
  scannedProductCode: z.string().trim().max(100, 'Mã hàng không được vượt quá 100 ký tự.'),
  goodQuantity: z.number('Số lượng phải là số.').min(0, 'Số lượng nhận tốt không được âm.'),
  damagedQuantity: z.number('Số lượng phải là số.').min(0, 'Số lượng hỏng không được âm.'),
  missingQuantity: z.number('Số lượng phải là số.').min(0, 'Số lượng thiếu không được âm.'),
  reasonCode: z.string().max(50, 'Nguyên nhân không được vượt quá 50 ký tự.'),
  note: note500,
})

export type TransferReceiptEntryValues = z.infer<typeof transferReceiptEntrySchema>

export function receiptEntryKey(lineId: string, lotId: string | null) {
  return `${lineId}|${lotId ?? ''}`
}

/** `expected` là số lượng đã xuất của từng dòng/lô; tổng tốt + hỏng + thiếu phải bằng đúng số đó. */
export function createTransferReceiptSchema(expected: ReadonlyMap<string, number>) {
  return z
    .object({
      entries: z.array(transferReceiptEntrySchema).min(1, 'Hãy khai báo kết quả nhận hàng.'),
    })
    .superRefine((values, context) => {
      const declared = new Map<string, number>()
      values.entries.forEach((entry, index) => {
        const key = receiptEntryKey(entry.lineId, entry.lotId)
        declared.set(
          key,
          (declared.get(key) ?? 0) +
            entry.goodQuantity +
            entry.damagedQuantity +
            entry.missingQuantity
        )
        const hasProblem = entry.damagedQuantity > 0 || entry.missingQuantity > 0
        const needsSlot = entry.goodQuantity > 0 || entry.damagedQuantity > 0
        if (hasProblem && !entry.reasonCode) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'reasonCode'],
            message: 'Hàng hỏng hoặc thiếu phải kèm nguyên nhân.',
          })
        }
        if (needsSlot && !dotNetGuidSchema('').safeParse(entry.destinationSlotId).success) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'scannedSlotCode'],
            message: 'Hãy quét hoặc nhập mã vị trí cất hàng hợp lệ tại kho nhập.',
          })
        }
        for (const field of ['goodQuantity', 'damagedQuantity', 'missingQuantity'] as const) {
          if (!hasAtMostTwoDecimals(entry[field])) {
            context.addIssue({
              code: 'custom',
              path: ['entries', index, field],
              message: 'Số lượng chỉ có tối đa 2 chữ số thập phân.',
            })
          }
        }
      })
      expected.forEach((quantity, key) => {
        if (Math.abs((declared.get(key) ?? 0) - quantity) > 1e-9) {
          const index = values.entries.findIndex(
            (entry) => receiptEntryKey(entry.lineId, entry.lotId) === key
          )
          context.addIssue({
            code: 'custom',
            path: ['entries', Math.max(0, index), 'goodQuantity'],
            message: `Tổng nhận tốt, hỏng và thiếu phải bằng số lượng đã xuất (${quantity}).`,
          })
        }
      })
    })
}

export const transferDiscrepancySchema = z
  .object({
    action: z.enum(TRANSFER_DISCREPANCY_ACTIONS, 'Hãy chọn cách xử lý.'),
    quantity: z.number('Số lượng phải là số.').positive('Số lượng xử lý phải lớn hơn 0.'),
    lotId: z.string(),
    destinationSlotId: z.string(),
    scannedSlotCode: z.string().trim().max(100),
    note: note500,
  })
  .superRefine((values, context) => {
    if (values.action === 'LateReceipt') {
      // Mã vị trí được tra ra ID khi gửi; lúc này chỉ cần người dùng đã quét hoặc nhập mã.
      if (!values.scannedSlotCode) {
        context.addIssue({
          code: 'custom',
          path: ['scannedSlotCode'],
          message: 'Hãy quét hoặc nhập mã vị trí nhận hàng bổ sung.',
        })
      }
    } else if (!values.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Hãy ghi rõ lý do và bằng chứng xử lý.',
      })
    }
    if (!hasAtMostTwoDecimals(values.quantity)) {
      context.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Số lượng chỉ có tối đa 2 chữ số thập phân.',
      })
    }
  })

export type TransferPickSwitchFormValues = z.infer<typeof transferPickSwitchSchema>
export type TransferPickEscalateFormValues = z.infer<typeof transferPickEscalateSchema>
export type TransferEscalationResolutionFormValues = z.infer<
  typeof transferEscalationResolutionSchema
>
export type TransferPickReturnFormValues = z.infer<typeof transferPickReturnSchema>
export type TransferReceiptFormValues = {
  entries: TransferReceiptEntryValues[]
}
export type TransferDiscrepancyFormValues = z.infer<typeof transferDiscrepancySchema>
