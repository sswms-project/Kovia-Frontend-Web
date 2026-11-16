'use client'

import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { InventoryProductLookup } from '../../hooks/use-inventory-product-lookup'
import {
  InventoryFilterToolbar,
  InventoryWarehouseFilter,
} from '@/features/inventory/components/InventoryFilterToolbar'

import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import type {
  InventoryFilterOption,
  InventoryReservation,
  InventoryReservationStatus,
} from '../../types/inventory.types'
import {
  formatEligibilityStatus,
  formatInventoryDate,
  formatInventoryQuantity,
  formatInventoryLocation,
} from '../../utils/inventory-format'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'

interface InventoryReservationDirectoryProps {
  readonly permissions: readonly string[]
  readonly items: readonly InventoryReservation[]
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly warehouseId: string
  readonly productId: string
  readonly status: InventoryReservationStatus
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly areFiltersLoading: boolean
  readonly areFiltersError: boolean
  readonly activeFilterCount: number
  readonly onWarehouseChange: (value: string) => void
  readonly productLookup: InventoryProductLookup
  readonly onProductChange: (value: string) => void
  readonly onStatusChange: (value: InventoryReservationStatus) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onResetFilters: () => void
  readonly onRetryFilters: () => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
}

function parseStatus(value: string): InventoryReservationStatus {
  return value === 'Released' || value === 'Consumed' ? value : 'Active'
}

function statusLabel(status: InventoryReservationStatus) {
  if (status === 'Released') return 'Đã giải phóng'
  if (status === 'Consumed') return 'Đã sử dụng'
  return 'Đang giữ cho phiếu'
}

function qualityStatusLabel(status: InventoryReservation['qualityStatus']) {
  if (status === 'Damaged') return 'Hư hỏng'
  if (status === 'Quarantine') return 'Cách ly'
  return 'Đạt chất lượng'
}

const reservationReferenceLabels: Record<InventoryReservation['referenceType'], string> = {
  StockIssueRequestLine: 'Phiếu xuất đã phát hành',
  StockIssuePick: 'Lấy hàng xuất kho',
  StockTransfer: 'Điều chuyển kho',
  SupplierReturnLine: 'Trả hàng NCC',
}

function reservationReferenceLabel(referenceType: InventoryReservation['referenceType']): string {
  return reservationReferenceLabels[referenceType] ?? 'Chứng từ khác'
}

