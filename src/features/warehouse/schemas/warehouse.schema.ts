import { z } from 'zod'

const addressSchema = z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự.')

export const createWarehouseSchema = z.object({
  warehouseCode: z.string().trim().min(1, 'Mã kho là bắt buộc.').max(50, 'Mã kho tối đa 50 ký tự.'),
  warehouseName: z
    .string()
    .trim()
    .min(1, 'Tên kho là bắt buộc.')
    .max(255, 'Tên kho tối đa 255 ký tự.'),
  address: addressSchema,
})

export const updateWarehouseSchema = z.object({
  warehouseName: z
    .string()
    .trim()
    .min(1, 'Tên kho là bắt buộc.')
    .max(255, 'Tên kho tối đa 255 ký tự.'),
  address: addressSchema,
})

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseFormValues = z.infer<typeof updateWarehouseSchema>

const optionalPhysicalValueSchema = z
  .number({ error: 'Giá trị phải là số.' })
  .positive('Giá trị phải lớn hơn 0.')
  .nullable()

const physicalDetailsShape = {
  storageCapacity: optionalPhysicalValueSchema,
  storageCapacityUnit: z.enum(['Ton', 'Kilogram', 'Gram']).nullable(),
  physicalLength: optionalPhysicalValueSchema,
  physicalLengthUnit: z.enum(['Kilometer', 'Meter', 'Decimeter', 'Centimeter']).nullable(),
  physicalWidth: optionalPhysicalValueSchema,
  physicalWidthUnit: z.enum(['Kilometer', 'Meter', 'Decimeter', 'Centimeter']).nullable(),
  physicalHeight: optionalPhysicalValueSchema,
  physicalHeightUnit: z.enum(['Kilometer', 'Meter', 'Decimeter', 'Centimeter']).nullable(),
} as const

type PhysicalDetailsValues = z.infer<z.ZodObject<typeof physicalDetailsShape>>

function normalizeOptionalDimensions<T extends PhysicalDetailsValues>(values: T): T {
  return {
    ...values,
    physicalLengthUnit: values.physicalLength === null ? null : values.physicalLengthUnit,
    physicalWidthUnit: values.physicalWidth === null ? null : values.physicalWidthUnit,
    physicalHeightUnit: values.physicalHeight === null ? null : values.physicalHeightUnit,
  }
}

function validatePhysicalDetails(values: PhysicalDetailsValues, context: z.RefinementCtx) {
  const pairs = [
    ['storageCapacity', 'storageCapacityUnit', 'Dung lượng lưu trữ'],
    ['physicalLength', 'physicalLengthUnit', 'Chiều dài'],
    ['physicalWidth', 'physicalWidthUnit', 'Chiều rộng'],
    ['physicalHeight', 'physicalHeightUnit', 'Chiều cao'],
  ] as const

  for (const [valueField, unitField, label] of pairs) {
    if (values[valueField] !== null && values[unitField] === null) {
      context.addIssue({
        code: 'custom',
        path: [unitField],
        message: `Vui lòng chọn đơn vị cho ${label.toLowerCase()}.`,
      })
    }
    if (values[valueField] === null && values[unitField] !== null) {
      context.addIssue({
        code: 'custom',
        path: [valueField],
        message: `Vui lòng nhập ${label.toLowerCase()}.`,
      })
    }
  }
}

export const zoneSchema = z
  .object({
    zoneCode: z
      .string()
      .trim()
      .min(1, 'Mã khu vực là bắt buộc.')
      .max(50, 'Mã khu vực tối đa 50 ký tự.'),
    zoneName: z
      .string()
      .trim()
      .min(1, 'Tên khu vực là bắt buộc.')
      .max(255, 'Tên khu vực tối đa 255 ký tự.'),
    createReceivingPoint: z.boolean().optional(),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự.'),
    ...physicalDetailsShape,
  })
  .transform(normalizeOptionalDimensions)
  .superRefine(validatePhysicalDetails)

