import { z } from 'zod'
import { operationalToday } from '@/lib/operational-date-time'
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const openingStockImportSetupSchema = z.object({
  warehouseId: nonEmptyDotNetGuidSchema('Vui lòng chọn kho.'),
  effectiveDate: z.iso
    .date('Vui lòng chọn ngày ghi nhận.')
    .refine((date) => date <= operationalToday(), 'Ngày ghi nhận không được sau hôm nay.'),
})
export type OpeningStockImportSetup = z.infer<typeof openingStockImportSetupSchema>

export const openingStockImportOptionsSchema = openingStockImportSetupSchema.extend({
  spreadsheet: z.object({
    schemaVersion: z.literal(1),
    sheetId: z.string().min(1),
    headerRowNumber: z.number().int().min(1).max(50),
    csvDelimiter: z.string(),
    columnMapping: z
      .array(z.object({ field: z.string().min(1), columnIndex: z.number().int().min(0).max(99) }))
      .min(3)
      .max(100),
  }),
  selectedRowKeys: z.array(z.string().min(1)).max(200).nullable(),
})
export type OpeningStockImportOptions = z.infer<typeof openingStockImportOptionsSchema>
