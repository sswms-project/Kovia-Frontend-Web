'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { P } from '@/config/permissionCodes'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalDateRangeFilter } from '@/components/operations/OperationalDateRangeFilter'
import {
  OperationalLoadingState,
  OperationalEmptyState,
} from '@/components/operations/OperationalState'
import { getErrorKind, getApiErrorMessage } from '@/lib/api-error'
import { InventoryWorkspaceNavigation } from '../components/InventoryWorkspaceNavigation'
import { InventoryFilterToolbar, InventorySearch } from '../components/InventoryFilterToolbar'
import {
  LowStockAlertDetail,
  LowStockWarehouseSelect,
  LowStockAlertProduct,
  LowStockAlertStatus,
  LowStockErrorState,
  type LowStockWarehouseFailure,
} from '../components/LowStockAlertsPage'
import { useLowStockAlerts } from '../hooks/use-low-stock-alerts'
import {
  LOW_STOCK_FILTER_LABELS,
  LOW_STOCK_NOTICE,
  lowStockDate,
  lowStockQuantity,
  isLowStockGuid,
} from '../utils/low-stock-alert'
import type { LowStockAlert } from '../types/low-stock-alert.types'
export default function LowStockAlertsPage() {
  const [warehouseFailure, setWarehouseFailure] = useState<LowStockWarehouseFailure | null>(null)
  const workspace = useLowStockAlerts()
  const { filters, list, update, permissions } = workspace
  const sessionError =
    getErrorKind(list.error).kind === 'unauthorized'
      ? list.error
      : getErrorKind(warehouseFailure?.error).kind === 'unauthorized'
        ? warehouseFailure?.error
        : null
  const quantity = (item: LowStockAlert, value: number) =>
    `${lowStockQuantity(value, item.quantityPrecision)} ${item.unitName ?? '—'}`
  const open = (item: LowStockAlert) => (
    <Button
      variant="outline"
      size="sm"
      className="h-11 sm:h-8"
      aria-label={`Xem chi tiết ${item.sku ?? 'sản phẩm'} tại ${item.warehouseName ?? 'kho'}`}
      onClick={() => update({ alertId: item.id }, false)}
    >
      Xem chi tiết
    </Button>
  )
  if (workspace.me.isPending) return <OperationalLoadingState />
  if (workspace.me.isError)
    return (
      <LowStockErrorState
        title="Không thể kiểm tra quyền truy cập"
        error={workspace.me.error}
        onRetry={() => void workspace.me.refetch()}
      />
    )
  if (!permissions.includes(P.INVENTORY_VIEW))
    return <p role="alert">Bạn không có quyền xem cảnh báo tồn thấp.</p>
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4">
      <InventoryWorkspaceNavigation currentView="low-stock-alerts" permissions={permissions} />
      <OperationalListPanel aria-label="Các đợt cảnh báo tồn thấp">
        <header className="shrink-0 border-b px-4 py-3">
          <h1 className="font-semibold">Các đợt cảnh báo tồn thấp</h1>
          <p className="text-muted-foreground mt-1 text-xs">{LOW_STOCK_NOTICE}</p>
        </header>
        <InventoryFilterToolbar
          search={
            <InventorySearch
              value={filters.searchTerm ?? ''}
              onChange={(searchTerm) => update({ searchTerm })}
              placeholder="Tìm SKU hoặc tên sản phẩm…"
            />
          }
          warehouse={
            <LowStockWarehouseSelect
              value={filters.warehouseId ?? ''}
              onChange={(warehouseId) => update({ warehouseId })}
              scope={workspace.scope}
              onFailureChange={setWarehouseFailure}
              enabled={
                workspace.canView &&
                !sessionError &&
                (!filters.warehouseId || isLowStockGuid(filters.warehouseId))
              }
            />
          }
          actions={
            <Button
              variant="outline"
              aria-label="Làm mới cảnh báo"
              disabled={list.isFetching || !workspace.enabled || Boolean(sessionError)}
              onClick={() => {
                void list.refetch()
                if (workspace.alertId) void workspace.detail.refetch()
              }}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          }
          onReset={workspace.reset}
          appliedFilters={[
            filters.statusFilter !== 'All' && {
              label: `Trạng thái: ${LOW_STOCK_FILTER_LABELS[filters.statusFilter] ?? 'Không hợp lệ'}`,
              clear: () => update({ statusFilter: 'All' }),
            },
            Boolean(filters.warehouseId) && {
              label: 'Kho đã chọn',
              clear: () => update({ warehouseId: '' }),
            },
            Boolean(filters.productId) && {
              label: 'Sản phẩm được chọn',
              clear: () => update({ productId: undefined }),
            },
            Boolean(filters.dateFrom || filters.dateTo) && {
              label: `Ngày phát hiện: ${filters.dateFrom ?? '…'} – ${filters.dateTo ?? '…'}`,
              clear: () => update({ dateFrom: undefined, dateTo: undefined }),
            },
          ]}
          inlineFilters={
            <>
              <Field className="w-full sm:w-44">
                <FieldLabel className="sr-only" htmlFor="low-stock-status">
                  Trạng thái
                </FieldLabel>
                <NativeSelect
                  className="w-full [&_select]:h-11 sm:[&_select]:h-8"
                  id="low-stock-status"
                  value={filters.statusFilter}
                  onChange={(event) => update({ statusFilter: event.target.value })}
                >
                  {Object.entries(LOW_STOCK_FILTER_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <OperationalDateRangeFilter
                label="Ngày phát hiện"
                from={filters.dateFrom ?? ''}
                to={filters.dateTo ?? ''}
                onChange={(range) =>
                  update({ dateFrom: range.from || undefined, dateTo: range.to || undefined })
                }
              />
            </>
          }
        />
        {warehouseFailure && !sessionError && !list.isError ? (
          <div
            role="alert"
            className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2 text-sm"
          >
            <span className="text-destructive">
              Không thể tải danh mục kho. {getApiErrorMessage(warehouseFailure.error)}
            </span>
            {!['forbidden', 'notFound'].includes(getErrorKind(warehouseFailure.error).kind) ? (
              <Button variant="outline" size="sm" onClick={warehouseFailure.retry}>
                Thử tải lại kho
              </Button>
            ) : null}
          </div>
        ) : null}
        {list.isFetching && !list.isPending ? (
          <p role="status" className="text-muted-foreground shrink-0 px-4 py-1 text-xs">
            Đang cập nhật kết quả theo bộ lọc…
          </p>
        ) : null}
        {sessionError ? (
          <LowStockErrorState
            title="Không thể tải cảnh báo tồn thấp"
            error={sessionError}
            onRetry={() => void list.refetch()}
          />
        ) : workspace.validationError ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4">
            <p>{workspace.validationError}</p>
            <Button
              variant="outline"
              onClick={() =>
                update({
                  warehouseId: '',
                  productId: undefined,
                  alertId: undefined,
                  searchTerm: undefined,
                  dateFrom: undefined,
                  dateTo: undefined,
                  statusFilter: 'Active',
                  pageSize: 20,
                })
              }
            >
              Bỏ tham số không hợp lệ
            </Button>
          </div>
        ) : list.isPending ? (
          <OperationalLoadingState />
        ) : list.isError ? (
          <LowStockErrorState
            title="Không thể tải cảnh báo tồn thấp"
            error={list.error}
            onRetry={() => void list.refetch()}
          />
        ) : !list.data?.items.length ? (
          <OperationalEmptyState
            title={
              filters.statusFilter === 'Active' &&
              !filters.searchTerm &&
              !filters.productId &&
              !filters.dateFrom &&
              !filters.dateTo
                ? 'Không có cảnh báo tồn thấp chưa kết thúc trong phạm vi đang chọn.'
                : 'Không tìm thấy cảnh báo phù hợp.'
            }
            description="Thử thay đổi bộ lọc hoặc chọn Tất cả trạng thái để xem lịch sử."
          />
        ) : (
          <>
            <div
              data-slot="operational-list-body"
              className="hidden md:block"
              aria-busy={list.isFetching}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Tồn ghi nhận</TableHead>
                    <TableHead title="Ngưỡng lưu trong đợt; có thể khác ngưỡng dùng khi kết thúc.">
                      Ngưỡng ghi nhận
                    </TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày phát hiện</TableHead>
                    <TableHead>Ngày kết thúc</TableHead>
                    <TableHead>
                      <span className="sr-only">Thao tác</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-72 whitespace-normal">
                        <LowStockAlertProduct item={item} />
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal">
                        {item.warehouseName ?? 'Chưa có thông tin kho'}
                        <p className="text-muted-foreground text-xs">{item.warehouseCode ?? '—'}</p>
                      </TableCell>
                      <TableCell>{quantity(item, item.currentQuantity)}</TableCell>
                      <TableCell>{quantity(item, item.minThreshold)}</TableCell>
                      <TableCell>
                        <LowStockAlertStatus status={item.status} />
                      </TableCell>
                      <TableCell>{lowStockDate(item.createdAt)}</TableCell>
                      <TableCell>
                        {lowStockDate(
                          item.resolvedAt,
                          item.status === 'Resolved' ? 'Chưa có thông tin' : 'Chưa kết thúc'
                        )}
                      </TableCell>
                      <TableCell>{open(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div data-slot="operational-list-body" className="flex flex-col gap-3 p-3 md:hidden">
              {list.data.items.map((item) => (
                <article
                  key={item.id}
                  className="bg-card flex flex-col gap-3 rounded-lg border p-3"
                >
                  <LowStockAlertProduct item={item} />
                  <p className="text-sm break-words">
                    {item.warehouseName ?? 'Chưa có thông tin kho'}
                  </p>
                  <LowStockAlertStatus status={item.status} />
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt>Tồn ghi nhận</dt>
                    <dd>{quantity(item, item.currentQuantity)}</dd>
                    <dt>Ngưỡng ghi nhận</dt>
                    <dd>{quantity(item, item.minThreshold)}</dd>
                    <dt>Ngày phát hiện</dt>
                    <dd>{lowStockDate(item.createdAt)}</dd>
                    <dt>Ngày kết thúc</dt>
                    <dd>
                      {lowStockDate(
                        item.resolvedAt,
                        item.status === 'Resolved' ? 'Chưa có thông tin' : 'Chưa kết thúc'
                      )}
                    </dd>
                  </dl>
                  {open(item)}
                </article>
              ))}
            </div>
          </>
        )}
        {list.isSuccess && !workspace.validationError && !sessionError ? (
          <OperationalPagination
            page={filters.pageNumber}
            pageSize={filters.pageSize}
            totalCount={list.data?.totalCount ?? 0}
            isPending={list.isFetching || Boolean(workspace.validationError)}
            onPageChange={(pageNumber) => update({ pageNumber }, false)}
            onPageSizeChange={(pageSize) => update({ pageSize })}
          />
        ) : (
          <footer
            role="status"
            className="text-muted-foreground shrink-0 border-t px-4 py-3 text-sm"
          >
            {list.isPending && !sessionError
              ? 'Đang tải dữ liệu…'
              : 'Chưa có số liệu tổng vì dữ liệu chưa tải thành công.'}
          </footer>
        )}
      </OperationalListPanel>
      {workspace.alertId && !workspace.validationError ? (
        <LowStockAlertDetail
          id={workspace.alertId}
          query={workspace.detail}
          onAcknowledge={() => workspace.acknowledge.mutate(workspace.alertId)}
          isAcknowledging={workspace.acknowledge.isPending}
          permissions={permissions}
          onClose={() => update({ alertId: undefined }, false)}
        />
      ) : null}
    </div>
  )
}
