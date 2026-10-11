'use client'

import {
  Barcode,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleOff,
  Edit3,
  Ellipsis,
  MapPinned,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import { cn } from '@/lib/utils'
import type { RackResponse, SlotResponse, ZoneResponse } from '@/types/warehouse'
import {
  buildWarehouseLocationTree,
  filterWarehouseLocationTree,
  flattenExpandedLocationTree,
  getExpandableLocationIds,
  type WarehouseLocationTreeNode,
} from '../WarehouseLocationsPage/location-tree'
import { formatWarehouseStatus } from '../../utils/warehouse-labels'
import { formatStorageCapacity } from '../../utils/storage-capacity'

interface WarehouseLayoutViewProps {
  readonly zones: readonly ZoneResponse[]
  readonly selectedZoneId: string | null
  readonly selectedRackId: string | null
  readonly onSelectZone: (zoneId: string) => void
  readonly onSelectRack: (rackId: string) => void
  readonly onBackToZones: () => void
  readonly onBackToRacks: () => void
  readonly canConfigure: boolean
  readonly canGenerateBarcode: boolean
  readonly isWarehouseActive: boolean
  readonly inventoryItems?: readonly InventoryStock[]
  readonly isInventoryLoading?: boolean
  readonly isInventoryError?: boolean
  readonly onCreateZone: () => void
  readonly onImport?: () => void
  readonly onCreateRack: (zone: ZoneResponse) => void
  readonly onCreateSlot: (rack: RackResponse) => void
  readonly onEditZone: (zone: ZoneResponse) => void
  readonly onEditRack: (zone: ZoneResponse, rack: RackResponse) => void
  readonly onEditSlot: (rack: RackResponse, slot: SlotResponse) => void
  readonly onDeactivateZone: (zone: ZoneResponse) => void
  readonly onDeactivateRack: (zone: ZoneResponse, rack: RackResponse) => void
  readonly onDeactivateSlot: (rack: RackResponse, slot: SlotResponse) => void
  readonly onReactivateZone: (zone: ZoneResponse) => void
  readonly onReactivateRack: (zone: ZoneResponse, rack: RackResponse) => void
  readonly onReactivateSlot: (rack: RackResponse, slot: SlotResponse) => void
  readonly onBarcode: (type: 'Zone' | 'Rack' | 'Slot', locationId: string) => void
}

type LifecycleFilter = '' | 'Active' | 'Inactive'

export function WarehouseLayoutView(props: WarehouseLayoutViewProps) {
  const [searchText, setSearchText] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleFilter>('')
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const tree = useMemo(() => buildWarehouseLocationTree(props.zones), [props.zones])
  const filteredTree = useMemo(
    () => filterWarehouseLocationTree(tree, searchText, lifecycleStatus),
    [lifecycleStatus, searchText, tree]
  )
  const expandableIds = useMemo(() => getExpandableLocationIds(filteredTree), [filteredTree])
  const visibleExpandedIds = searchText.trim() ? expandableIds : expandedIds
  const rows = useMemo(
    () => flattenExpandedLocationTree(filteredTree, visibleExpandedIds),
    [filteredTree, visibleExpandedIds]
  )
  const allExpanded =
    expandableIds.size > 0 && [...expandableIds].every((id) => visibleExpandedIds.has(id))
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleNode(id: string) {
    setPage(1)
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <OperationalListPanel aria-labelledby="locations-title">
      <header className="flex shrink-0 flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-primary text-xs font-medium">Quản lý kho</p>
          <h2 id="locations-title" className="text-lg font-semibold">
            Vị trí vật tư, hàng hóa
          </h2>
          <p className="text-muted-foreground text-xs">
            Cấu trúc Khu vực → Kệ hàng → Vị trí lưu trữ.
          </p>
        </div>
        {props.canConfigure && props.isWarehouseActive ? (
          <div className="flex flex-wrap gap-2">
            {props.onImport ? (
              <Button type="button" variant="outline" onClick={props.onImport}>
                <Upload data-icon="inline-start" aria-hidden="true" />
                Nhập từ tệp
              </Button>
            ) : null}
            <Button type="button" onClick={props.onCreateZone}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Thêm khu vực
            </Button>
          </div>
        ) : null}
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b p-3 md:flex-row md:items-center">
        <InputGroup className="md:max-w-sm">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Tìm vị trí vật tư, hàng hóa"
            placeholder="Tìm mã, tên hoặc mô tả…"
            value={searchText}
            onChange={(event) => {
              setPage(1)
              setSearchText(event.currentTarget.value)
            }}
          />
        </InputGroup>
        <NativeSelect
          aria-label="Lọc trạng thái vị trí"
          className="md:w-44"
          value={lifecycleStatus}
          onChange={(event) => {
            setPage(1)
            setLifecycleStatus(event.currentTarget.value as LifecycleFilter)
          }}
        >
          <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
          <NativeSelectOption value="Active">Đang sử dụng</NativeSelectOption>
          <NativeSelectOption value="Inactive">Ngừng sử dụng</NativeSelectOption>
        </NativeSelect>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={expandableIds.size === 0 || Boolean(searchText.trim())}
              onClick={() => {
                setPage(1)
                setExpandedIds(allExpanded ? new Set() : new Set(expandableIds))
              }}
            >
              {allExpanded ? (
                <ChevronsDownUp data-icon="inline-start" aria-hidden="true" />
              ) : (
                <ChevronsUpDown data-icon="inline-start" aria-hidden="true" />
              )}
              {allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {searchText.trim()
              ? 'Tìm kiếm đang tự mở các nhánh phù hợp.'
              : 'Đổi trạng thái toàn bộ cây.'}
          </TooltipContent>
        </Tooltip>
        <Badge variant="secondary" className="md:ml-auto">
          {rows.length} vị trí đang hiển thị
        </Badge>
      </div>

      {rows.length === 0 ? (
        <div data-slot="operational-list-body" className="flex min-w-0 items-center justify-center">
          <Empty className="min-h-72 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinned aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Không tìm thấy vị trí</EmptyTitle>
              <EmptyDescription>Thử đổi từ khóa hoặc trạng thái đang lọc.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <Table className="min-w-[900px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-card sticky top-0 z-10 w-[16%]">Mã vị trí</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[18%]">Tên vị trí</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[15%]">Thuộc</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[20%]">Mô tả</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[11%]">Sức chứa</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[11%]">Trạng thái</TableHead>
              <TableHead className="bg-card sticky top-0 z-10 w-[9%] text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((node) => (
              <LocationRow
                key={`${node.kind}-${node.id}`}
                node={node}
                expanded={visibleExpandedIds.has(node.id)}
                canConfigure={props.canConfigure && props.isWarehouseActive}
                canGenerateBarcode={props.canGenerateBarcode}
                onToggle={() => toggleNode(node.id)}
                actions={props}
              />
            ))}
          </TableBody>
        </Table>
      )}
      <OperationalPagination
        page={currentPage}
        pageSize={pageSize}
        totalCount={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPage(1)
          setPageSize(nextPageSize)
        }}
      />
    </OperationalListPanel>
  )
}

