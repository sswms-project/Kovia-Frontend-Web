'use client'

import dynamic from 'next/dynamic'
import { Boxes } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLayoutDesignerCompact } from '../../../hooks/use-layout-designer-compact'
import type { WarehouseLayoutSelection } from '../../../types/warehouse-layout-scene.types'
import type { LayoutHighlight, LayoutMetric } from '../../../utils/layout-rack-metrics'
import { getSelectedLocation } from '../../../utils/layout-viewer-location'
import type { WarehouseCanvasHandle } from '../Canvas'
import { WarehouseLayoutPlacementNotice } from '../WarehouseLayoutPlacementNotice'
import { ViewerFooter } from './ViewerFooter'
import { ViewerHeader } from './ViewerHeader'
import { ViewerInventoryPanel } from './ViewerInventoryPanel'
import { ViewerLocationSheet } from './ViewerLocationSheet'
import { ViewerLocationTree } from './ViewerLocationTree'
import { ViewerPickerBar } from './ViewerPickerBar'
import type { WarehouseLayoutViewerWorkspaceProps } from './types'

const WarehouseCanvas = dynamic(
  () => import('../Canvas').then((module) => module.WarehouseCanvas),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full min-h-[28rem] w-full" />,
  }
)

export function WarehouseLayoutViewerWorkspace({
  warehouseId,
  warehouseName,
  title,
  picker,
  inventoryState,
  scene,
  canConfigure,
  isClosing,
  onClose,
  onEdit,
}: WarehouseLayoutViewerWorkspaceProps) {
  const isCompact = useLayoutDesignerCompact()
  const canvasRef = useRef<WarehouseCanvasHandle>(null)
  const { selection, setSelection, setPageNumber, setInventorySearchTerm } = inventoryState
  const [zoomPercent, setZoomPercent] = useState(100)
  const [metric, setMetric] = useState<LayoutMetric>('capacity')
  const [highlight, setHighlight] = useState<LayoutHighlight>('all')
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const selectedLocation = useMemo(() => getSelectedLocation(scene, selection), [scene, selection])

  function handleSelectionChange(nextSelection: WarehouseLayoutSelection | null) {
    setSelection(nextSelection)
    setInventorySearchTerm('')
    setPageNumber(1)
  }

  function handleSelectionWithSheet(nextSelection: WarehouseLayoutSelection | null) {
    handleSelectionChange(nextSelection)
    if (isCompact) setIsLocationSheetOpen(true)
  }

  const tree = (
    <ViewerLocationTree
      scene={scene}
      selection={selection}
      picker={picker}
      onSelect={handleSelectionChange}
      onSelectUnplaced={handleSelectionWithSheet}
    />
  )
  const inventory = (
    <ViewerInventoryPanel
      scene={scene}
      selection={selection}
      selectedLocation={selectedLocation}
      inventoryState={inventoryState}
      canConfigure={canConfigure}
      onEdit={onEdit}
    />
  )
  const canvas = (
    <WarehouseCanvas
      ref={canvasRef}
      scene={scene}
      selection={selection}
      mode="viewer"
      metric={metric}
      highlight={metric === 'capacity' ? highlight : 'all'}
      canConfigure={false}
      isGridVisible
      onSelect={handleSelectionChange}
      onGeometryChange={() => undefined}
      onZoomChange={setZoomPercent}
      onPaletteDrop={() => undefined}
    />
  )
  const pickerState = picker?.evaluate(selection)

  return (
    <section
      className={cn(
        'bg-surface-container-lowest fixed inset-0 z-40 flex min-h-0 min-w-0 flex-col overflow-hidden transition-transform duration-200 ease-in motion-reduce:duration-0',
        isClosing ? 'pointer-events-none translate-y-full' : 'translate-y-0'
      )}
      aria-label={`Sơ đồ ${warehouseName}`}
    >
      <ViewerHeader
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        title={title}
        picker={picker}
        metric={metric}
        highlight={highlight}
        canConfigure={canConfigure}
        onMetricChange={(next) => {
          setMetric(next)
          setHighlight('all')
        }}
        onHighlightChange={setHighlight}
        onEdit={onEdit}
        onClose={onClose}
      />

      <WarehouseLayoutPlacementNotice
        scene={scene}
        onSelect={(nextSelection) => {
          handleSelectionWithSheet(nextSelection)
          canvasRef.current?.revealSelection(nextSelection)
        }}
      />
      <div className="flex min-h-0 flex-1">
        {isCompact ? (
          <div className="relative min-h-0 min-w-0 flex-1">
            {canvas}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute top-3 left-3"
              onClick={() => setIsLocationSheetOpen(true)}
            >
              <Boxes data-icon="inline-start" aria-hidden="true" />
              Vị trí & hàng hóa
            </Button>
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="h-0 min-h-0 min-w-0 flex-1">
            <ResizablePanel defaultSize="30%" minSize="25%" maxSize="40%">
              <aside className="flex h-full min-h-0 min-w-0 flex-col border-r">
                <div className="min-h-0 flex-[4]">{tree}</div>
                <div className="flex min-h-0 min-w-0 flex-[6] overflow-hidden">{inventory}</div>
              </aside>
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Thay đổi chiều rộng danh sách vị trí" />
            <ResizablePanel minSize="55%">
              <div className="relative h-full min-h-0 min-w-0">{canvas}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {picker && pickerState ? (
        <ViewerPickerBar
          picker={picker}
          summary={pickerState.summary}
          canConfirm={pickerState.canConfirm}
          selection={selection}
          onClose={onClose}
        />
      ) : null}

      <ViewerFooter
        metric={metric}
        zoomPercent={zoomPercent}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onFit={() => canvasRef.current?.fit()}
      />

      <ViewerLocationSheet
        open={isLocationSheetOpen}
        onOpenChange={setIsLocationSheetOpen}
        tree={tree}
        inventory={inventory}
      />
    </section>
  )
}
