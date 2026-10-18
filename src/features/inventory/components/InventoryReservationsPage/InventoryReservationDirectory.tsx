'use client'

import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
  readonly productOptions: readonly InventoryFilterOption[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly areFiltersLoading: boolean
  readonly areFiltersError: boolean
  readonly activeFilterCount: number
  readonly onWarehouseChange: (value: string) => void
  readonly onProductChange: (value: string) => void
  readonly onStatusChange: (value: InventoryReservationStatus) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onResetFilters: () => void
  readonly onRetryFilters: () => void
  readonly onRetry: () => void
}

function parseStatus(value: string): InventoryReservationStatus {
  return value === 'Released' || value === 'Consumed' ? value : 'Active'
}

function statusLabel(status: InventoryReservationStatus) {
  if (status === 'Released') return 'Đã giải phóng'
  if (status === 'Consumed') return 'Đã sử dụng'
  return 'Đang giữ'
}

function qualityStatusLabel(status: InventoryReservation['qualityStatus']) {
  if (status === 'Damaged') return 'Hư hỏng'
  if (status === 'Quarantine') return 'Cách ly'
  return 'Đạt chất lượng'
}

export function InventoryReservationDirectory(props: InventoryReservationDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Lịch sử giữ hàng</h1>

      <InventoryWorkspaceNavigation currentView="reservations" permissions={props.permissions} />

      <OperationalListPanel aria-label="Tồn đang giữ">
        <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b p-3">
          <FieldGroup
            aria-label="Bộ lọc giữ hàng"
            className="[container-type:normal] flex min-w-0 flex-1 flex-row flex-wrap items-center gap-3"
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
                <NativeSelectOption value="Active">Đang giữ</NativeSelectOption>
                <NativeSelectOption value="Released">Đã giải phóng</NativeSelectOption>
                <NativeSelectOption value="Consumed">Đã sử dụng</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="reservation-warehouse" className="shrink-0 max-sm:min-w-18">
                Kho
              </FieldLabel>
              <NativeSelect
                className="w-full sm:w-44"
                id="reservation-warehouse"
                value={props.warehouseId}
                disabled={props.areFiltersLoading}
                onChange={(event) => props.onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
                {props.warehouseOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="reservation-product" className="shrink-0 max-sm:min-w-18">
                Sản phẩm
              </FieldLabel>
              <NativeSelect
                className="w-full sm:w-44"
                id="reservation-product"
                value={props.productId}
                disabled={props.areFiltersLoading}
                onChange={(event) => props.onProductChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả sản phẩm</NativeSelectOption>
                {props.productOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {props.areFiltersError ? (
              <Button type="button" variant="outline" onClick={props.onRetryFilters}>
                Tải lại bộ lọc
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={props.activeFilterCount === 0}
              onClick={props.onResetFilters}
            >
              Đặt lại
            </Button>
          </FieldGroup>
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
              className={props.isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
            />
          </Button>
        </div>

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
                        {item.productSku} · {item.warehouseCode} · {item.slotCode}
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
                        {item.referenceType === 'StockIssueRequestLine'
                          ? 'Phiếu xuất đã phát hành'
                          : item.referenceType === 'StockIssuePick'
                            ? 'Lấy hàng xuất kho'
                            : 'Điều chuyển kho'}{' '}
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
                          {item.warehouseCode} · {item.slotCode}
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
                        <p>
                          {item.referenceType === 'StockIssueRequestLine'
                            ? 'Phiếu xuất đã phát hành'
                            : item.referenceType === 'StockIssuePick'
                              ? 'Lấy hàng xuất kho'
                              : 'Điều chuyển kho'}
                        </p>
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