function LocationRow({
  node,
  expanded,
  canConfigure,
  canGenerateBarcode,
  onToggle,
  actions,
}: {
  readonly node: WarehouseLocationTreeNode
  readonly expanded: boolean
  readonly canConfigure: boolean
  readonly canGenerateBarcode: boolean
  readonly onToggle: () => void
  readonly actions: WarehouseLayoutViewProps
}) {
  const details = getNodeDetails(node)
  const hasChildren = node.children.length > 0
  return (
    <TableRow aria-expanded={hasChildren ? expanded : undefined}>
      <TableCell className="whitespace-normal">
        <div className="flex min-w-0 items-center" style={{ paddingInlineStart: node.depth * 20 }}>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={cn('shrink-0', !hasChildren && 'invisible')}
            disabled={!hasChildren}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} ${details.code}`}
            onClick={onToggle}
          >
            <ChevronRight
              className={cn(
                'transition-transform motion-reduce:transition-none',
                expanded && 'rotate-90'
              )}
              aria-hidden="true"
            />
          </Button>
          <span translate="no" className="font-mono font-medium break-all">
            {details.code}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-medium break-words whitespace-normal">{details.name}</TableCell>
      <TableCell className="break-words whitespace-normal">{details.parent}</TableCell>
      <TableCell className="text-muted-foreground break-words whitespace-normal">
        {details.description || '—'}
      </TableCell>
      <TableCell className="whitespace-normal tabular-nums">{details.capacity}</TableCell>
      <TableCell className="whitespace-normal">
        <Badge variant={details.status === 'Inactive' ? 'destructive' : 'outline'}>
          {formatWarehouseStatus(details.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <RowActions
          node={node}
          active={details.status === 'Active'}
          canConfigure={canConfigure}
          canGenerateBarcode={canGenerateBarcode}
          actions={actions}
        />
      </TableCell>
    </TableRow>
  )
}

function RowActions({
  node,
  active,
  canConfigure,
  canGenerateBarcode,
  actions,
}: {
  readonly node: WarehouseLocationTreeNode
  readonly active: boolean
  readonly canConfigure: boolean
  readonly canGenerateBarcode: boolean
  readonly actions: WarehouseLayoutViewProps
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Mở thao tác vị trí">
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {canConfigure && active && node.kind === 'zone' ? (
            <DropdownMenuItem onSelect={() => actions.onCreateRack(node.zone)}>
              <Plus aria-hidden="true" />
              Thêm kệ
            </DropdownMenuItem>
          ) : null}
          {canConfigure &&
          active &&
          node.kind === 'rack' &&
          node.rack.storageMode === 'SlotLevel' ? (
            <DropdownMenuItem onSelect={() => actions.onCreateSlot(node.rack)}>
              <Plus aria-hidden="true" />
              Thêm vị trí
            </DropdownMenuItem>
          ) : null}
          {canConfigure ? (
            <DropdownMenuItem onSelect={() => editNode(node, actions)}>
              <Edit3 aria-hidden="true" />
              Chỉnh sửa
            </DropdownMenuItem>
          ) : null}
          {canGenerateBarcode && active ? (
            <DropdownMenuItem onSelect={() => actions.onBarcode(toLocationType(node), node.id)}>
              <Barcode aria-hidden="true" />
              Xem barcode
            </DropdownMenuItem>
          ) : null}
          {canConfigure ? (
            <DropdownMenuItem
              variant={active ? 'destructive' : 'default'}
              onSelect={() => changeLifecycle(node, active, actions)}
            >
              {active ? <CircleOff aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              {active ? 'Ngừng sử dụng' : 'Kích hoạt lại'}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getNodeDetails(node: WarehouseLocationTreeNode) {
  if (node.kind === 'zone')
    return {
      code: node.zone.zoneCode,
      name: node.zone.zoneName,
      parent: 'Kho',
      description: node.zone.description,
      capacity: '—',
      status: node.zone.status,
    }
  if (node.kind === 'rack')
    return {
      code: node.rack.rackCode,
      name: node.rack.rackName,
      parent: node.zone.zoneName,
      description: node.rack.description,
      capacity: node.rack.storageMode === 'RackLevel' ? formatStorageCapacity(node.rack) : '—',
      status: node.rack.status,
    }
  return {
    code: node.slot.slotCode,
    name: node.slot.slotName,
    parent: node.rack.rackName,
    description: node.slot.description,
    capacity: formatStorageCapacity(node.slot),
    status: node.slot.isActive ? 'Active' : 'Inactive',
  }
}

function toLocationType(node: WarehouseLocationTreeNode): 'Zone' | 'Rack' | 'Slot' {
  return node.kind === 'zone' ? 'Zone' : node.kind === 'rack' ? 'Rack' : 'Slot'
}
function editNode(node: WarehouseLocationTreeNode, actions: WarehouseLayoutViewProps) {
  if (node.kind === 'zone') actions.onEditZone(node.zone)
  else if (node.kind === 'rack') actions.onEditRack(node.zone, node.rack)
  else actions.onEditSlot(node.rack, node.slot)
}
function changeLifecycle(
  node: WarehouseLocationTreeNode,
  active: boolean,
  actions: WarehouseLayoutViewProps
) {
  if (node.kind === 'zone')
    (active ? actions.onDeactivateZone : actions.onReactivateZone)(node.zone)
  else if (node.kind === 'rack')
    (active ? actions.onDeactivateRack : actions.onReactivateRack)(node.zone, node.rack)
  else (active ? actions.onDeactivateSlot : actions.onReactivateSlot)(node.rack, node.slot)
}
