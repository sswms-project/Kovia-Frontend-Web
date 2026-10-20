'use client'

import {
  Barcode,
  Boxes,
  Layers3,
  ListFilter,
  MapPin,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { formatStorageCapacity } from '../../utils/storage-capacity'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { APP_ROUTES } from '@/routes/app-routes'
import type { ZoneResponse } from '@/types/warehouse'
import type { LocationFilterState, LocationSearchResponse } from '../../types/warehouse.types'

interface WarehouseLocationDirectoryProps {
  readonly warehouseId: string
  readonly locations: readonly LocationSearchResponse[]
  readonly zones: readonly ZoneResponse[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly filters: LocationFilterState
  readonly activeFilterCount: number
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly isFilterMetadataLoading: boolean
  readonly isFilterMetadataError: boolean
  readonly canGenerateBarcode: boolean
  readonly onSearchTextChange: (value: string) => void
  readonly onFiltersChange: (filters: LocationFilterState) => void
  readonly onApplyFilters: () => void
  readonly onResetFilters: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
  readonly onRetryFilterMetadata: () => void
}

const TYPE_LABELS = { Zone: 'Khu vực', Rack: 'Kệ hàng', Slot: 'Vị trí' } as const
const STATUS_LABELS: Record<string, string> = {
  Active: 'Hoạt động',
  Inactive: 'Ngừng hoạt động',
  Vacant: 'Còn trống',
  Occupied: 'Đang chứa hàng',
  Reserved: 'Đã giữ chỗ',
  Full: 'Đầy',
}

function getLocationIcon(type: LocationSearchResponse['type']) {
  if (type === 'Zone') return Layers3
  if (type === 'Rack') return Boxes
  return MapPin
}

function getParentLabel(location: LocationSearchResponse) {
  if (location.type === 'Zone') return 'Cấp kho'
  if (location.type === 'Rack')
    return location.zoneCode ? `Khu vực ${location.zoneCode}` : 'Chưa có khu vực'
  return [location.zoneCode, location.rackCode].filter(Boolean).join(' / ') || 'Chưa có cấp cha'
}

export function WarehouseLocationDirectory({
  warehouseId,
  locations,
  zones,
  totalCount,
  page,
  pageSize,
  searchText,
  filters,
  activeFilterCount,
  isLoading,
  isFetching,
  isError,
  isFilterMetadataLoading,
  isFilterMetadataError,
  canGenerateBarcode,
  onSearchTextChange,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
  onRetry,
  exportAction,
  onRetryFilterMetadata,
}: WarehouseLocationDirectoryProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const selectedZone = zones.find((zone) => zone.id === filters.zoneId)
  const availableRacks = selectedZone?.racks ?? zones.flatMap((zone) => zone.racks)
  const isParentFilterDisabled =
    zones.length === 0 && (isFilterMetadataLoading || isFilterMetadataError)

  function applyFilters() {
    onApplyFilters()
    setIsFilterOpen(false)
  }

  return (
    <OperationalListPanel aria-label="Danh mục vị trí kho">
      <header className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Danh mục vị trí</h2>
          <p className="text-muted-foreground text-xs">
            Tra cứu khu vực, kệ và vị trí lưu trữ trong cùng một danh sách.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <InputGroup className="min-w-0 flex-1 sm:w-64">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Tìm theo mã hoặc tên vị trí"
              name="locationSearch"
              autoComplete="off"
              spellCheck={false}
              placeholder="Tìm mã vị trí…"
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
            />
          </InputGroup>
          <Button type="button" variant="outline" onClick={() => setIsFilterOpen(true)}>
            <ListFilter data-icon="inline-start" aria-hidden="true" />
            Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          {exportAction}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Tải lại danh mục vị trí"
                onClick={onRetry}
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tải lại</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11" />
          ))}
        </div>
      ) : isError ? (
        <Empty className="min-h-64 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert className="text-destructive" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Không thể tải danh mục vị trí</EmptyTitle>
            <EmptyDescription>
              Vui lòng kiểm tra kết nối hoặc quyền truy cập rồi thử lại.
            </EmptyDescription>
          </EmptyHeader>
          <Button type="button" onClick={onRetry}>
            Thử lại
          </Button>
        </Empty>
      ) : locations.length === 0 ? (
        <Empty className="min-h-64 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy vị trí</EmptyTitle>
            <EmptyDescription>Thử đổi từ khóa hoặc đặt lại bộ lọc hiện tại.</EmptyDescription>
          </EmptyHeader>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Đặt lại bộ lọc
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div data-slot="operational-list-body" className="min-h-0 min-w-0">
            <LocationMobileList
              warehouseId={warehouseId}
              locations={locations}
              canGenerateBarcode={canGenerateBarcode}
            />
            <LocationDesktopTable
              warehouseId={warehouseId}
              locations={locations}
              canGenerateBarcode={canGenerateBarcode}
            />
          </div>
          <OperationalPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            isPending={isFetching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent className="w-full overscroll-contain sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Bộ lọc vị trí</SheetTitle>
            <SheetDescription>Thu hẹp kết quả theo cấp, trạng thái và vị trí cha.</SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 overflow-y-auto p-4">
            {isFilterMetadataError ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Không thể tải cấu trúc kho</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Bộ lọc khu vực và kệ hàng tạm thời chưa khả dụng.</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetryFilterMetadata}>
                    <RefreshCw aria-hidden="true" />
                    Thử tải lại
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <FilterSelect
              id="location-type-filter"
              label="Loại vị trí"
              value={filters.type}
              onChange={(value) => {
                const type = value === 'Zone' || value === 'Rack' || value === 'Slot' ? value : ''
                onFiltersChange({
                  ...filters,
                  type,
                  occupancyStatus: type && type !== 'Slot' ? '' : filters.occupancyStatus,
                })
              }}
            >
              <NativeSelectOption value="">Tất cả</NativeSelectOption>
              <NativeSelectOption value="Zone">Khu vực</NativeSelectOption>
              <NativeSelectOption value="Rack">Kệ hàng</NativeSelectOption>
              <NativeSelectOption value="Slot">Vị trí lưu trữ</NativeSelectOption>
            </FilterSelect>
            <FilterSelect
              id="location-zone-filter"
              label="Khu vực"
              value={filters.zoneId}
              disabled={isParentFilterDisabled}
              onChange={(zoneId) => onFiltersChange({ ...filters, zoneId, rackId: '' })}
            >
              <NativeSelectOption value="">Tất cả khu vực</NativeSelectOption>
              {zones.map((zone) => (
                <NativeSelectOption key={zone.id} value={zone.id}>
                  {zone.zoneCode} - {zone.zoneName}
                </NativeSelectOption>
              ))}
            </FilterSelect>
            <FilterSelect
              id="location-rack-filter"
              label="Kệ hàng"
              value={filters.rackId}
              disabled={isParentFilterDisabled}
              onChange={(rackId) => onFiltersChange({ ...filters, rackId })}
            >
              <NativeSelectOption value="">Tất cả kệ</NativeSelectOption>
              {availableRacks.map((rack) => (
                <NativeSelectOption key={rack.id} value={rack.id}>
                  {rack.rackCode} - {rack.rackName}
                </NativeSelectOption>
              ))}
            </FilterSelect>
            <FilterSelect
              id="location-lifecycle-filter"
              label="Trạng thái hoạt động"
              value={filters.lifecycleStatus}
              onChange={(value) => {
                const lifecycleStatus = value === 'Active' || value === 'Inactive' ? value : ''
                onFiltersChange({ ...filters, lifecycleStatus })
              }}
            >
              <NativeSelectOption value="">Tất cả</NativeSelectOption>
              <NativeSelectOption value="Active">Hoạt động</NativeSelectOption>
              <NativeSelectOption value="Inactive">Ngừng hoạt động</NativeSelectOption>
            </FilterSelect>
            <FilterSelect
              id="location-occupancy-filter"
              label="Tình trạng sức chứa"
              value={filters.occupancyStatus}
              disabled={Boolean(filters.type && filters.type !== 'Slot')}
              onChange={(value) => {
                const occupancyStatus =
                  value === 'Vacant' ||
                  value === 'Occupied' ||
                  value === 'Reserved' ||
                  value === 'Full'
                    ? value
                    : ''
                onFiltersChange({ ...filters, occupancyStatus })
              }}
            >
              <NativeSelectOption value="">Tất cả</NativeSelectOption>
              <NativeSelectOption value="Vacant">Còn trống</NativeSelectOption>
              <NativeSelectOption value="Occupied">Đang chứa hàng</NativeSelectOption>
              <NativeSelectOption value="Reserved">Đã giữ chỗ</NativeSelectOption>
              <NativeSelectOption value="Full">Đầy</NativeSelectOption>
            </FilterSelect>
          </FieldGroup>
          <SheetFooter>
            <Button type="button" onClick={applyFilters}>
              Áp dụng bộ lọc
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Đặt lại
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </OperationalListPanel>
  )
}

