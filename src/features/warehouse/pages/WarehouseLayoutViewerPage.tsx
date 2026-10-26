'use client'

import type { ComponentProps } from 'react'
import { WarehouseLayoutViewerWorkspace } from '../components/WarehouseDesigner'
import { useLayoutViewerInventory } from '../hooks/use-layout-viewer-inventory'

type WarehouseLayoutViewerPageProps = Omit<
  ComponentProps<typeof WarehouseLayoutViewerWorkspace>,
  'inventoryState'
>

/** Mounted fresh on each switch to view mode, so selection and paging start clean. */
export function WarehouseLayoutViewerPage(props: WarehouseLayoutViewerPageProps) {
  const inventoryState = useLayoutViewerInventory(props.warehouseId)
  return <WarehouseLayoutViewerWorkspace {...props} inventoryState={inventoryState} />
}
