import { Check, CircleSlash2, Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import type { LayoutMetric } from '../../../utils/layout-rack-metrics'
import { LayoutMetricLegend } from './WarehouseLayoutMetricControls'
import { ViewerIconButton } from './ViewerIconButton'

export function ViewerFooter({
  metric,
  zoomPercent,
  onZoomOut,
  onZoomIn,
  onFit,
}: {
  readonly metric: LayoutMetric
  readonly zoomPercent: number
  readonly onZoomOut: () => void
  readonly onZoomIn: () => void
  readonly onFit: () => void
}) {
  return (
    <footer className="bg-surface-container-lowest flex min-h-11 shrink-0 items-center border-t px-3 py-1.5">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <LayoutMetricLegend metric={metric} />
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-error-container text-destructive border-destructive inline-flex size-7 items-center justify-center rounded-md border">
            <CircleSlash2 className="size-4" aria-hidden="true" />
          </span>
          Vị trí ngừng sử dụng
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-canvas-selection-fill border-diagram-viewer-selected text-diagram-viewer-selected inline-flex size-7 items-center justify-center rounded-md border">
            <Check className="size-4" aria-hidden="true" />
          </span>
          Vị trí đang chọn
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ViewerIconButton label="Thu nhỏ" onClick={onZoomOut}>
          <ZoomOut aria-hidden="true" />
        </ViewerIconButton>
        <output className="text-muted-foreground w-12 text-center font-mono text-[11px] tabular-nums">
          {zoomPercent}%
        </output>
        <ViewerIconButton label="Phóng to" onClick={onZoomIn}>
          <ZoomIn aria-hidden="true" />
        </ViewerIconButton>
        <ViewerIconButton label="Vừa màn hình" onClick={onFit}>
          <Maximize aria-hidden="true" />
        </ViewerIconButton>
      </div>
    </footer>
  )
}
