import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import { PUTAWAY_DEVIATION_REASONS, UNREADABLE_SLOT_REASONS } from '@/types/putaway.types'
import type { TransferPutAwaySheet } from '../types/transfer-receipt.types'
import { hasTransferQuantityPrecision } from './transfer-receipt.schema'
import { putAwayRowKey, transferPutAwayPlanStates } from '../utils/transfer-putaway'

export const transferPutAwayEntrySchema = z.object({
  lineId: dotNetGuidSchema('Dòng hàng không hợp lệ.'),
  lotId: dotNetGuidSchema('Lô hàng không hợp lệ.').nullable(),
  qualityStatus: z.enum(['Good', 'Damaged'], 'Chất lượng phải là hàng tốt hoặc hàng hỏng.'),
  destinationSlotId: z.string(),
  slotLabel: z.string(),
  plannedSlotId: z.string(),
  plannedSlotLabel: z.string(),
  quantity: z
    .number('Số lượng phải là số.')
    .min(0, 'Số lượng không được âm.')
    .lt(1e18, 'Số lượng vượt giới hạn cho phép.'),
  scannedSlotCode: z.string().trim().max(100, 'Mã vị trí tối đa 100 ký tự.'),
  scannedProductCode: z.string().trim().max(100, 'Mã hàng tối đa 100 ký tự.'),
  deviationReasonCode: z.string().max(40, 'Lý do không hợp lệ.'),
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
  slotCodeUnreadable: z.boolean(),
})
export type TransferPutAwayEntryValues = z.infer<typeof transferPutAwayEntrySchema>
export type TransferPutAwayFormValues = { entries: TransferPutAwayEntryValues[] }

export function createTransferPutAwaySchema(sheet: TransferPutAwaySheet | null) {
  const rows = new Map((sheet?.rows ?? []).map((row) => [putAwayRowKey(row), row]))
  return z
    .object({
      entries: z.array(transferPutAwayEntrySchema).max(500, 'Tối đa 500 dòng cất mỗi lần.'),
    })
    .superRefine(({ entries }, context) => {
      const states = sheet ? transferPutAwayPlanStates(sheet, entries) : []
      const used = new Map<string, number>()
      const hasRemaining =
        !sheet ||
        sheet.rows.some((row) => row.qualityStatus === 'Good' && row.remainingQuantity > 0)
      if (hasRemaining && !entries.some((entry) => entry.quantity > 0))
        context.addIssue({
          code: 'custom',
          path: ['entries', 0, 'quantity'],
          message: 'Nhập số lượng lớn hơn 0 cho ít nhất một dòng cần cất.',
        })
      entries.forEach((entry, index) => {
        if (entry.qualityStatus !== 'Good')
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'qualityStatus'],
            message: 'Chỉ cất hàng tốt thực nhận. Hàng hỏng xử lý trong hồ sơ chênh lệch.',
          })
        const source = rows.get(putAwayRowKey(entry))
        const quantity = (used.get(putAwayRowKey(entry)) ?? 0) + entry.quantity
        used.set(putAwayRowKey(entry), quantity)
        if (!source || quantity > source.remainingQuantity + 1e-7)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'quantity'],
            message: 'Số lượng cất vượt phần thực nhận còn lại của dòng/lô/chất lượng.',
          })
        if (!hasTransferQuantityPrecision(entry.quantity, source?.baseQuantityPrecision ?? 2))
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'quantity'],
            message: 'Số lượng cất không đúng độ chính xác đơn vị tính.',
          })
        if (entry.quantity <= 0) return
        if (!dotNetGuidSchema('').safeParse(entry.destinationSlotId).success)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'destinationSlotId'],
            message: 'Hãy chọn vị trí cất hợp lệ tại kho nhập.',
          })
        if (!entry.slotCodeUnreadable && !entry.scannedSlotCode)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'scannedSlotCode'],
            message: 'Hãy quét hoặc nhập mã vị trí để xác nhận.',
          })
        if (entry.slotCodeUnreadable && entry.scannedSlotCode)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'scannedSlotCode'],
            message: 'Đã có mã quét thì không khai báo không quét được mã.',
          })
        const reasons = entry.slotCodeUnreadable
          ? UNREADABLE_SLOT_REASONS
          : states[index]?.isOffPlan
            ? PUTAWAY_DEVIATION_REASONS
            : null
        if (reasons && !reasons.some((reason) => reason === entry.deviationReasonCode))
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'deviationReasonCode'],
            message: entry.slotCodeUnreadable
              ? 'Hãy chọn lý do không quét được mã vị trí.'
              : 'Hãy chọn lý do cất khác kế hoạch.',
          })
        if (reasons && entry.deviationReasonCode === 'Other' && entry.note.length < 5)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'note'],
            message: 'Lý do khác cần mô tả từ 5 đến 500 ký tự.',
          })
      })
    })
}
