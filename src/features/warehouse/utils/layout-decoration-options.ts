import type { DecorationOption } from '../types/warehouse-layout-palette.types'
import type { WarehouseLayoutDecorationType } from '../types/warehouse-layout-scene.types'

export const LAYOUT_COLOR_SWATCHES = [
  '#99B9FE',
  '#5B8DEF',
  '#3957B7',
  '#0E7490',
  '#15803D',
  '#475569',
  '#F6C453',
  '#F97316',
  '#DC2626',
  '#9333EA',
  '#0F172A',
  '#E2E8F0',
] as const

export const DECORATION_OPTIONS: DecorationOption[] = [
  { type: 'Door', label: 'Cửa một cánh' },
  { type: 'DoubleDoor', label: 'Cửa hai cánh' },
  { type: 'Forklift', label: 'Xe nâng' },
  { type: 'Gate', label: 'Cổng một cánh' },
  { type: 'DoubleGate', label: 'Cổng hai cánh' },
  { type: 'PalletTruck', label: 'Xe nâng tay' },
  { type: 'DirectionArrow', label: 'Mũi tên chỉ hướng' },
  { type: 'Exit', label: 'Lối ra' },
  { type: 'Aisle', label: 'Lối đi' },
  { type: 'Receiving', label: 'Khu nhận hàng' },
  { type: 'Packing', label: 'Khu đóng gói' },
  { type: 'Picking', label: 'Khu lấy hàng' },
  { type: 'Damaged', label: 'Hàng hư hỏng' },
  { type: 'Office', label: 'Văn phòng' },
  { type: 'Other', label: 'Khu vực khác' },
]

const PALETTE_DECORATION_TYPES = new Set<WarehouseLayoutDecorationType>([
  'Gate',
  'DoubleGate',
  'Door',
  'DoubleDoor',
  'Forklift',
  'PalletTruck',
  'DirectionArrow',
  'Exit',
])

export function isPaletteDecorationType(type: WarehouseLayoutDecorationType): boolean {
  return PALETTE_DECORATION_TYPES.has(type)
}

export const PALETTE_DECORATION_OPTIONS = DECORATION_OPTIONS.filter((option) =>
  isPaletteDecorationType(option.type)
)

export function getDecorationLabel(type: WarehouseLayoutDecorationType): string {
  return DECORATION_OPTIONS.find((option) => option.type === type)?.label ?? type
}
