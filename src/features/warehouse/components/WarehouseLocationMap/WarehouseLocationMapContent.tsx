'use client'

import dynamic from 'next/dynamic'
import { useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { warehouseLayoutSceneQueryOptions } from '../../hooks/use-warehouse-layout-scene'
import { mapWarehouseLayoutScene } from '../../utils/layout-scene-mapper'
import { resolveWarehouseStockLocation } from '../../utils/warehouse-stock-location'
import type { WarehouseCanvasHandle } from '../WarehouseDesigner/Canvas'

const WarehouseCanvas = dynamic(
  () => import('../WarehouseDesigner/Canvas').then((module) => module.WarehouseCanvas),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
)

interface WarehouseLocationMapContentProps {
  readonly warehouseId: string
  readonly slotId: string
  readonly accessScope: string
}

export function WarehouseLocationMapContent({
  warehouseId,
  slotId,
  accessScope,
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
  const canvasRef = useRef<WarehouseCanvasHandle>(null)
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

  return (
    <>
      <div className="shrink-0 space-y-1 border p-3 text-sm" role="status">
        <p className="font-medium break-words">
          {location.zone.zoneCode} → {location.rack.rackCode}
          {location.slot ? ` → ${location.slot.slotCode}` : ' · Vị trí mặc định của kệ'}
        </p>
        <p className="text-muted-foreground text-xs">
          Kệ được đánh dấu trên sơ đồ. Mã ô hiển thị bằng chữ; hãy đối chiếu và quét mã tại vị trí
          khi lấy hàng.
        </p>
      </div>
      {location.placed ? (
        <>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => canvasRef.current?.fitRacks([location.rack.id])}
            >
              Tập trung kệ
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => canvasRef.current?.fit()}
            >
              Toàn kho
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Thu nhỏ sơ đồ"
              onClick={() => canvasRef.current?.zoomOut()}
            >
              −
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Phóng to sơ đồ"
              onClick={() => canvasRef.current?.zoomIn()}
            >
              +
            </Button>
          </div>
          <div
            className="relative min-h-0 flex-1 overflow-hidden border"
            aria-label={`Sơ đồ đánh dấu kệ ${location.rack.rackCode}`}
          >
            <WarehouseCanvas
              ref={canvasRef}
              scene={scene}
              selection={{ kind: 'rack', id: location.rack.id }}
              mode="viewer"
              metric="off"
              canConfigure={false}
              isGridVisible
              onSelect={() => undefined}
              onGeometryChange={() => undefined}
              onZoomChange={() => undefined}
              onPaletteDrop={() => undefined}
            />
          </div>
        </>
      ) : (
        <p role="status" className="border p-4 text-sm">
          Kệ hoặc khu vực chưa được đặt trên sơ đồ. Dùng mã vị trí bên trên để tìm hàng; quản lý kho
          cần cập nhật sơ đồ.
        </p>
      )}
    </>
  )
}
