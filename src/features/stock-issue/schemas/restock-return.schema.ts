import { z } from 'zod'
import { GOODS_RETURN_REQUEST_ITEM_CONDITIONS } from '../types/stock-issue.types'

export const restockReturnSchema = z.object({
  items: z
    .array(
      z
        .object({
          returnItemId: z.string().uuid(),
          condition: z.enum(GOODS_RETURN_REQUEST_ITEM_CONDITIONS),
          restockSlotId: z.string().uuid().nullable(),
          scannedSlotCode: z.string().trim().max(100, 'Mã vị trí tối đa 100 ký tự.').optional(),
        })
        .superRefine((item, context) => {
          const requiresRestockSlot = item.condition !== 'Scrap'
          if (requiresRestockSlot && !item.scannedSlotCode) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scannedSlotCode'],
              message: 'Hãy quét hoặc nhập mã để xác nhận vị trí cất.',
            })
          }

          if (requiresRestockSlot && item.restockSlotId === null) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['restockSlotId'],
              message: 'Vui lòng chọn vị trí nhập kho.',
            })
          }

          if (!requiresRestockSlot && item.restockSlotId !== null) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['restockSlotId'],
              message: 'Hàng loại bỏ không được nhập vào vị trí kho.',
            })
          }
        })
    )
    .min(1),
})

export type RestockReturnFormValues = z.infer<typeof restockReturnSchema>