const optionalCapacitySchema = z
  .number({ error: 'Giới hạn số lượng phải là số.' })
  .positive('Giới hạn số lượng phải lớn hơn 0.')
  .lt(1_000_000_000_000, 'Sức chứa tối đa phải nhỏ hơn 1.000.000.000.000.')
  .refine((value) => {
    const [coefficient = '', exponent = '0'] = value.toString().split('e')
    return (coefficient.split('.')[1]?.length ?? 0) - Number(exponent) <= 6
  }, 'Sức chứa tối đa có tối đa 6 chữ số thập phân.')
  .nullable()

const capacityShape = {
  capacityType: z.enum(['None', 'Quantity']),
  capacity: optionalCapacitySchema,
  // Tenant reference IDs are .NET GUIDs, not necessarily RFC-versioned UUIDs.
  capacityUnitId: z
    .guid('Đơn vị sức chứa không hợp lệ.')
    .refine((id) => id !== '00000000-0000-0000-0000-000000000000', 'Đơn vị sức chứa không hợp lệ.')
    .nullable(),
}

function validateCapacity(
  values: z.infer<z.ZodObject<typeof capacityShape>>,
  context: z.RefinementCtx
) {
  if (values.capacityType === 'Quantity') {
    if (values.capacity === null)
      context.addIssue({
        code: 'custom',
        path: ['capacity'],
        message: 'Vui lòng nhập sức chứa tối đa.',
      })
    if (values.capacityUnitId === null)
      context.addIssue({
        code: 'custom',
        path: ['capacityUnitId'],
        message: 'Vui lòng chọn đơn vị sức chứa.',
      })
  } else {
    if (values.capacity !== null)
      context.addIssue({
        code: 'custom',
        path: ['capacity'],
        message: 'Không nhập sức chứa khi không giới hạn.',
      })
    if (values.capacityUnitId !== null)
      context.addIssue({
        code: 'custom',
        path: ['capacityUnitId'],
        message: 'Không chọn đơn vị khi không giới hạn.',
      })
  }
}

export const rackSchema = z
  .object({
    rackCode: z.string().trim().min(1, 'Mã kệ là bắt buộc.').max(50, 'Mã kệ tối đa 50 ký tự.'),
    rackName: z.string().trim().min(1, 'Tên kệ là bắt buộc.').max(255, 'Tên kệ tối đa 255 ký tự.'),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự.'),
    storageMode: z.enum(['RackLevel', 'SlotLevel']),
    allowsMixedProducts: z.boolean(),
    ...capacityShape,
    expectedRowVersion: z.string().optional(),
    ...physicalDetailsShape,
  })
  .transform(normalizeOptionalDimensions)
  .superRefine((values, context) => {
    validatePhysicalDetails(values, context)
    validateCapacity(values, context)
    if (values.storageMode === 'SlotLevel' && values.capacityType === 'Quantity') {
      context.addIssue({
        code: 'custom',
        path: ['capacity'],
        message: 'Sức chứa được cấu hình tại từng vị trí lưu trữ, không phải kệ chứa vị trí.',
      })
    }
  })

export const rackNameSchema = z.object({
  rackName: z.string().trim().min(1, 'Tên kệ là bắt buộc.').max(255),
})

export const slotSchema = z
  .object({
    slotCode: z
      .string()
      .trim()
      .min(1, 'Mã vị trí là bắt buộc.')
      .max(50, 'Mã vị trí tối đa 50 ký tự.'),
    slotName: z
      .string()
      .trim()
      .min(1, 'Tên vị trí là bắt buộc.')
      .max(255, 'Tên vị trí tối đa 255 ký tự.'),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự.'),
    allowsMixedProducts: z.boolean(),
    ...capacityShape,
    expectedRowVersion: z.string().optional(),
    ...physicalDetailsShape,
  })
  .transform(normalizeOptionalDimensions)
  .superRefine((values, context) => {
    validatePhysicalDetails(values, context)
    validateCapacity(values, context)
  })

export type ZoneFormValues = z.infer<typeof zoneSchema>
export type RackFormValues = z.infer<typeof rackSchema>
export type SlotFormValues = z.infer<typeof slotSchema>
