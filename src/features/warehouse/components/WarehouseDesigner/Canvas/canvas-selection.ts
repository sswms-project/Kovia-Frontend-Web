import type { WarehouseLayoutSelection } from '../../../types/warehouse-layout-scene.types'

export function isSelected(
  selection: WarehouseLayoutSelection | null,
  kind: WarehouseLayoutSelection['kind'],
  id: string
) {
  return selection?.kind === kind && selection.id === id
}
