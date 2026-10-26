import type {
  WarehouseLayoutDecorationType,
  WarehouseLayoutRackShape,
} from './warehouse-layout-scene.types'

export interface DecorationOption {
  type: WarehouseLayoutDecorationType
  label: string
}

export type LayoutPaletteDragData =
  | { kind: 'zone' }
  | { kind: 'rack'; shape?: WarehouseLayoutRackShape }
  | { kind: 'decoration'; type: WarehouseLayoutDecorationType; label: string }
