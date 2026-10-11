'use client'

import {
  Box,
  ChevronRight,
  ChevronsUp,
  Layers3,
  MapPin,
  Rows3,
  Search,
  Square,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  WarehouseLayoutDecorationType,
  WarehouseLayoutEditorScene,
  WarehouseLayoutRackShape,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { PALETTE_DECORATION_OPTIONS, writeLayoutDragData } from './designer-constants'
import type { LayoutPaletteDragData } from './designer-constants'
import { WarehouseUnplacedLocations } from './WarehouseUnplacedLocations'

interface DesignerToolboxProps {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly canConfigure: boolean
  readonly mode?: 'designer' | 'viewer'
  readonly onCreateZone: () => void
  readonly onCreateRack: (shape?: WarehouseLayoutRackShape) => void
  readonly onCreateDecoration: (type: WarehouseLayoutDecorationType, label: string) => void
  readonly onSelect: (selection: WarehouseLayoutSelection) => void
  readonly onSelectUnplaced?: (selection: WarehouseLayoutSelection) => void
}

function RackShapeIcon({ shape }: { readonly shape: WarehouseLayoutRackShape }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      aria-hidden="true"
      className="size-8"
    >
      {shape === 'Standard' ? <rect x="3" y="10" width="26" height="12" fill="white" /> : null}
      {shape === 'Vertical' ? (
        <>
          <rect x="10" y="4" width="12" height="24" fill="white" />
          <path d="M16 5v22" />
        </>
      ) : null}
      {shape === 'CrossBraced' ? (
        <>
          <rect x="5" y="6" width="22" height="20" fill="white" />
          <path d="m7 8 18 16M25 8 7 24" />
        </>
      ) : null}
      {shape === 'Pallet' ? (
        <>
          <rect x="4" y="4" width="24" height="24" fill="#a1a8b3" stroke="none" />
          {[9, 16, 23].flatMap((position) => [
            <path key={`v-${position}`} d={`M${position} 6v20`} stroke="white" strokeWidth="2.4" />,
            <path key={`h-${position}`} d={`M6 ${position}h20`} stroke="white" strokeWidth="2.4" />,
          ])}
        </>
      ) : null}
    </svg>
  )
}

function DecorationPaletteIcon({ type }: { readonly type: WarehouseLayoutDecorationType }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      {type === 'Gate' ? (
        <g {...common}>
          <path d="M4 8v16M28 8v16M4 18h24" />
          <path d="M7 15v6M25 15v6M14 15h4v3h-4z" />
        </g>
      ) : null}
      {type === 'DoubleGate' ? (
        <g {...common}>
          <path d="M4 8v16M28 8v16M4 19l24-7" />
          <path d="M7 16v6M25 10v6M14.5 14.7l4-1.2.5 3-4 1.2z" />
        </g>
      ) : null}
      {type === 'Door' ? (
        <g {...common}>
          <path d="M4 25h24M8 25V7M8 7a18 18 0 0 1 18 18" />
        </g>
      ) : null}
      {type === 'DoubleDoor' ? (
        <g {...common}>
          <path d="M3 25h26M7 25V10M25 25V10M7 10a15 15 0 0 1 15 15M25 10a15 15 0 0 0-15 15" />
        </g>
      ) : null}
      {type === 'Forklift' ? (
        <g {...common} className="text-primary">
          <path d="M7 10h10l3 8H6z" fill="currentColor" fillOpacity="0.18" />
          <path d="M9 10V5M16 10V5M18 19h6V7M24 7h3M24 20h4" />
          <path d="M9 14h7M8 18h10" />
          <circle cx="10" cy="23" r="2.5" fill="currentColor" />
          <circle cx="21" cy="23" r="2.5" fill="currentColor" />
        </g>
      ) : null}
      {type === 'PalletTruck' ? (
        <g {...common} className="text-primary">
          <path d="M11 5h10l2 4v15H9V9z" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 9h8M12 12h8M12 15h8M12 18h8M12 21h8" />
          <path d="M9 8H6v17h20M12 27h8" />
          <circle cx="10" cy="26" r="1.5" fill="currentColor" />
          <circle cx="23" cy="26" r="1.5" fill="currentColor" />
        </g>
      ) : null}
      {type === 'DirectionArrow' ? (
        <g {...common} strokeWidth="2.2">
          <path d="M4 16h22M19 9l7 7-7 7" />
        </g>
      ) : null}
      {type === 'Exit' ? (
        <g {...common} strokeWidth="2">
          <path d="M6 7h12v18H6zM13 16h15M23 11l5 5-5 5" />
        </g>
      ) : null}
    </svg>
  )
}

