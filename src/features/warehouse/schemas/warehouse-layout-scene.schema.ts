import { z } from 'zod'
import { MAX_LAYOUT_EXTENT, MIN_LAYOUT_OBJECT_SIZE } from '../utils/layout-grid'

const geometryNumber = z.number().finite().min(0, 'Giá trị không được âm.')

export const warehouseLayoutGeometrySchema = z.object({
  x: geometryNumber,
  y: geometryNumber,
  width: z.number().finite().min(1, 'Chiều rộng tối thiểu là 1.'),
  height: z.number().finite().min(1, 'Chiều cao tối thiểu là 1.'),
  rotation: z.number().finite().min(0).max(359, 'Góc xoay phải nhỏ hơn 360 độ.'),
  zIndex: z.number().int().min(-1000).max(1000),
})

export const warehousePendingPlacementSchema = warehouseLayoutGeometrySchema.extend({
  x: z
    .number({ error: 'Vui lòng nhập vị trí ngang hợp lệ.' })
    .finite()
    .min(0, 'Vị trí không được âm.')
    .max(MAX_LAYOUT_EXTENT),
  y: z
    .number({ error: 'Vui lòng nhập vị trí dọc hợp lệ.' })
    .finite()
    .min(0, 'Vị trí không được âm.')
    .max(MAX_LAYOUT_EXTENT),
  rotation: z
    .number({ error: 'Vui lòng nhập góc xoay hợp lệ.' })
    .finite()
    .min(0, 'Góc xoay từ 0 đến 359 độ.')
    .max(359, 'Góc xoay từ 0 đến 359 độ.'),
  width: z
    .number({ error: 'Vui lòng nhập chiều rộng hợp lệ.' })
    .finite()
    .min(MIN_LAYOUT_OBJECT_SIZE, 'Chiều rộng tối thiểu là 20.')
    .max(MAX_LAYOUT_EXTENT),
  height: z
    .number({ error: 'Vui lòng nhập chiều cao hợp lệ.' })
    .finite()
    .min(MIN_LAYOUT_OBJECT_SIZE, 'Chiều cao tối thiểu là 20.')
    .max(MAX_LAYOUT_EXTENT),
})
export type WarehousePendingPlacementValues = z.infer<typeof warehousePendingPlacementSchema>

export const warehouseLayoutCanvasSchema = z
  .object({
    width: z.number().finite().min(100).max(100000),
    height: z.number().finite().min(100).max(100000),
    gridSize: z.number().finite().min(1).max(1000),
  })
  .refine((canvas) => canvas.gridSize <= Math.min(canvas.width, canvas.height), {
    message: 'Kích thước lưới không được lớn hơn nền.',
    path: ['gridSize'],
  })

export const warehouseLayoutDecorationSchema = warehouseLayoutGeometrySchema.extend({
  label: z.string().trim().min(1, 'Tên đối tượng là bắt buộc.').max(100),
  type: z.enum([
    'Door',
    'DoubleDoor',
    'Aisle',
    'DirectionArrow',
    'Exit',
    'Forklift',
    'Receiving',
    'Packing',
    'Picking',
    'Damaged',
    'Office',
    'Other',
    'Gate',
    'DoubleGate',
    'PalletTruck',
  ]),
})

export type WarehouseLayoutGeometryFormValues = z.infer<typeof warehouseLayoutGeometrySchema>
export type WarehouseLayoutCanvasFormValues = z.infer<typeof warehouseLayoutCanvasSchema>
export type WarehouseLayoutDecorationFormValues = z.infer<typeof warehouseLayoutDecorationSchema>