interface FilterSelectProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly disabled?: boolean
  readonly children: ReactNode
  readonly onChange: (value: string) => void
}

function FilterSelect({ id, label, value, disabled, children, onChange }: FilterSelectProps) {
  return (
    <Field data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        name={id}
        className="w-full"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </NativeSelect>
    </Field>
  )
}

function LocationMobileList({ warehouseId, locations, canGenerateBarcode }: LocationResultsProps) {
  return (
    <ItemGroup className="gap-0 md:hidden">
      {locations.map((location) => {
        const Icon = getLocationIcon(location.type)
        return (
          <Item key={`${location.type}-${location.id}`} className="border-b last:border-b-0">
            <Icon aria-hidden="true" />
            <ItemContent className="min-w-0">
              <ItemTitle className="flex flex-wrap items-center gap-2">
                <span translate="no" className="font-mono">
                  {location.code}
                </span>
                <Badge variant="outline">{TYPE_LABELS[location.type]}</Badge>
              </ItemTitle>
              <ItemDescription>{location.name ?? getParentLabel(location)}</ItemDescription>
              <ItemDescription>
                {getParentLabel(location)} · {STATUS_LABELS[location.lifecycleStatus]}
              </ItemDescription>
            </ItemContent>
            <BarcodeButton
              warehouseId={warehouseId}
              location={location}
              enabled={canGenerateBarcode && location.lifecycleStatus === 'Active'}
            />
          </Item>
        )
      })}
    </ItemGroup>
  )
}

