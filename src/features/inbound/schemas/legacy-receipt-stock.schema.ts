import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const legacyReceiptEvidenceFileSchema = z
  .custom<File>((value) => typeof File !== 'undefined' && value instanceof File)
  .refine((file) => file.size > 0, 'Tệp được chọn không có nội dung.')
  .refine(
    (file) => /\.(pdf|png|jpg|jpeg|csv|xlsx)$/i.test(file.name),
    'Định dạng tệp được chọn không được hỗ trợ.'
  )
  .refine((file) => file.size <= 10 * 1024 * 1024, 'Tệp được chọn vượt quá dung lượng cho phép.')

export const legacyReceiptStockSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do đối soát.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
  evidenceIds: z
    .array(dotNetGuidSchema('Bằng chứng không hợp lệ.'))
    .min(1, 'Cần ít nhất một bằng chứng.')
    .max(5, 'Chỉ được chọn tối đa năm bằng chứng.'),
  lines: z
    .array(
      z.object({
        goodsReceiptItemId: dotNetGuidSchema('Dòng phiếu nhận không hợp lệ.'),
        actualHoldQuantity: z
          .number({ error: 'Vui lòng nhập số đếm thực tế.' })
          .min(0, 'Số đếm thực tế không được âm.')
          .lt(10_000_000_000_000_000)
          .multipleOf(0.01, 'Số lượng chỉ được có tối đa hai chữ số thập phân.'),
      })
    )
    .min(1),
  selfApprovalAcknowledged: z.boolean(),
})
export type LegacyReceiptStockValues = z.infer<typeof legacyReceiptStockSchema>
export interface LegacyReceiptStockRequest extends LegacyReceiptStockValues {
  receivingSlotId: string
  expectedVersion: string
  commandId: string
}
