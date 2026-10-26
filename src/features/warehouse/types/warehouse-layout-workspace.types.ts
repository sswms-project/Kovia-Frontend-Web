import type { WarehouseLayoutRackShape } from './warehouse-layout-scene.types'

export interface WarehouseLayoutDropPosition {
  readonly x: number
  readonly y: number
  readonly width?: number
  readonly height?: number
  readonly layoutShape?: WarehouseLayoutRackShape
}

export interface WarehouseLayoutCreatedPlacement extends WarehouseLayoutDropPosition {
  readonly kind: 'zone' | 'rack'
  readonly entityId: string
}

export interface LayoutDesignerRackSelection {
  readonly ids: readonly string[]
  readonly referenceId: string | null
  readonly notice?: number
}
