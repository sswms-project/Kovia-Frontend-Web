import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const inboundDocumentReviewLineSchema = z
  .object({
    sourceLineNumber: z.number().int().positive(),
    inboundRequestItemId: dotNetGuidSchema('Vui lòng chọn một dòng yêu cầu nhập kho hợp lệ.'),
    confirmedQuantity: z.number().positive('Số lượng xác nhận phải lớn hơn 0.'),
    damagedQuantity: z.number().min(0, 'Số lượng hỏng không được âm.'),
    exceptionReason: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự.'),
    isLotTracked: z.boolean(),
    lotNumber: z.string().trim().max(100, 'Số lô không được vượt quá 100 ký tự.'),
    manufacturedDate: z.string(),
    expiryDate: z.string(),
  })
  .superRefine((line, context) => {
    if (line.damagedQuantity > line.confirmedQuantity) {
      context.addIssue({
        code: 'custom',
        path: ['damagedQuantity'],
        message: 'Số lượng hỏng không được lớn hơn số lượng xác nhận.',
      })
    }
    if (line.damagedQuantity > 0 && line.exceptionReason.trim().length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['exceptionReason'],
        message: 'Vui lòng ghi rõ tình trạng hàng hỏng.',
      })
    }
    if (line.isLotTracked && !line.lotNumber) {
      context.addIssue({
        code: 'custom',
        path: ['lotNumber'],
        message: 'Vui lòng nhập số lô.',
      })
    }
    if (!line.isLotTracked && (line.lotNumber || line.manufacturedDate || line.expiryDate)) {
      context.addIssue({
        code: 'custom',
        path: ['lotNumber'],
        message: 'Sản phẩm theo số lượng không nhận thông tin lô.',
      })
    }
    if (
      line.manufacturedDate &&
      line.expiryDate &&
      new Date(line.expiryDate) < new Date(line.manufacturedDate)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['expiryDate'],
        message: 'Hạn sử dụng phải bằng hoặc sau ngày sản xuất.',
      })
    }
  })

const headerText = (max: number) => z.string().trim().max(max, `Không được vượt quá ${max} ký tự.`)

export const inboundDocumentHeaderSchema = z.object({
  documentNumber: headerText(100),
  inboundRequestCode: headerText(100),
  supplierName: headerText(300),
  documentDate: z.string(),
  supplierDeliveryDate: z.string(),
  warehouseCode: headerText(100),
  warehouseName: headerText(300),
})

export const emptyInboundDocumentHeader: InboundDocumentHeaderFormValues = {
  documentNumber: '',
  inboundRequestCode: '',
  supplierName: '',
  documentDate: '',
  supplierDeliveryDate: '',
  warehouseCode: '',
  warehouseName: '',
}

export const inboundDocumentReviewSchema = z
  .object({
    header: inboundDocumentHeaderSchema,
    inboundRequestId: dotNetGuidSchema('Yêu cầu nhập kho không hợp lệ.'),
    acknowledgeWarehouseMismatch: z.boolean(),
    lines: z
      .array(inboundDocumentReviewLineSchema)
      .min(1, 'Chứng từ phải có ít nhất một dòng hàng.'),
  })
  .superRefine((review, context) => {
    review.lines.forEach((line, index) => {
      const firstIndex = review.lines.findIndex(
        (candidate) => candidate.inboundRequestItemId === line.inboundRequestItemId
      )
      if (firstIndex !== index) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'inboundRequestItemId'],
          message: 'Dòng yêu cầu nhập kho này đã được chọn ở một dòng chứng từ khác.',
        })
      }
    })
  })

export const inboundDocumentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'Tệp không được để trống.')
  .refine((file) => file.size <= 10 * 1024 * 1024, 'Tệp không được vượt quá 10 MB.')
  .refine(
    (file) => /\.(pdf|jpe?g|png|docx|xlsx|csv)$/i.test(file.name),
    'Chỉ hỗ trợ PDF, JPG, PNG, DOCX, XLSX hoặc CSV.'
  )

export type InboundDocumentHeaderFormValues = z.infer<typeof inboundDocumentHeaderSchema>
export type InboundDocumentReviewFormValues = z.infer<typeof inboundDocumentReviewSchema>
