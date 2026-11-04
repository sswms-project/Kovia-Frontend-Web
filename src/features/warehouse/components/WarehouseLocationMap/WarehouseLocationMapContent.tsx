'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLayoutViewerInventory } from '../../hooks/use-layout-viewer-inventory'
import { warehouseLayoutSceneQueryOptions } from '../../hooks/use-warehouse-layout-scene'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { mapWarehouseLayoutScene } from '../../utils/layout-scene-mapper'
import { resolveWarehouseStockLocation } from '../../utils/warehouse-stock-location'
import { WarehouseLayoutViewerWorkspace } from '../WarehouseDesigner'

interface WarehouseLocationMapContentProps {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly slotId: string
  readonly accessScope: string
  readonly onClose: () => void
}

export function WarehouseLocationMapContent({
  warehouseId,
  warehouseName,
  slotId,
  accessScope,
  onClose,
}: WarehouseLocationMapContentProps) {
  const options = warehouseLayoutSceneQueryOptions(warehouseId)
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, 'stock-locator', accessScope],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  })
  const location = query.data
    ? resolveWarehouseStockLocation(query.data, warehouseId, slotId)
    : null
  const scene = useMemo(
    () => (query.data ? mapWarehouseLayoutScene(query.data).editorScene : null),
    [query.data]
  )

  if (query.isFetching)
    return (
      <div role="status" className="min-h-0 flex-1">
        <span>Đang tải sơ đồ mới nhất…</span>
        <Skeleton className="mt-3 h-4/5 w-full" />
      </div>
    )
  if (query.isError || !query.data)
    return (
      <div role="alert" className="grid gap-3 border p-4">
        <p>
          {query.error?.statusCode === 403
            ? 'Bạn không có quyền xem sơ đồ kho này.'
            : 'Không tải được sơ đồ kho. Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.'}
        </p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  if (!location || !scene)
    return (
      <p role="status" className="border p-4">
        Không tìm thấy vị trí đang hoạt động trên sơ đồ hiện tại. Đóng sơ đồ và tải lại dữ liệu
        nguồn trước khi tiếp tục.
      </p>
    )

  const selection: WarehouseLayoutSelection =
    location.slot && location.slot.slotCode !== '__SYSTEM_DEFAULT__'
      ? { kind: 'slot', id: location.slot.id }
      : { kind: 'rack', id: location.rack.id }

  return (
    <StockLocationViewer
      warehouseId={warehouseId}
      warehouseName={warehouseName}
      scene={scene}
      selection={selection}
      rackId={location.placed ? location.rack.id : undefined}
      onClose={onClose}
    />
  )
}

function StockLocationViewer({
  warehouseId,
  warehouseName,
  scene,
  selection,
  rackId,
  onClose,
}: {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection
  readonly rackId?: string
  readonly onClose: () => void
}) {
  const inventoryState = useLayoutViewerInventory(warehouseId, selection)
  return (
    <WarehouseLayoutViewerWorkspace
      warehouseId={warehouseId}
      warehouseName={warehouseName}
      inventoryState={inventoryState}
      scene={scene}
      initialFocusRackId={rackId}
      canConfigure={false}
      isClosing={false}
      onClose={onClose}
    />
  )
}
