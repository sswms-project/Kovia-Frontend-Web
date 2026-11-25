import { z } from 'zod'
import { refineQuantity } from '@/lib/quantity-rules'

export const reportDamagedStockSchema = z
  .object({
    reportMode: z.enum(['Confirmed', 'Observation']),
    quantity: z.number().optional(),
    reason: z.string().trim().min(1, 'Lý do báo hỏng là bắt buộc.').max(500),
    relatedTaskKey: z.string().optional(),
    evidenceFile: z.custom<File>((value) => value instanceof File, 'Tệp bằng chứng là bắt buộc.'),
  })
  .superRefine((values, context) => {
    // Độ chính xác theo ĐVT của dòng tồn được kiểm thêm khi gửi (InventoryPage).
    if (values.reportMode === 'Confirmed')
      refineQuantity(context, values.quantity, {}, ['quantity'])
  })

export type ReportDamagedStockFormValues = z.infer<typeof reportDamagedStockSchema>
