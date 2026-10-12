import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import { INBOUND_SOURCE_TYPE, RECORD_STATUS } from '../types/inbound-request.types'

export const inboundSourceTypes = Object.values(INBOUND_SOURCE_TYPE)

export const inboundSourceLabels: Record<(typeof inboundSourceTypes)[number], string> = {
  Supplier: 'Nhà cung cấp',
  InternalBranch: 'Chi nhánh nội bộ',
  InternalDepartment: 'Bộ phận nội bộ',
  ExternalPartner: 'Đối tác bên ngoài',
  Other: 'Nguồn khác',
}

export const inboundRequestLineSchema = z.object({
  productId: dotNetGuidSchema('Vui lòng chọn sản phẩm.'),
  quantity: z.number().positive('Số lượng phải lớn hơn 0.'),
  unitId: z
    .string()
    .refine(
      (value) => !value || dotNetGuidSchema('Đơn vị tính không hợp lệ.').safeParse(value).success,
      {
        message: 'Đơn vị tính không hợp lệ.',
      }
    ),
})

export const inboundRequestSchema = z
  .object({
    inboundRequestCode: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập mã yêu cầu.')
      .max(100, 'Mã tối đa 100 ký tự.'),
    warehouseId: dotNetGuidSchema('Vui lòng chọn kho nhận hàng.'),
    receivingAssignedTo: z
      .union([z.literal(''), dotNetGuidSchema('Nhân viên không hợp lệ.')])
      .optional(),
    sourceType: z.enum(inboundSourceTypes),
    supplierId: z.string(),
    sourceName: z.string().trim().max(200, 'Tên nguồn không được vượt quá 200 ký tự.'),
    sourceReference: z.string().trim().max(100, 'Mã tham chiếu không được vượt quá 100 ký tự.'),
    // Kho hẹn giao hàng theo ngày: không có ngày thì nhân viên không biết khi nào phải chừa thời gian.
    expectedDate: z.string().min(1, 'Vui lòng chọn ngày dự kiến hàng về.'),
    lines: z
      .array(inboundRequestLineSchema)
      .min(1, 'Yêu cầu nhập kho phải có ít nhất một sản phẩm.'),
  })

  .superRefine((values, context) => {
    if (
      values.sourceType === INBOUND_SOURCE_TYPE.Supplier &&
      !dotNetGuidSchema('Vui lòng chọn nhà cung cấp.').safeParse(values.supplierId).success
    ) {
      context.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Vui lòng chọn nhà cung cấp.',
      })
    }
    if (values.sourceType !== INBOUND_SOURCE_TYPE.Supplier && !values.sourceName) {
      context.addIssue({
        code: 'custom',
        path: ['sourceName'],
        message: 'Vui lòng nhập tên nguồn hàng.',
      })
    }
    const productIds = new Set<string>()
    values.lines.forEach((line, index) => {
      if (productIds.has(line.productId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'productId'],
          message: 'Sản phẩm này đã có trong yêu cầu nhập kho.',
        })
      }
      productIds.add(line.productId)
    })
  })

export function resolveInboundLineUnits(
  product: ProductResponse | undefined,
  enteredUnitId: string,
  units: readonly UnitResponse[],
  conversions: readonly ProductUnitConversion[]
) {
  const alternatives = conversions.filter(
    (conversion) =>
      conversion.status === RECORD_STATUS.Active &&
      units.some((unit) => unit.id === conversion.unitId)
  )
  const baseUnit = units.find((unit) => unit.id === product?.unitId)
  const selectedUnitId = enteredUnitId || product?.unitId
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId)
  const factor =
    product && selectedUnitId === product.unitId
      ? 1
      : alternatives.find((conversion) => conversion.unitId === selectedUnitId)?.conversionFactor

  return { alternatives, baseUnit, selectedUnit, factor }
}

export function inboundRequestSchemaWithUnits(
  products: Readonly<Record<string, ProductResponse>>,
  units: readonly UnitResponse[],
  conversions: Readonly<Record<string, readonly ProductUnitConversion[]>>
) {
  return inboundRequestSchema.superRefine((values, context) => {
    values.lines.forEach((line, index) => {
      const product = products[line.productId]
      if (!product) return
      if (product.status !== RECORD_STATUS.Active) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'productId'],
          message: 'Sản phẩm đã ngừng hoạt động.',
        })
      }
      const { selectedUnit, baseUnit, factor } = resolveInboundLineUnits(
        product,
        line.unitId,
        units,
        conversions[line.productId] ?? []
      )
      if (!selectedUnit || !baseUnit || factor === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'unitId'],
          message: 'Đơn vị tính hoặc quy đổi không còn hoạt động.',
        })
        return
      }
      if (
        Math.abs(line.quantity - Number(line.quantity.toFixed(selectedUnit.quantityPrecision))) >
        1e-9
      ) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: `Đơn vị ${selectedUnit.unitName} chỉ cho phép ${selectedUnit.quantityPrecision} chữ số thập phân.`,
        })
      }
      const baseQuantity = line.quantity * factor
      if (
        Math.abs(baseQuantity - Number(baseQuantity.toFixed(baseUnit.quantityPrecision))) > 1e-9
      ) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: `Số lượng quy đổi không hợp lệ theo đơn vị cơ sở ${baseUnit.unitName}.`,
        })
      }
    })
  })
}

export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
})

export type InboundRequestFormValues = z.infer<typeof inboundRequestSchema>
export const inboundRequestCodeSchema = z.object({
  inboundRequestCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã yêu cầu.')
    .max(100, 'Mã tối đa 100 ký tự.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do đổi mã.')
    .max(500, 'Lý do tối đa 500 ký tự.'),
})
export type InboundRequestCodeFormValues = z.infer<typeof inboundRequestCodeSchema>
export type RejectionFormValues = z.infer<typeof rejectionSchema>
