import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import type { TransferItem } from '../types/transfer.types'
import { transferPlanLocations } from '../utils/transfer-putaway-plan'

export function createTransferPutawayPlanSchema(
  items: readonly TransferItem[],
  precisionByUnit: ReadonlyMap<string, number>
) {
  return z
    .object({
      expectedVersion: z.string().min(1, 'Hãy tải lại phiên bản phiếu.'),
      items: z
        .array(
          z.object({
            itemId: dotNetGuidSchema('Dòng hàng không hợp lệ.'),
            lines: z
              .array(
                z.object({
                  slotId: dotNetGuidSchema('Hãy chọn vị trí cất hàng.'),
                  plannedTotal: z
                    .number('Hãy nhập số lượng.')
                    .positive('Tổng kế hoạch phải lớn hơn 0.')
                    .max(9999999999999999.99),
                })
              )
              .max(20, 'Mỗi dòng hàng chỉ được chọn tối đa 20 vị trí.'),
          })
        )
        .min(1)
        .max(200),
    })
    .superRefine((request, context) => {
      const seenItems = new Set<string>()
      request.items.forEach((entry, index) => {
        const item = items.find((item) => item.id === entry.itemId)
        const error = (path: (string | number)[], message: string) =>
          context.addIssue({ code: 'custom', path: ['items', index, ...path], message })
        if (!item || seenItems.has(entry.itemId)) {
          error(['itemId'], 'Dòng hàng không hợp lệ hoặc bị lặp.')
          return
        }
        seenItems.add(entry.itemId)
        const seenSlots = new Set<string>()
        const precision = Math.min(
          2,
          item.baseQuantityPrecision ?? precisionByUnit.get(item.baseUnitId ?? '') ?? 2
        )
        const factor = 10 ** precision
        entry.lines.forEach((line, lineIndex) => {
          if (seenSlots.has(line.slotId))
            error(['lines', lineIndex, 'slotId'], 'Vị trí này đã được chọn trong dòng hàng.')
          seenSlots.add(line.slotId)
          const received =
            transferPlanLocations(item).find((saved) => saved.slotId === line.slotId)
              ?.receivedQuantity ?? 0
          if (line.plannedTotal < received)
            error(
              ['lines', lineIndex, 'plannedTotal'],
              `Tổng kế hoạch không được nhỏ hơn ${received} đã nhận.`
            )
          if (Math.abs(line.plannedTotal * factor - Math.round(line.plannedTotal * factor)) > 1e-7)
            error(
              ['lines', lineIndex, 'plannedTotal'],
              `Đơn vị này chỉ cho tối đa ${precision} chữ số thập phân.`
            )
        })
        for (const saved of transferPlanLocations(item))
          if (saved.receivedQuantity > 0 && !seenSlots.has(saved.slotId))
            error(['lines'], 'Không được xóa vị trí đã nhận hàng.')
        if (
          entry.lines.reduce((sum, line) => sum + line.plannedTotal, 0) -
            (item.quantity - item.stoppedQuantity) >
          1e-7
        )
          error(['lines'], 'Tổng kế hoạch vượt số lượng cần chuyển sau khi trừ phần đã dừng.')
      })
    })
}
