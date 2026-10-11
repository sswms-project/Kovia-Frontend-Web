import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const MAX_TRANSFER_LINES = 200

const optionalGuid = (message: string) =>
  z.string().refine((value) => !value || dotNetGuidSchema(message).safeParse(value).success, {
    message,
  })

export const transferLineSchema = z.object({
  /** Null với dòng mới thêm; có giá trị khi sửa phiếu đã gửi. */
  itemId: z.string().nullable(),
  productId: dotNetGuidSchema('Vui lòng chọn sản phẩm.'),
  unitId: optionalGuid('Đơn vị tính không hợp lệ.'),
  /** Vị trí đến gợi ý ở kho nhập; chuỗi rỗng là chưa chọn. */
  destinationSlotId: optionalGuid('Vị trí đến không hợp lệ.'),
  /** Vị trí lấy hàng ưu tiên ở kho xuất; chuỗi rỗng là để hệ thống tự phân bổ. */
  sourceSlotId: optionalGuid('Vị trí đi không hợp lệ.'),
  quantity: z.number('Số lượng phải là số.').positive('Số lượng phải lớn hơn 0.'),
})

export const transferRequestSchema = z
  .object({
    /** Để trống thì BE tự cấp mã kế tiếp; có nhập thì phải duy nhất trong doanh nghiệp. */
    transferCode: z.string().trim().max(100, 'Mã yêu cầu không được vượt quá 100 ký tự.'),
    requesterName: z.string().trim().max(200, 'Người yêu cầu không được vượt quá 200 ký tự.'),
    requestingDepartment: z
      .string()
      .trim()
      .max(200, 'Bộ phận yêu cầu không được vượt quá 200 ký tự.'),
    sourceWarehouseId: dotNetGuidSchema('Vui lòng chọn kho xuất.'),
    destinationWarehouseId: dotNetGuidSchema('Vui lòng chọn kho nhập.'),
    reason: z.string().trim().max(500, 'Lý do không được vượt quá 500 ký tự.'),
    requiredBy: z.string(),
    note: z.string().trim().max(1000, 'Ghi chú không được vượt quá 1000 ký tự.'),
    lines: z
      .array(transferLineSchema)
      .min(1, 'Phiếu điều chuyển phải có ít nhất một dòng hàng.')
      .max(MAX_TRANSFER_LINES, `Một phiếu điều chuyển có tối đa ${MAX_TRANSFER_LINES} dòng hàng.`),
  })
  .superRefine((values, context) => {
    if (values.sourceWarehouseId && values.sourceWarehouseId === values.destinationWarehouseId) {
      context.addIssue({
        code: 'custom',
        path: ['destinationWarehouseId'],
        message: 'Kho nhập phải khác kho xuất.',
      })
    }
    const productIds = new Set<string>()
    values.lines.forEach((line, index) => {
      if (productIds.has(line.productId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'productId'],
          message: 'Sản phẩm này đã có trong phiếu; hãy sửa số lượng của dòng hiện có.',
        })
      }
      productIds.add(line.productId)
    })
  })

export interface TransferLineLock {
  /** Số lượng nhỏ nhất (theo ĐVT đã chọn) vì phần đã xuất không được giảm. */
  readonly minimum: number
}

export function transferRequestSchemaWithLocks(locks: ReadonlyMap<string, TransferLineLock>) {
  return transferRequestSchema.superRefine((values, context) => {
    values.lines.forEach((line, index) => {
      const lock = line.itemId ? locks.get(line.itemId) : undefined
      if (lock && line.quantity < lock.minimum - 1e-9) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: `Không giảm thấp hơn phần đã xuất (${lock.minimum}).`,
        })
      }
    })
  })
}

export type TransferRequestFormValues = z.infer<typeof transferRequestSchema>
export type TransferLineFormValues = z.infer<typeof transferLineSchema>
