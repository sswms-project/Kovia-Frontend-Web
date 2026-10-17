import { z } from 'zod'
import { operationalToday } from '@/lib/operational-date-time'
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export function openingStockQuantitySchema(precision: number) {
  return z
    .number()
    .positive('Số lượng phải lớn hơn 0.')
    .multipleOf(
      10 ** -precision,
      `Số lượng chỉ được có tối đa ${precision} chữ số thập phân theo đơn vị đã chọn.`
    )
}

export const createOpeningStockSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Nhập mã chứng từ.')
      .max(100, 'Mã chứng từ tối đa 100 ký tự.')
      .refine((value) => !/\p{Cc}/u.test(value), 'Mã chứng từ chứa ký tự không hợp lệ.'),
    enteredUnitId: z
      .union([z.literal(''), nonEmptyDotNetGuidSchema('Đơn vị không hợp lệ.')])
      .optional(),
    warehouseId: nonEmptyDotNetGuidSchema('Mã kho không hợp lệ.'),
    effectiveDate: z.iso
      .date('Chọn ngày ghi nhận.')
      .refine((value) => value <= operationalToday(), 'Ngày ghi nhận không được sau hôm nay.'),
    newLotNumber: z.string().trim().max(100, 'Số lô tối đa 100 ký tự.'),
    manufacturedDate: z.union([z.literal(''), z.iso.date('Ngày sản xuất không hợp lệ.')]),
    expiryDate: z.union([z.literal(''), z.iso.date('Hạn dùng không hợp lệ.')]),
    acknowledgePendingLots: z.boolean(),
    evidenceFile: z
      .custom<File>((value) => value instanceof File, 'Tệp bằng chứng không hợp lệ.')
      .optional(),
    productId: nonEmptyDotNetGuidSchema('Mã sản phẩm không hợp lệ.'),
    slotId: nonEmptyDotNetGuidSchema('Mã vị trí không hợp lệ.'),
    lotId: z.union([z.literal(''), nonEmptyDotNetGuidSchema('Mã lô không hợp lệ.')]),
    quantity: openingStockQuantitySchema(2),
    qualityStatus: z.enum(['Good', 'Damaged']),
    eligibilityStatus: z.enum(['Available', 'InspectionHold', 'DamageHold', 'Quarantine']),
  })
  .superRefine((values, context) => {
    if (values.newLotNumber && !values.acknowledgePendingLots)
      context.addIssue({
        code: 'custom',
        path: ['acknowledgePendingLots'],
        message: 'Xác nhận thông tin lô mới trước khi lưu.',
      })
    if (values.lotId && values.newLotNumber)
      context.addIssue({
        code: 'custom',
        path: ['newLotNumber'],
        message: 'Chỉ chọn lô có sẵn hoặc khai báo lô mới.',
      })
    if (
      values.manufacturedDate &&
      (values.manufacturedDate > values.effectiveDate ||
        (values.expiryDate && values.manufacturedDate > values.expiryDate))
    )
      context.addIssue({
        code: 'custom',
        path: ['manufacturedDate'],
        message: 'Ngày sản xuất không được sau hạn dùng hoặc ngày ghi nhận.',
      })
    if (values.qualityStatus === 'Damaged' && values.eligibilityStatus !== 'DamageHold') {
      context.addIssue({
        code: 'custom',
        path: ['eligibilityStatus'],
        message: 'Hàng hư hỏng phải được đưa vào trạng thái giữ do hư hỏng.',
      })
    }
  })

export type CreateOpeningStockFormValues = z.infer<typeof createOpeningStockSchema>
