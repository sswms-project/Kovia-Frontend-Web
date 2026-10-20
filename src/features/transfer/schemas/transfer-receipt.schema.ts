import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import type { TransferReceiptSheet } from '../types/transfer-receipt.types'
import { receiptEntryKey } from './transfer-fulfillment.schema'

const count = z
  .number('Số lượng phải là số.')
  .min(0, 'Số lượng không được âm.')
  .lt(1e18, 'Số lượng vượt giới hạn cho phép.')
export const transferCountEntrySchema = z.object({
  lineId: dotNetGuidSchema('Dòng hàng không hợp lệ.'),
  lotId: dotNetGuidSchema('Lô hàng không hợp lệ.').nullable(),
  goodQuantity: count,
  damagedQuantity: count,
  missingQuantity: count,
  reasonCode: z.string().trim().max(50, 'Nguyên nhân tối đa 50 ký tự.'),
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
})
export type TransferCountEntryValues = z.infer<typeof transferCountEntrySchema>
export type TransferCountFormValues = { entries: TransferCountEntryValues[] }

/** Text inputs keep wheel scrolling from changing quantities; reject non-decimal notation. */
export function parseTransferQuantityInput(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return Number.NaN
  const normalized = value.trim().replace(',', '.')
  return /^\d+(?:\.\d*)?$/.test(normalized) ? Number(normalized) : Number.NaN
}

export function hasTransferQuantityPrecision(quantity: number, precision: number) {
  const scale = 10 ** Math.min(2, Math.max(0, precision))
  return Math.abs(quantity * scale - Math.round(quantity * scale)) < 1e-7
}

export function createTransferCountSchema(sheet: TransferReceiptSheet | null) {
  const expected = new Map(
    (sheet?.lines ?? []).flatMap((line) =>
      line.lots.map(
        (lot) =>
          [
            receiptEntryKey(line.lineId, lot.lotId),
            { quantity: lot.dispatchedQuantity, precision: line.baseQuantityPrecision },
          ] as const
      )
    )
  )
  return z
    .object({
      entries: z
        .array(transferCountEntrySchema)
        .min(1, 'Hãy khai báo kết quả kiểm hàng.')
        .max(500, 'Tối đa 500 dòng kiểm hàng mỗi lần.'),
    })
    .superRefine(({ entries }, context) => {
      const declared = new Map<string, number>()
      entries.forEach((entry, index) => {
        const key = receiptEntryKey(entry.lineId, entry.lotId)
        const source = expected.get(key)
        if (!source)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'goodQuantity'],
            message: 'Dòng/lô không còn thuộc đợt xuất. Hãy tải lại phiếu.',
          })
        declared.set(
          key,
          (declared.get(key) ?? 0) +
            entry.goodQuantity +
            entry.damagedQuantity +
            entry.missingQuantity
        )
        for (const field of ['goodQuantity', 'damagedQuantity', 'missingQuantity'] as const)
          if (!hasTransferQuantityPrecision(entry[field], source?.precision ?? 2))
            context.addIssue({
              code: 'custom',
              path: ['entries', index, field],
              message: `Số lượng chỉ được tối đa ${Math.min(2, source?.precision ?? 2)} chữ số thập phân theo đơn vị tính.`,
            })
        if ((entry.damagedQuantity > 0 || entry.missingQuantity > 0) && !entry.reasonCode)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'reasonCode'],
            message: 'Hàng hỏng hoặc thiếu phải kèm nguyên nhân.',
          })
      })
      expected.forEach((source, key) => {
        if (Math.abs((declared.get(key) ?? 0) - source.quantity) > 1e-7) {
          const index = entries.findIndex(
            (entry) => receiptEntryKey(entry.lineId, entry.lotId) === key
          )
          context.addIssue({
            code: 'custom',
            path: ['entries', Math.max(0, index), 'goodQuantity'],
            message: `Tổng tốt, hỏng và thiếu phải bằng số đã xuất (${source.quantity}).`,
          })
        }
      })
    })
}
