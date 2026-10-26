import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const receiptDamageIsolationSchema = z.object({
  goodsReceiptItemId: dotNetGuidSchema('Vui lòng chọn hàng hỏng.'),
  quantity: z
    .number({ error: 'Vui lòng nhập số lượng.' })
    .positive('Số lượng phải lớn hơn 0.')
    .lt(1e16, 'Số lượng vượt giới hạn.')
    .multipleOf(0.01, 'Số lượng chỉ có tối đa hai chữ số thập phân.'),
  confirmedSlotCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã vị trí.')
    .max(255, 'Mã vị trí không được vượt quá 255 ký tự.'),
  physicallySeparated: z
    .boolean()
    .refine((value) => value, 'Chỉ xác nhận sau khi đã cách biệt hàng hỏng.'),
})
export type ReceiptDamageIsolationValues = z.infer<typeof receiptDamageIsolationSchema>
