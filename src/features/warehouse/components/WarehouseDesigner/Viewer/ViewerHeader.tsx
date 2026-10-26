import Link from 'next/link'
import type { Route } from 'next'
import { HelpCircle, PencilRuler, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_ROUTES } from '@/routes/app-routes'
import type { LayoutHighlight, LayoutMetric } from '../../../utils/layout-rack-metrics'
import { LayoutHighlightFilter, LayoutMetricToggle } from './WarehouseLayoutMetricControls'
import type { WarehouseLayoutPicker } from './types'
import { ViewerIconButton } from './ViewerIconButton'

export function ViewerHeader({
  warehouseId,
  warehouseName,
  title,
  picker,
  metric,
  highlight,
  canConfigure,
  onMetricChange,
  onHighlightChange,
  onEdit,
  onClose,
}: {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly title?: string
  readonly picker?: WarehouseLayoutPicker
  readonly metric: LayoutMetric
  readonly highlight: LayoutHighlight
  readonly canConfigure: boolean
  readonly onMetricChange: (metric: LayoutMetric) => void
  readonly onHighlightChange: (highlight: LayoutHighlight) => void
  readonly onEdit?: () => void
  readonly onClose: () => void
}) {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-5 py-2">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{title ?? `Sơ đồ ${warehouseName}`}</h1>
        {picker ? (
          <p className="text-muted-foreground truncate text-xs">{picker.description}</p>
        ) : null}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        {metric === 'capacity' ? (
          <LayoutHighlightFilter value={highlight} onChange={onHighlightChange} />
        ) : null}
        <LayoutMetricToggle value={metric} onChange={onMetricChange} />
        {canConfigure ? (
          onEdit ? (
            <Button type="button" size="sm" onClick={onEdit}>
              <PencilRuler data-icon="inline-start" aria-hidden="true" />
              Sửa
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link replace href={APP_ROUTES.warehouseLayoutDesigner(warehouseId) as Route}>
                <PencilRuler data-icon="inline-start" aria-hidden="true" />
                Sửa
              </Link>
            </Button>
          )
        ) : null}
      </div>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Trợ giúp">
                <HelpCircle aria-hidden="true" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Trợ giúp</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-72 text-sm">
          <p className="font-medium">Xem sơ đồ kho</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Chọn vị trí trong danh sách hoặc trên sơ đồ để xem hàng hóa và sức chứa. Giữ Ctrl khi
            lăn chuột để phóng to, thu nhỏ hoặc kéo sơ đồ.
          </p>
        </PopoverContent>
      </Popover>
      <ViewerIconButton label="Đóng sơ đồ" onClick={onClose}>
        <X aria-hidden="true" />
      </ViewerIconButton>
    </header>
  )
}