export function InventoryReservationDirectory(props: InventoryReservationDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Lịch sử giữ hàng</h1>

      <InventoryWorkspaceNavigation currentView="reservations" permissions={props.permissions} />

      <OperationalListPanel aria-label="Hàng giữ cho phiếu">
        <InventoryFilterToolbar
          search={
            <LookupCombobox
              {...props.productLookup}
              value={props.productId}
              onChange={(id, option) => {
                props.productLookup.rememberOption(option)
                props.onProductChange(id)
              }}
            />
          }
          warehouse={
            <InventoryWarehouseFilter
              disabled={props.areFiltersLoading}
              value={props.warehouseId}
              onChange={props.onWarehouseChange}
              options={props.warehouseOptions}
            />
          }
          actions={
            <>
              {props.exportAction}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 justify-self-end"
                disabled={props.isFetching}
                aria-label="Làm mới lịch sử giữ hàng"
                onClick={props.onRetry}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={
                    props.isFetching ? 'animate-spin motion-reduce:animate-none' : undefined
                  }
                />
              </Button>
            </>
          }
          appliedFilters={[
            props.status !== 'Active' && {
              label: props.status === 'Released' ? 'Đã giải phóng' : 'Đã sử dụng',
              clear: () => props.onStatusChange('Active'),
            },
          ]}
          onReset={props.onResetFilters}
        >
          <Field orientation="horizontal" className="w-full sm:w-auto">
            <FieldLabel htmlFor="reservation-status" className="shrink-0 max-sm:min-w-18">
              Trạng thái
            </FieldLabel>
            <NativeSelect
              className="w-full sm:w-44"
              id="reservation-status"
              value={props.status}
              onChange={(event) => props.onStatusChange(parseStatus(event.target.value))}
            >
              <NativeSelectOption value="Active">Đang giữ cho phiếu</NativeSelectOption>
              <NativeSelectOption value="Released">Đã giải phóng</NativeSelectOption>
              <NativeSelectOption value="Consumed">Đã sử dụng</NativeSelectOption>
            </NativeSelect>
          </Field>
        </InventoryFilterToolbar>
        {props.areFiltersError && (
          <Button type="button" variant="outline" onClick={props.onRetryFilters}>
            Tải lại bộ lọc
          </Button>
        )}

        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải lịch sử giữ hàng" onRetry={props.onRetry} />
        ) : props.items.length === 0 ? (
          <OperationalEmptyState
            title="Không có dữ liệu phù hợp"
            description="Thử thay đổi bộ lọc."
          />
        ) : (
          <>
            <div data-slot="operational-list-body" className="md:hidden">
              <ItemGroup className="gap-0">
                {props.items.map((item) => (
                  <Item key={item.id} className="border-b last:border-b-0">
                    <ItemContent className="min-w-0">
                      <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words">{item.productName}</span>
                        <Badge variant="outline">{statusLabel(item.status)}</Badge>
                      </ItemTitle>
                      <ItemDescription className="font-mono" translate="no">
                        {item.productSku} · {item.warehouseCode} · {formatInventoryLocation(item)}
                      </ItemDescription>
                      <ItemDescription>
                        Giữ{' '}
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatInventoryQuantity(item.reservedQuantity)}
                        </span>{' '}
                        · {item.lotNumber ?? 'Không theo lô'} ·{' '}
                        {qualityStatusLabel(item.qualityStatus)}
                      </ItemDescription>
                      <ItemDescription>
                        {reservationReferenceLabel(item.referenceType)}
                        {item.referenceType === 'SupplierReturnLine' ? ' ·' : ''}{' '}
                        <span className="font-mono" translate="no">
                          {item.referenceCode || 'Không xác định'}
                        </span>
                      </ItemDescription>
                      <ItemDescription>
                        {item.createdByName || 'Không xác định'} ·{' '}
                        {formatInventoryDate(item.createdAt)}
                        {item.releasedAt ? ` → ${formatInventoryDate(item.releasedAt)}` : ''}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </div>
            <div className="hidden min-h-0 flex-1 overflow-auto md:block">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10">Sản phẩm</TableHead>
                    <TableHead className="sticky top-0 z-10">Kho / Vị trí</TableHead>
                    <TableHead className="sticky top-0 z-10">Lô / Chất lượng</TableHead>
                    <TableHead className="sticky top-0 z-10">Chứng từ</TableHead>
                    <TableHead className="sticky top-0 z-10">Người tạo</TableHead>
                    <TableHead className="sticky top-0 z-10 text-right">Số lượng</TableHead>
                    <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                    <TableHead className="sticky top-0 z-10">Thời điểm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {props.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-muted-foreground font-mono text-xs" translate="no">
                          {item.productSku}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{item.warehouseName}</p>
                        <p className="text-muted-foreground font-mono text-xs" translate="no">
                          {item.warehouseCode} · {formatInventoryLocation(item)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs" translate="no">
                          {item.lotNumber ?? 'Không theo lô'}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {qualityStatusLabel(item.qualityStatus)} ·{' '}
                          {formatEligibilityStatus(item.eligibilityStatus)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{reservationReferenceLabel(item.referenceType)}</p>
                        <p className="text-muted-foreground font-mono text-xs" translate="no">
                          {item.referenceCode || 'Không xác định'}
                        </p>
                      </TableCell>
                      <TableCell>{item.createdByName || 'Không xác định'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatInventoryQuantity(item.reservedQuantity)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{statusLabel(item.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{formatInventoryDate(item.createdAt)}</p>
                        {item.releasedAt ? (
                          <p className="text-muted-foreground">
                            Kết thúc {formatInventoryDate(item.releasedAt)}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isFetching}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      </OperationalListPanel>
    </div>
  )
}
