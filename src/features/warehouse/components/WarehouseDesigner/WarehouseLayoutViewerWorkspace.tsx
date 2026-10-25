'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Route } from 'next'
import {
  Boxes,
  Check,
  CircleSlash2,
  HelpCircle,
  MapPin,
  Maximize,
  PencilRuler,
  Search,
  SearchX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getLayoutLocationLabel } from '../../utils/layout-placement'
import { WarehouseLayoutPlacementNotice } from './WarehouseLayoutPlacementNotice'
import { cn } from '@/lib/utils'
import { useInventoryQuery } from '@/features/inventory/hooks/use-inventory'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLayoutDesignerCompact } from '../../hooks/use-layout-designer-compact'
import {
  formatInventoryDateOnly,
  formatInventoryQuantity,
} from '@/features/inventory/utils/inventory-format'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { DesignerToolbox } from './DesignerToolbox'
import { StorageCapacitySummary } from '../WarehouseDetailPage'
import type { WarehouseCanvasHandle } from './WarehouseCanvas'

const WarehouseCanvas = dynamic(
  () => import('./WarehouseCanvas').then((module) => module.WarehouseCanvas),
  { ssr: false, loading: () => <Skeleton className="h-full min-h-[28rem] w-full" /> }
)

/** Dùng sơ đồ kho để chọn một vị trí cho màn khác: thêm thanh xác nhận và gợi ý các ô nên chọn. */
export interface WarehouseLayoutPicker {
  readonly description: string
  readonly quickPicksTitle?: string
  readonly quickPicks?: readonly { readonly slotId: string; readonly label: string }[]
  /** Nội dung tóm tắt ô đang chọn và việc có bấm Chọn được hay không. */
  readonly evaluate: (selection: WarehouseLayoutSelection | null) => {
    readonly summary: React.ReactNode
    readonly canConfirm: boolean
  }
  readonly onConfirm: (selection: WarehouseLayoutSelection) => void
}

interface WarehouseLayoutViewerWorkspaceProps {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly title?: string
  readonly picker?: WarehouseLayoutPicker
  readonly scene: WarehouseLayoutEditorScene
  readonly canConfigure: boolean
  readonly isClosing: boolean
  readonly onClose: () => void
  readonly onEdit?: () => void
}

