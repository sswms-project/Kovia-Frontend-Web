import { z } from 'zod'
import {
  BULK_IMPORT_MAX_FILE_BYTES,
  hasBulkImportExtension,
} from '@/components/operations/bulk-import'
import type { ProductImportField, ProductImportInspect } from '../types/product-import.types'

export const productImportFileSchema = z.instanceof(File).superRefine((file, context) => {
  if (!hasBulkImportExtension(file.name))
    context.addIssue({ code: 'custom', message: 'Chỉ hỗ trợ XLSX hoặc CSV.' })
  if (!file.size || file.size > BULK_IMPORT_MAX_FILE_BYTES)
    context.addIssue({ code: 'custom', message: 'Tệp phải có dữ liệu và không vượt quá 5 MB.' })
})

const sheetSchema = z.object({
  sheetId: z.string().min(1, 'Chọn trang tính.'),
  headerRowNumber: z.number().int().min(1).max(50),
  columnMapping: z
    .array(z.object({ field: z.string(), columnIndex: z.number().int().min(0).max(99) }))
    .max(100),
})

export function productImportOptionsSchema(inspect?: ProductImportInspect) {
  return z
    .object({
      main: sheetSchema,
      conversions: sheetSchema.nullable(),
      csvDelimiter: z.enum(['auto', ',', ';', '\t']),
      schemaVersion: z.literal(1),
    })
    .superRefine((options, context) => {
      if (!inspect) {
        context.addIssue({ code: 'custom', message: 'Kiểm tra tệp trước khi ghép cột.' })
        return
      }
      if (inspect.schema.version !== 1)
        context.addIssue({
          code: 'custom',
          path: ['schemaVersion'],
          message: 'Phiên bản mẫu chưa được hỗ trợ. Tải lại trang hoặc liên hệ quản trị.',
        })
      function check(name: 'main' | 'conversions', fields: ProductImportField[]) {
        const sheet = options[name]
        if (!sheet) return
        if (!inspect?.sheets.some((item) => item.sheetId === sheet.sheetId))
          context.addIssue({
            code: 'custom',
            path: [name, 'sheetId'],
            message: 'Trang tính không có trong tệp.',
          })
        const mapping = sheet.columnMapping
        if (
          new Set(mapping.map((item) => item.field)).size !== mapping.length ||
          new Set(mapping.map((item) => item.columnIndex)).size !== mapping.length ||
          mapping.some((item) => !fields.some((field) => field.field === item.field))
        )
          context.addIssue({
            code: 'custom',
            path: [name, 'columnMapping'],
            message: 'Không ghép trùng cột hoặc trường không hỗ trợ.',
          })
        if (
          fields.some(
            (field) => field.isRequired && !mapping.some((item) => item.field === field.field)
          )
        )
          context.addIssue({
            code: 'custom',
            path: [name, 'columnMapping'],
            message: 'Ghép đủ các cột bắt buộc.',
          })
      }
      check('main', inspect.schema.mainFields)
      check('conversions', inspect.schema.conversionFields)
      if (
        options.conversions &&
        (inspect.isCsv || options.main.sheetId === options.conversions.sheetId)
      )
        context.addIssue({
          code: 'custom',
          path: ['conversions', 'sheetId'],
          message: 'Quy đổi cần một trang tính XLSX riêng.',
        })
    })
}
export type ProductImportFormValues = z.infer<ReturnType<typeof productImportOptionsSchema>>