function PaletteIconAction({
  label,
  disabledReason,
  disabled,
  onClick,
  icon,
  dragData,
}: {
  readonly label: string
  readonly disabledReason: string
  readonly disabled: boolean
  readonly onClick: () => void
  readonly icon: React.ReactNode
  readonly dragData: LayoutPaletteDragData
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="bg-surface-container-low hover:bg-surface-container-high text-foreground hover:border-border focus-visible:ring-ring aspect-square h-auto max-h-16 w-full min-w-0 rounded-lg border border-transparent p-0 transition-colors focus-visible:ring-2 [&_svg]:size-8"
            disabled={disabled}
            draggable={!disabled}
            aria-label={label}
            onDragStart={(event) => writeLayoutDragData(event.dataTransfer, dragData)}
            onClick={onClick}
          >
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabled ? disabledReason : label}</TooltipContent>
    </Tooltip>
  )
}

export function DesignerToolbox({
  scene,
  selection,
  canConfigure,
  mode = 'designer',
  onCreateZone,
  onCreateRack,
  onCreateDecoration,
  onSelect,
  onSelectUnplaced,
}: DesignerToolboxProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const selectedZoneCandidateId =
    selection?.kind === 'zone'
      ? selection.id
      : selection?.kind === 'rack'
        ? scene.racks.find((rack) => rack.id === selection.id)?.zoneId
        : undefined
  const selectedZoneId = scene.zones.find(
    (zone) => zone.id === selectedZoneCandidateId && zone.status === 'Active'
  )?.id
  return (
    <div className="bg-surface-container-lowest flex h-full min-h-0 flex-col overflow-hidden">
      <div className={cn('shrink-0 px-4 py-4', mode === 'viewer' && 'pb-0')}>
        {mode === 'viewer' ? (
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="shrink-0 text-base font-semibold">Danh sách vị trí</h2>
            <InputGroup className="ml-auto max-w-64">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                name="warehouse-layout-location-search"
                autoComplete="off"
                value={searchTerm}
                placeholder="Tìm vị trí…"
                aria-label="Tìm vị trí trên sơ đồ"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </InputGroup>
          </div>
        ) : (
          <h2 className="text-base font-semibold">Chọn biểu tượng</h2>
        )}
        {mode === 'designer' ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Nhấn hoặc kéo thả biểu tượng để thêm vào sơ đồ.
          </p>
        ) : null}
      </div>
      <WarehouseUnplacedLocations scene={scene} onSelect={onSelectUnplaced ?? onSelect} />
      {mode === 'designer' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <section aria-labelledby="business-tools-title">
            <h3
              id="business-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Khu vực lưu trữ
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <PaletteIconAction
                label="Khu vực"
                disabled={!canConfigure}
                disabledReason="Bạn chỉ có quyền xem sơ đồ."
                onClick={onCreateZone}
                dragData={{ kind: 'zone' }}
                icon={<Square className="size-8" aria-hidden="true" />}
              />
            </div>
          </section>

          <Separator className="my-4" />
          <section aria-labelledby="rack-tools-title">
            <h3
              id="rack-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Kệ hàng
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Standard')}
                dragData={{ kind: 'rack', shape: 'Standard' }}
                icon={<RackShapeIcon shape="Standard" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Vertical')}
                dragData={{ kind: 'rack', shape: 'Vertical' }}
                icon={<RackShapeIcon shape="Vertical" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('CrossBraced')}
                dragData={{ kind: 'rack', shape: 'CrossBraced' }}
                icon={<RackShapeIcon shape="CrossBraced" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Pallet')}
                dragData={{ kind: 'rack', shape: 'Pallet' }}
                icon={<RackShapeIcon shape="Pallet" />}
              />
            </div>
          </section>

          <Separator className="my-4" />
          <section aria-labelledby="decoration-tools-title">
            <h3
              id="decoration-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Khác
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE_DECORATION_OPTIONS.map((option) => (
                <PaletteIconAction
                  key={option.type}
                  label={option.label}
                  disabled={!canConfigure}
                  disabledReason="Bạn chỉ có quyền xem sơ đồ."
                  onClick={() => onCreateDecoration(option.type, option.label)}
                  dragData={{ kind: 'decoration', type: option.type, label: option.label }}
                  icon={<DecorationPaletteIcon type={option.type} />}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {mode === 'viewer' ? (
        <section
          aria-labelledby="scene-outline-title"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <SceneOutlineTree
            scene={scene}
            selection={selection}
            mode={mode}
            query={searchTerm}
            title="Cấu trúc vị trí"
            showDecorations={false}
            onSelect={onSelect}
          />
        </section>
      ) : null}
    </div>
  )
}

type OutlineIdUpdater = (id: string, open: boolean) => void

function SceneOutlineTree({
  scene: sourceScene,
  selection,
  mode,
  query,
  title,
  showDecorations,
  onSelect,
}: Pick<DesignerToolboxProps, 'scene' | 'selection' | 'onSelect' | 'mode'> & {
  readonly query: string
  readonly title: string
  readonly showDecorations: boolean
}) {
  const scene = useMemo(() => filterOutlineScene(sourceScene, query), [query, sourceScene])
  const [openZoneIds, setOpenZoneIds] = useState<ReadonlySet<string>>(() => new Set())
  const [openRackIds, setOpenRackIds] = useState<ReadonlySet<string>>(() => new Set())
  const [isDecorationGroupOpen, setIsDecorationGroupOpen] = useState(false)
  const [isUnclassifiedGroupOpen, setIsUnclassifiedGroupOpen] = useState(false)

  const zoneIds = useMemo(() => new Set(scene.zones.map((zone) => zone.id)), [scene.zones])
  const rackIds = useMemo(() => new Set(scene.racks.map((rack) => rack.id)), [scene.racks])
  const racksByZoneId = useMemo(() => groupBy(scene.racks, (rack) => rack.zoneId), [scene.racks])
  const slotsByRackId = useMemo(() => groupBy(scene.slots, (slot) => slot.rackId), [scene.slots])
  const orphanRacks = useMemo(
    () => scene.racks.filter((rack) => !zoneIds.has(rack.zoneId)),
    [scene.racks, zoneIds]
  )
  const orphanSlots = useMemo(
    () => scene.slots.filter((slot) => !rackIds.has(slot.rackId)),
    [rackIds, scene.slots]
  )

  const selectedPath = getSelectedPath(scene, selection, zoneIds, rackIds)
  const hasQuery = Boolean(query.trim())
  const isZoneOpen = (zoneId: string) =>
    hasQuery || openZoneIds.has(zoneId) || selectedPath.zoneId === zoneId
  const isRackOpen = (rackId: string) =>
    hasQuery || openRackIds.has(rackId) || selectedPath.rackId === rackId
  const decorationGroupOpen = isDecorationGroupOpen || selection?.kind === 'decoration'
  const unclassifiedGroupOpen = isUnclassifiedGroupOpen || selectedPath.isUnclassified
  const hasManuallyExpandedGroup =
    openZoneIds.size > 0 || openRackIds.size > 0 || isDecorationGroupOpen || isUnclassifiedGroupOpen

  const updateZoneOpen: OutlineIdUpdater = (zoneId, open) =>
    setOpenZoneIds((current) => updateIdSet(current, zoneId, open))
  const updateRackOpen: OutlineIdUpdater = (rackId, open) =>
    setOpenRackIds((current) => updateIdSet(current, rackId, open))

  function collapseAll() {
    setOpenZoneIds(new Set())
    setOpenRackIds(new Set())
    setIsDecorationGroupOpen(false)
    setIsUnclassifiedGroupOpen(false)
  }

  const totalCount =
    scene.zones.length +
    scene.racks.length +
    scene.slots.length +
    (showDecorations ? scene.decorations.length : 0)

  return (
    <>
      <div className="bg-surface-container-lowest flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <h3 id="scene-outline-title" className="text-muted-foreground text-[11px] font-medium">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <Badge variant="outline">{totalCount}</Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={!hasManuallyExpandedGroup}
                  aria-label="Thu gọn tất cả"
                  onClick={collapseAll}
                >
                  <ChevronsUp aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {hasManuallyExpandedGroup
                ? 'Thu gọn tất cả'
                : selection
                  ? 'Nhánh đang chọn luôn được mở'
                  : 'Các nhóm đang được thu gọn'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" type="always">
        <div className="px-2 pb-3">
          {totalCount === 0 ? (
            <p className="text-muted-foreground py-3 text-center text-[11px]">
              {query.trim() ? 'Không tìm thấy vị trí phù hợp.' : 'Sơ đồ chưa có đối tượng.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {scene.zones.map((zone) => {
                const racks = racksByZoneId.get(zone.id) ?? []
                return (
                  <ZoneTreeItem
                    key={zone.id}
                    zone={zone}
                    racks={racks}
                    slotsByRackId={slotsByRackId}
                    selection={selection}
                    hasStock={
                      mode === 'viewer' &&
                      scene.slots.some(
                        (slot) => slot.zoneId === zone.id && slot.currentOccupancy > 0
                      )
                    }
                    isOpen={isZoneOpen(zone.id)}
                    isRackOpen={isRackOpen}
                    onOpenChange={(open) => updateZoneOpen(zone.id, open)}
                    onRackOpenChange={updateRackOpen}
                    onSelect={onSelect}
                  />
                )
              })}

              {showDecorations && scene.decorations.length > 0 ? (
                <OutlineGroup
                  label="Khu chức năng"
                  count={scene.decorations.length}
                  icon={<Box aria-hidden="true" />}
                  open={decorationGroupOpen}
                  onOpenChange={setIsDecorationGroupOpen}
                >
                  {scene.decorations.map((decoration) => (
                    <li key={decoration.clientKey}>
                      <OutlineButton
                        label={decoration.label}
                        detail="Khu chức năng"
                        selected={
                          selection?.kind === 'decoration' && selection.id === decoration.clientKey
                        }
                        icon={<Box aria-hidden="true" />}
                        onClick={() => onSelect({ kind: 'decoration', id: decoration.clientKey })}
                      />
                    </li>
                  ))}
                </OutlineGroup>
              ) : null}

              {orphanRacks.length > 0 || orphanSlots.length > 0 ? (
                <OutlineGroup
                  label="Chưa phân loại"
                  count={orphanRacks.length + orphanSlots.length}
                  icon={<TriangleAlert aria-hidden="true" />}
                  open={unclassifiedGroupOpen}
                  onOpenChange={setIsUnclassifiedGroupOpen}
                >
                  {orphanRacks.map((rack) => (
                    <RackTreeItem
                      key={rack.id}
                      rack={rack}
                      slots={slotsByRackId.get(rack.id) ?? []}
                      selection={selection}
                      hasStock={(slotsByRackId.get(rack.id) ?? []).some(
                        (slot) => slot.currentOccupancy > 0
                      )}
                      isOpen={isRackOpen(rack.id)}
                      onOpenChange={(open) => updateRackOpen(rack.id, open)}
                      onSelect={onSelect}
                    />
                  ))}
                  {orphanSlots.map((slot) => (
                    <li key={slot.id}>
                      <OutlineButton
                        label={slot.slotCode}
                        detail="Không tìm thấy kệ hàng"
                        selected={selection?.kind === 'slot' && selection.id === slot.id}
                        hasStock={slot.currentOccupancy > 0}
                        icon={<MapPin aria-hidden="true" />}
                        onClick={() => onSelect({ kind: 'slot', id: slot.id })}
                      />
                    </li>
                  ))}
                </OutlineGroup>
              ) : null}
            </ul>
          )}
        </div>
      </ScrollArea>
    </>
  )
}

function ZoneTreeItem({
  zone,
  racks,
  slotsByRackId,
  selection,
  hasStock,
  isOpen,
  isRackOpen,
  onOpenChange,
  onRackOpenChange,
  onSelect,
}: {
  readonly zone: WarehouseLayoutEditorScene['zones'][number]
  readonly racks: WarehouseLayoutEditorScene['racks']
  readonly slotsByRackId: ReadonlyMap<string, WarehouseLayoutEditorScene['slots']>
  readonly selection: WarehouseLayoutSelection | null
  readonly hasStock: boolean
  readonly isOpen: boolean
  readonly isRackOpen: (rackId: string) => boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRackOpenChange: OutlineIdUpdater
  readonly onSelect: DesignerToolboxProps['onSelect']
}) {
  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle
            open={isOpen}
            disabled={racks.length === 0}
            label={`${isOpen ? 'Thu gọn' : 'Mở'} khu vực ${zone.zoneCode}`}
          />
          <OutlineButton
            label={zone.zoneCode}
            detail={zone.zoneName}
            count={racks.length}
            selected={selection?.kind === 'zone' && selection.id === zone.id}
            hasStock={hasStock}
            icon={<Layers3 aria-hidden="true" />}
            onClick={() => onSelect({ kind: 'zone', id: zone.id })}
          />
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {racks.map((rack) => (
              <RackTreeItem
                key={rack.id}
                rack={rack}
                slots={slotsByRackId.get(rack.id) ?? []}
                selection={selection}
                hasStock={(slotsByRackId.get(rack.id) ?? []).some(
                  (slot) => slot.currentOccupancy > 0
                )}
                isOpen={isRackOpen(rack.id)}
                onOpenChange={(open) => onRackOpenChange(rack.id, open)}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function RackTreeItem({
  rack,
  slots,
  selection,
  hasStock,
  isOpen,
  onOpenChange,
  onSelect,
}: {
  readonly rack: WarehouseLayoutEditorScene['racks'][number]
  readonly slots: WarehouseLayoutEditorScene['slots']
  readonly selection: WarehouseLayoutSelection | null
  readonly hasStock: boolean
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSelect: DesignerToolboxProps['onSelect']
}) {
  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle
            open={isOpen}
            disabled={slots.length === 0}
            label={`${isOpen ? 'Thu gọn' : 'Mở'} kệ hàng ${rack.rackCode}`}
          />
          <OutlineButton
            label={rack.rackCode}
            detail={rack.status === 'Active' ? rack.rackName : 'Ngừng hoạt động'}
            count={slots.length}
            selected={selection?.kind === 'rack' && selection.id === rack.id}
            hasStock={hasStock}
            icon={<Rows3 aria-hidden="true" />}
            onClick={() => onSelect({ kind: 'rack', id: rack.id })}
          />
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {slots.map((slot) => (
              <li key={slot.id}>
                <OutlineButton
                  label={slot.slotCode}
                  detail="Vị trí lưu trữ"
                  selected={selection?.kind === 'slot' && selection.id === slot.id}
                  hasStock={slot.currentOccupancy > 0}
                  icon={<MapPin aria-hidden="true" />}
                  onClick={() => onSelect({ kind: 'slot', id: slot.id })}
                />
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function OutlineGroup({
  label,
  count,
  icon,
  open,
  onOpenChange,
  children,
}: {
  readonly label: string
  readonly count: number
  readonly icon: React.ReactNode
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly children: React.ReactNode
}) {
  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle open={open} label={`${open ? 'Thu gọn' : 'Mở'} ${label.toLowerCase()}`} />
          <div className="text-foreground flex min-h-8 min-w-0 flex-1 items-center gap-2 px-2 text-xs font-medium">
            {icon}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <Badge variant="outline">{count}</Badge>
          </div>
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {children}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function OutlineToggle({
  open,
  label,
  disabled = false,
}: {
  readonly open: boolean
  readonly label: string
  readonly disabled?: boolean
}) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="shrink-0"
        disabled={disabled}
        aria-label={label}
      >
        <ChevronRight
          aria-hidden="true"
          className={
            open
              ? 'rotate-90 transition-transform motion-reduce:transition-none'
              : 'transition-transform motion-reduce:transition-none'
          }
        />
      </Button>
    </CollapsibleTrigger>
  )
}

function getSelectedPath(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection | null,
  zoneIds: ReadonlySet<string>,
  rackIds: ReadonlySet<string>
) {
  if (!selection) return { zoneId: null, rackId: null, isUnclassified: false }
  if (selection.kind === 'zone') {
    return { zoneId: selection.id, rackId: null, isUnclassified: false }
  }
  if (selection.kind === 'rack') {
    const rack = scene.racks.find((candidate) => candidate.id === selection.id)
    return {
      zoneId: rack?.zoneId ?? null,
      rackId: selection.id,
      isUnclassified: Boolean(rack && !zoneIds.has(rack.zoneId)),
    }
  }
  if (selection.kind === 'slot') {
    const slot = scene.slots.find((candidate) => candidate.id === selection.id)
    const rack = slot ? scene.racks.find((candidate) => candidate.id === slot.rackId) : undefined
    return {
      zoneId: rack?.zoneId ?? null,
      rackId: rack?.id ?? null,
      isUnclassified: Boolean(
        slot && (!rackIds.has(slot.rackId) || (rack && !zoneIds.has(rack.zoneId)))
      ),
    }
  }
  return { zoneId: null, rackId: null, isUnclassified: false }
}

function filterOutlineScene(scene: WarehouseLayoutEditorScene, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('vi')
  if (!normalizedQuery) return scene
  const includesQuery = (...values: Array<string | null | undefined>) =>
    values.some((value) => value?.toLocaleLowerCase('vi').includes(normalizedQuery))

  const matchingSlotIds = new Set(
    scene.slots
      .filter((slot) => includesQuery(slot.slotCode, slot.slotName, slot.description))
      .map((slot) => slot.id)
  )
  const matchingZoneSelfIds = new Set(
    scene.zones.filter((zone) => includesQuery(zone.zoneCode, zone.zoneName)).map((zone) => zone.id)
  )
  const matchingRackIds = new Set(
    scene.racks
      .filter(
        (rack) =>
          matchingZoneSelfIds.has(rack.zoneId) ||
          includesQuery(rack.rackCode, rack.rackName, rack.description) ||
          scene.slots.some((slot) => slot.rackId === rack.id && matchingSlotIds.has(slot.id))
      )
      .map((rack) => rack.id)
  )
  const matchingZoneIds = new Set(
    scene.zones
      .filter(
        (zone) =>
          matchingZoneSelfIds.has(zone.id) ||
          scene.racks.some((rack) => rack.zoneId === zone.id && matchingRackIds.has(rack.id))
      )
      .map((zone) => zone.id)
  )

  return {
    ...scene,
    zones: scene.zones.filter((zone) => matchingZoneIds.has(zone.id)),
    racks: scene.racks.filter((rack) => matchingRackIds.has(rack.id)),
    slots: scene.slots.filter(
      (slot) => matchingSlotIds.has(slot.id) || matchingRackIds.has(slot.rackId)
    ),
    decorations: scene.decorations.filter((decoration) =>
      includesQuery(decoration.label, decoration.type)
    ),
  }
}

function groupBy<T>(items: readonly T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>()
  items.forEach((item) => {
    const key = getKey(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  })
  return groups
}

function updateIdSet(current: ReadonlySet<string>, id: string, open: boolean) {
  const next = new Set(current)
  if (open) next.add(id)
  else next.delete(id)
  return next
}

function OutlineButton({
  label,
  detail,
  selected,
  hasStock = false,
  icon,
  count,
  onClick,
}: {
  readonly label: string
  readonly detail: string
  readonly selected: boolean
  readonly hasStock?: boolean
  readonly icon: React.ReactNode
  readonly count?: number
  readonly onClick: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) buttonRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-auto w-full min-w-0 justify-start border border-transparent py-1.5 [contain-intrinsic-size:32px] [content-visibility:auto]',
        selected
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : hasStock
            ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
            : 'bg-card text-card-foreground hover:bg-muted'
      )}
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon}
      <span className="min-w-0 text-left">
        <span translate="no" className="block truncate font-mono text-xs">
          {label}
        </span>
        <span
          className={cn(
            'block truncate text-[10px]',
            selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {detail}
        </span>
      </span>
      {count !== undefined ? (
        <span
          className={cn(
            'ml-auto shrink-0 tabular-nums',
            selected ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {count}
        </span>
      ) : null}
    </Button>
  )
}
