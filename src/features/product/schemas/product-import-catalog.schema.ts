import { z } from 'zod'

export const productImportCatalogSchema = z
  .object({
    confirmed: z.boolean(),
    entries: z
      .array(
        z.object({
          id: z.string().uuid(),
          categories: z.boolean(),
          value: z.string(),
          rowNumber: z.number().int(),
          canCreate: z.boolean(),
          mode: z.enum(['skip', 'existing', 'create']),
          existingId: z.string(),
          code: z.string().trim().max(50, 'Mã tối đa 50 ký tự.'),
          name: z.string().trim(),
          parentCode: z.string().max(50, 'Mã nhóm cha tối đa 50 ký tự.'),
          symbol: z.string().max(30, 'Ký hiệu tối đa 30 ký tự.'),
          quantityPrecision: z
            .number({ error: 'Nhập số chữ số thập phân từ 0 đến 6.' })
            .int('Nhập số nguyên.')
            .min(0, 'Số chữ số thập phân phải từ 0 đến 6.')
            .max(6, 'Số chữ số thập phân phải từ 0 đến 6.'),
        })
      )
      .max(3000, 'Tối đa 3.000 tham chiếu danh mục trong một tệp.'),
  })
  .superRefine((values, context) => {
    values.entries.forEach((entry, index) => {
      if (entry.mode === 'create') {
        if (!entry.canCreate)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'mode'],
            message: 'Không được tạo danh mục này.',
          })
        if (!entry.code)
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'code'],
            message: 'Nhập mã danh mục.',
          })
        if (!entry.name || entry.name.length > (entry.categories ? 255 : 100))
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'name'],
            message: 'Tên bắt buộc và phải trong độ dài cho phép.',
          })
      }
      if (entry.mode === 'existing' && !entry.existingId)
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'existingId'],
          message: 'Chọn danh mục đang hoạt động.',
        })
    })
    if (values.entries.some((entry) => entry.mode === 'create') && !values.confirmed)
      context.addIssue({
        code: 'custom',
        path: ['confirmed'],
        message: 'Xác nhận trước khi áp dụng phương án tạo mới.',
      })
  })
export type ProductImportCatalogValues = z.infer<typeof productImportCatalogSchema>