function ViewerIconButton({
  label,
  onClick,
  children,
}: {
  readonly label: string
  readonly onClick: () => void
  readonly children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function WarehouseLayoutViewerWorkspace({
  warehouseId,
  warehouseName,
  title,
  picker,
  scene,
  canConfigure,
  isClosing,
  onClose,
  onEdit,
}: WarehouseLayoutViewerWorkspaceProps) {
  const isCompact = useLayoutDesignerCompact()
  const canvasRef = useRef<WarehouseCanvasHandle>(null)
  const [selection, setSelection] = useState<WarehouseLayoutSelection | null>(null)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const debouncedInventorySearchTerm = useDebouncedValue(inventorySearchTerm.trim(), 300)
  const selectedLocation = useMemo(() => getSelectedLocation(scene, selection), [scene, selection])
  const inventoryParams = useMemo(() => {
    const base = {
      pageNumber,
      pageSize,
      warehouseId,
      inStockOnly: true,
      ...(debouncedInventorySearchTerm ? { searchTerm: debouncedInventorySearchTerm } : {}),
    }
    if (!selection || selection.kind === 'decoration') return base
    if (selection.kind === 'zone') return { ...base, zoneId: selection.id }
    if (selection.kind === 'rack') return { ...base, rackId: selection.id }
    return { ...base, slotId: selection.id }
  }, [debouncedInventorySearchTerm, pageNumber, pageSize, selection, warehouseId])
  const inventoryQuery = useInventoryQuery(
    inventoryParams,
    Boolean(selection && selection.kind !== 'decoration')
  )

  function handleSelectionChange(nextSelection: WarehouseLayoutSelection | null) {
    setSelection(nextSelection)
    setInventorySearchTerm('')
    setPageNumber(1)
  }

  const toolbox = (
    <DesignerToolbox
      scene={scene}
      selection={selection}
      canConfigure={false}
      mode="viewer"
      onCreateZone={() => undefined}
      onCreateRack={() => undefined}
      onCreateDecoration={() => undefined}
      onSelect={handleSelectionChange}
      onSelectUnplaced={(nextSelection) => {
        handleSelectionChange(nextSelection)
        if (isCompact) setIsLocationSheetOpen(true)
      }}
    />
  )
  const tree = picker?.quickPicks ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">{toolbox}</div>
      <section
        aria-label={picker.quickPicksTitle}
        className="max-h-40 shrink-0 overflow-auto border-t p-2"
      >
        <h3 className="text-muted-foreground px-1 pb-1 text-xs font-medium">
          {picker.quickPicksTitle}
        </h3>
        {picker.quickPicks.length === 0 ? (
          <p className="text-muted-foreground px-1 text-xs">Không có vị trí nào.</p>
        ) : (
          <ul className="grid gap-1">
            {picker.quickPicks.map((location) => (
              <li key={location.slotId}>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-accent flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs',
                    selection?.kind === 'slot' &&
                      selection.id === location.slotId &&
                      'bg-accent font-medium'
                  )}
                  onClick={() => handleSelectionChange({ kind: 'slot', id: location.slotId })}
                >
                  <MapPin aria-hidden="true" className="size-3 shrink-0" />
                  <span className="min-w-0 break-words">{location.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  ) : (
    toolbox
  )
  const pickerState = picker?.evaluate(selection)

  const inventory = (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t"
      aria-labelledby="viewer-inventory-title"
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-2.5">
        <h2 id="viewer-inventory-title" className="shrink-0 text-sm font-semibold">
          Hàng hóa tại vị trí
        </h2>
        <InputGroup className="ml-auto max-w-64">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            name="warehouse-layout-inventory-search"
            autoComplete="off"
            value={inventorySearchTerm}
            placeholder="Tìm hàng hóa…"
            aria-label="Tìm hàng hóa tại vị trí"
            disabled={!selectedLocation}
            onChange={(event) => {
              setInventorySearchTerm(event.target.value)
              setPageNumber(1)
            }}
          />
        </InputGroup>
      </div>
      {selectedLocation ? (
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs">
          <p className="w-full font-medium break-words" aria-label="Đường dẫn vị trí">
            {selection ? getLayoutLocationLabel(scene, selection) : null}
          </p>
          <span>
            Mã vị trí:{' '}
            <strong translate="no" className="font-mono">
              {selectedLocation.code}
            </strong>
          </span>
          <span className="min-w-0">
            Tên vị trí: <strong className="break-words">{selectedLocation.name}</strong>
          </span>
          {selectedLocation.capacity ? (
            <StorageCapacitySummary location={selectedLocation.capacity} />
          ) : null}
          {selectedLocation.pending && canConfigure && onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Cấu hình sức chứa
            </Button>
          ) : null}
        </div>
      ) : null}
      <OperationalListPanel aria-label="Danh sách hàng hóa tại vị trí" className="border-0">
        {!selectedLocation ? (
          <div data-slot="operational-list-body" className="flex items-center justify-center">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {selection?.kind === 'decoration'
                    ? 'Khu chức năng không chứa hàng hóa'
                    : 'Chưa chọn vị trí'}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : inventoryQuery.isPending ||
          (inventoryQuery.isFetching && inventoryQuery.isPlaceholderData) ? (
          <div
            data-slot="operational-list-body"
            className="space-y-2 p-3"
            aria-label="Đang tải hàng hóa"
          >
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : inventoryQuery.isError ? (
          <div
            data-slot="operational-list-body"
            className="text-destructive flex items-center justify-center p-3 text-xs"
            role="alert"
          >
            Không thể tải hàng hóa tại vị trí. Hãy thử chọn lại vị trí.
          </div>
        ) : (inventoryQuery.data?.items.length ?? 0) === 0 ? (
          <div
            data-slot="operational-list-body"
            className="text-muted-foreground flex items-center justify-center p-4 text-center text-xs"
          >
            {debouncedInventorySearchTerm
              ? 'Không tìm thấy hàng hóa phù hợp.'
              : 'Vị trí chưa có hàng hóa.'}
          </div>
        ) : (
          <Table className="min-w-[46rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10">Mã hàng</TableHead>
                <TableHead className="sticky top-0 z-10">Tên hàng</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Tồn thực tế</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Đang giữ</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Khả dụng</TableHead>
                <TableHead className="sticky top-0 z-10">ĐVT</TableHead>
                <TableHead className="sticky top-0 z-10">Số lô</TableHead>
                <TableHead className="sticky top-0 z-10">Hạn dùng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryQuery.data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell translate="no" className="font-mono text-[11px]">
                    {item.sku}
                  </TableCell>
                  <TableCell className="max-w-44 truncate" title={item.productName}>
                    {item.productName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.quantityOnHand)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.reservedQuantity + item.holdQuantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.availableQuantity)}
                  </TableCell>
                  <TableCell>{item.unitName || '—'}</TableCell>
                  <TableCell translate="no">{item.lotNumber || '—'}</TableCell>
                  <TableCell>
                    {item.expiryDate ? formatInventoryDateOnly(item.expiryDate) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {selectedLocation ? (
          <OperationalPagination
            page={pageNumber}
            pageSize={pageSize}
            totalCount={inventoryQuery.data?.totalCount ?? 0}
            isPending={inventoryQuery.isFetching}
            onPageChange={setPageNumber}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPageNumber(1)
            }}
          />
        ) : null}
      </OperationalListPanel>
    </section>
  )

  const canvas = (
    <WarehouseCanvas
      ref={canvasRef}
      scene={scene}
      selection={selection}
      mode="viewer"
      canConfigure={false}
      isGridVisible
      onSelect={handleSelectionChange}
      onGeometryChange={() => undefined}
      onZoomChange={setZoomPercent}
      onPaletteDrop={() => undefined}
    />
  )

  return (
    <section
      className={cn(
        'bg-surface-container-lowest fixed inset-0 z-40 flex min-h-0 min-w-0 flex-col overflow-hidden transition-transform duration-200 ease-in motion-reduce:duration-0',
        isClosing ? 'pointer-events-none translate-y-full' : 'translate-y-0'
      )}
      aria-label={`Sơ đồ ${warehouseName}`}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-5 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{title ?? `Sơ đồ ${warehouseName}`}</h1>
          {picker ? (
            <p className="text-muted-foreground truncate text-xs">{picker.description}</p>
          ) : null}
        </div>
        {canConfigure ? (
          onEdit ? (
            <Button type="button" size="sm" className="ml-auto" onClick={onEdit}>
              <PencilRuler data-icon="inline-start" aria-hidden="true" />
              Sửa
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-auto">
              <Link replace href={APP_ROUTES.warehouseLayoutDesigner(warehouseId) as Route}>
                <PencilRuler data-icon="inline-start" aria-hidden="true" />
                Sửa
              </Link>
            </Button>
          )
        ) : (
          <span className="ml-auto" />
        )}
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

      <WarehouseLayoutPlacementNotice
        scene={scene}
        onSelect={(nextSelection) => {
          handleSelectionChange(nextSelection)
          canvasRef.current?.revealSelection(nextSelection)
          if (isCompact) setIsLocationSheetOpen(true)
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
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <div className="min-w-0 text-sm">{pickerState.summary}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!pickerState.canConfirm || !selection}
              onClick={() => selection && picker.onConfirm(selection)}
            >
              Chọn
            </Button>
          </div>
        </div>
      ) : null}

      <footer className="bg-surface-container-lowest flex min-h-11 shrink-0 items-center border-t px-3 py-1.5">
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-error-container text-destructive border-destructive inline-flex size-7 items-center justify-center rounded-md border">
              <CircleSlash2 className="size-4" aria-hidden="true" />
            </span>
            Vị trí ngừng sử dụng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-canvas-selection-fill inline-flex size-7 items-center justify-center rounded-md border border-[#ff9800] text-[#ff9800]">
              <Check className="size-4" aria-hidden="true" />
            </span>
            Vị trí đang chọn
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ViewerIconButton label="Thu nhỏ" onClick={() => canvasRef.current?.zoomOut()}>
            <ZoomOut aria-hidden="true" />
          </ViewerIconButton>
          <output className="text-muted-foreground w-12 text-center font-mono text-[11px] tabular-nums">
            {zoomPercent}%
          </output>
          <ViewerIconButton label="Phóng to" onClick={() => canvasRef.current?.zoomIn()}>
            <ZoomIn aria-hidden="true" />
          </ViewerIconButton>
          <ViewerIconButton label="Vừa màn hình" onClick={() => canvasRef.current?.fit()}>
            <Maximize aria-hidden="true" />
          </ViewerIconButton>
        </div>
      </footer>

      <Sheet open={isLocationSheetOpen} onOpenChange={setIsLocationSheetOpen}>
        <SheetContent side="left" className="w-[min(92vw,28rem)] gap-0 p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Vị trí và hàng hóa</SheetTitle>
            <SheetDescription>Chọn vị trí và xem hàng hóa trong kho.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col pt-10">
            <div className="min-h-0 flex-[4]">{tree}</div>
            <div className="flex min-h-0 min-w-0 flex-[6] overflow-hidden">{inventory}</div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

function getSelectedLocation(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection | null
) {
  if (!selection || selection.kind === 'decoration') return null
  if (selection.kind === 'zone') {
    const zone = scene.zones.find((item) => item.id === selection.id)
    return zone
      ? { code: zone.zoneCode, name: zone.zoneName, capacity: null, pending: false }
      : null
  }
  if (selection.kind === 'rack') {
    const rack = scene.racks.find((item) => item.id === selection.id)
    return rack
      ? {
          code: rack.rackCode,
          name: rack.rackName,
          capacity: rack.storageMode === 'RackLevel' ? rack : null,
          pending: rack.requiresCapacityConfiguration,
        }
      : null
  }
  const slot = scene.slots.find((item) => item.id === selection.id)
  return slot
    ? {
        code: slot.slotCode,
        name: slot.slotName,
        capacity: slot,
        pending: slot.requiresCapacityConfiguration,
      }
    : null
}
