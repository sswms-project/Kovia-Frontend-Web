import { z } from 'zod'

export const listExportSchema = z
  .object({
    dataset: z.enum([
      'movements',
      'reservations',
      'damage-cases',
      'opening-stocks',
      'discrepancies',
      'adjustments',
      'abc',
      'products',
      'suppliers',
      'customers',
      'warehouses',
      'locations',
      'inbound-requests',
      'receiving',
      'goods-receipts',
      'putaway',
      'stock-issues',
      'transfers',
      'cycle-counts',
      'my-tasks',
      'my-task-history',
      'managed-tasks',
      'managed-task-history',
    ]),
    filters: z
      .record(z.string(), z.unknown())
      .refine((value) => JSON.stringify(value).length <= 16000, 'Bộ lọc xuất quá dài.'),
    selectedIds: z
      .array(z.guid().refine((id) => id !== '00000000-0000-0000-0000-000000000000'))
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, 'Không chọn dòng trùng lặp.')
      .optional(),
  })
  .refine(
    (value) => !value.selectedIds || value.dataset === 'inbound-requests',
    'Danh sách chưa hỗ trợ xuất các dòng đã chọn.'
  )

export type ListExportRequest = z.infer<typeof listExportSchema>