interface LocationResultsProps {
  readonly warehouseId: string
  readonly locations: readonly LocationSearchResponse[]
  readonly canGenerateBarcode: boolean
}

function LocationDesktopTable({
  warehouseId,
  locations,
  canGenerateBarcode,
}: LocationResultsProps) {
  return (
    <div className="hidden min-w-0 overflow-x-auto md:block">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Mã vị trí</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Tên / cấp cha</TableHead>
            <TableHead>Hoạt động</TableHead>
            <TableHead>Giới hạn số lượng</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={`${location.type}-${location.id}`}>
              <TableCell translate="no" className="font-mono font-medium">
                {location.code}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABELS[location.type]}</Badge>
              </TableCell>
              <TableCell>
                <p>{location.name ?? 'Không có tên riêng'}</p>
                <p className="text-muted-foreground text-xs">{getParentLabel(location)}</p>
              </TableCell>
              <TableCell>{STATUS_LABELS[location.lifecycleStatus]}</TableCell>
              <TableCell className="tabular-nums">
                {location.type !== 'Zone' ? formatStorageCapacity(location) : '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <BarcodeButton
                    warehouseId={warehouseId}
                    location={location}
                    enabled={canGenerateBarcode && location.lifecycleStatus === 'Active'}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function BarcodeButton({
  warehouseId,
  location,
  enabled,
}: {
  readonly warehouseId: string
  readonly location: LocationSearchResponse
  readonly enabled: boolean
}) {
  if (!enabled) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href={
              APP_ROUTES.warehouseLocationBarcode(warehouseId, location.type, location.id) as Route
            }
            aria-label={`Xem barcode ${location.code}`}
          >
            <Barcode aria-hidden="true" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Xem barcode</TooltipContent>
    </Tooltip>
  )
}
