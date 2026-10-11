import { z } from 'zod'

export const warehouseLocationImportKindSchema = z.enum(['Zone', 'Rack', 'Slot'])
export const warehouseLocationImportModeSchema = z.enum(['Zones', 'Racks', 'Slots', 'Structure'])

export const warehouseLocationImportOptionsSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: warehouseLocationImportModeSchema,
    csvDelimiter: z.enum(['auto', ',', ';', '\t']),
    tables: z
      .array(
        z.object({
          kind: warehouseLocationImportKindSchema,
          sheetId: z.string().min(1, 'Chọn trang tính.'),
          headerRowNumber: z
            .number()
            .int('Dòng tiêu đề phải là số nguyên.')
            .min(1, 'Dòng tiêu đề từ 1 đến 50.')
            .max(50, 'Dòng tiêu đề từ 1 đến 50.'),
          columnMapping: z
            .array(
              z.object({
                field: z.string().min(1, 'Chọn trường cần ghép.'),
                columnIndex: z
                  .number()
                  .int('Cột nguồn không hợp lệ.')
                  .min(0, 'Cột nguồn không hợp lệ.')
                  .max(99, 'Tệp chỉ hỗ trợ tối đa 100 cột.'),
              })
            )
            .min(1, 'Ghép các cột mã bắt buộc.')
            .max(100, 'Tệp chỉ hỗ trợ tối đa 100 cột.'),
        })
      )
      .min(1, 'Chọn ít nhất một bảng để nhập.')
      .max(3, 'Chỉ nhập tối đa ba loại bảng.'),
  })
  .superRefine((options, context) => {
    const kinds = new Set(options.tables.map((table) => table.kind))
    const sheets = new Set(options.tables.map((table) => table.sheetId))
    if (kinds.size !== options.tables.length || sheets.size !== options.tables.length) {
      context.addIssue({
        code: 'custom',
        path: ['tables'],
        message: 'Không dùng trùng loại bảng hoặc trang tính.',
      })
    }
    const expectedKind = { Zones: 'Zone', Racks: 'Rack', Slots: 'Slot' }[
      options.mode === 'Structure' ? 'Slots' : options.mode
    ]
    if (
      options.mode !== 'Structure' &&
      (options.tables.length !== 1 || options.tables[0]?.kind !== expectedKind)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['tables'],
        message: 'Bảng nhập không khớp loại cấu trúc đã chọn.',
      })
    }
    options.tables.forEach((table, index) => {
      const mappings = table.columnMapping
      if (
        new Set(mappings.map((mapping) => mapping.field)).size !== mappings.length ||
        new Set(mappings.map((mapping) => mapping.columnIndex)).size !== mappings.length
      ) {
        context.addIssue({
          code: 'custom',
          path: ['tables', index, 'columnMapping'],
          message: 'Không ghép trùng trường hoặc cột.',
        })
      }
      const required =
        table.kind === 'Zone'
          ? ['zoneCode']
          : table.kind === 'Rack'
            ? ['zoneCode', 'rackCode']
            : ['zoneCode', 'rackCode', 'slotCode']
      if (required.some((field) => !mappings.some((mapping) => mapping.field === field))) {
        context.addIssue({
          code: 'custom',
          path: ['tables', index, 'columnMapping'],
          message: 'Cần ghép đủ các cột mã bắt buộc.',
        })
      }
    })
  })

export const warehouseLocationImportSelectionSchema = z.object({
  expectedPreviewFingerprint: z
    .string()
    .min(1, 'Cần kiểm tra dữ liệu trước khi nhập.')
    .max(80, 'Kết quả kiểm tra không hợp lệ. Vui lòng kiểm tra lại.'),
  selectedRowKeys: z
    .array(z.string().min(1, 'Dòng được chọn không hợp lệ.'))
    .min(1, 'Chọn ít nhất một dòng tạo mới.')
    .max(500, 'Mỗi lần nhập tối đa 500 dòng.')
    .refine((keys) => new Set(keys).size === keys.length, 'Danh sách chọn không được lặp dòng.'),
  acknowledgeIgnoredData: z.boolean(),
})

export type WarehouseLocationImportKind = z.infer<typeof warehouseLocationImportKindSchema>
export type WarehouseLocationImportMode = z.infer<typeof warehouseLocationImportModeSchema>
export type WarehouseLocationImportOptions = z.infer<typeof warehouseLocationImportOptionsSchema>
export type WarehouseLocationImportSelection = z.infer<
  typeof warehouseLocationImportSelectionSchema
>
