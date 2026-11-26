'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { queryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { lowStockAlertService } from '../services/low-stock-alert.service'
import { isLowStockGuid } from '../utils/low-stock-alert'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { P } from '@/config/permissionCodes'
import { ForecastRunPanel } from '../components/InventoryForecastPage'
import { useForecastWorkspace } from '../hooks/use-forecast-workspace'

type InitialForecast = { readonly initialWarehouseId?: string; readonly initialProductId?: string }
export default function InventoryForecastPage(initial: InitialForecast = {}) {
  const meQuery = useMeQuery()
  if (meQuery.isPending) return <p role="status">Đang kiểm tra quyền truy cập…</p>
  if (meQuery.isError || !meQuery.data?.permissions.includes(P.INVENTORY_FORECAST_VIEW))
    return <p role="alert">Bạn không có quyền xem dự báo tồn kho.</p>
  if (initial.initialWarehouseId || initial.initialProductId) {
    if (
      !initial.initialWarehouseId ||
      !isLowStockGuid(initial.initialWarehouseId) ||
      (initial.initialProductId && !isLowStockGuid(initial.initialProductId))
    )
      return <p role="alert">Tham số kho hoặc sản phẩm không hợp lệ. Không tự chọn dữ liệu khác.</p>
    return <ForecastLinkGate {...initial} permissions={meQuery.data.permissions} />
  }
  return <ForecastWorkspacePage permissions={meQuery.data.permissions} />
}

function ForecastLinkGate({
  initialWarehouseId,
  initialProductId,
  permissions,
}: InitialForecast & { readonly permissions: readonly string[] }) {
  const user = useAuthStore((state) => state.user)
  const params = { selectedWarehouseId: initialWarehouseId, pageNumber: 1, pageSize: 1 }
  const warehouse = useQuery({
    queryKey: queryKeys.inventory.lowStockAlerts(
      `${user?.tenantId}:${user?.id}`,
      'forecast-link-warehouse',
      params
    ),
    queryFn: ({ signal }) => lowStockAlertService.warehouses(params, signal),
    retry: false,
    enabled: permissions.includes(P.INVENTORY_VIEW),
  })
  if (!permissions.includes(P.INVENTORY_VIEW))
    return <p role="alert">Bạn không có quyền mở liên kết cảnh báo tồn thấp.</p>
  if (warehouse.isPending) return <p role="status">Đang kiểm tra kho được liên kết…</p>
  if (
    warehouse.isError ||
    !warehouse.data?.selectedOption ||
    warehouse.data.selectedOption.status !== 'Active'
  )
    return (
      <p role="alert">
        Không thể mở dự báo cho kho đã chọn. Kho không tồn tại, đã ngừng hoạt động hoặc bạn không có
        quyền xem.
      </p>
    )
  return (
    <ForecastWorkspacePage
      permissions={permissions}
      initialWarehouseId={initialWarehouseId}
      initialProductId={initialProductId}
      linkedWarehouse={warehouse.data.selectedOption}
    />
  )
}
function ForecastWorkspacePage({
  permissions,
  initialWarehouseId,
  initialProductId,
  linkedWarehouse,
}: InitialForecast & {
  readonly permissions: readonly string[]
  readonly linkedWarehouse?: { id: string; warehouseCode: string; warehouseName: string }
}) {
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const workspace = useForecastWorkspace({
    warehouseId: initialWarehouseId,
    productId: initialProductId,
  })
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {workspace.targetProductId ? (
        <div
          role="note"
          className="bg-card flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
        >
          <p className="text-sm">
            Đang lọc theo sản phẩm từ cảnh báo tồn thấp. Chọn phiên đã lưu của kho này để xem kết
            quả; nếu không có kết quả, hệ thống không thay bằng sản phẩm khác.
          </p>
          {workspace.runQuery.data &&
          !workspace.runQuery.data.details?.products?.some(
            (item) => item.productId === workspace.targetProductId
          ) ? (
            <p className="text-muted-foreground text-sm">
              Phiên đã chọn không có kết quả cho sản phẩm được liên kết. Hệ thống vẫn giữ bộ lọc
              này.
            </p>
          ) : null}
          <Button variant="outline" size="sm" onClick={workspace.clearTargetProduct}>
            Bỏ lọc sản phẩm liên kết
          </Button>
        </div>
      ) : null}
      <ForecastRunPanel
        workspace={workspace}
        warehouseOptions={[
          ...(linkedWarehouse &&
          !(warehousesQuery.data?.items ?? []).some((item) => item.id === linkedWarehouse.id)
            ? [linkedWarehouse]
            : []),
          ...(warehousesQuery.data?.items ?? []),
        ].map((warehouse) => ({
          value: warehouse.id,
          label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
        }))}
        warehousesLoading={warehousesQuery.isLoading}
        warehousesError={warehousesQuery.isError}
        retryWarehouses={() => void warehousesQuery.refetch()}
        canRun={permissions.includes(P.PRODUCTS_CONFIGURE_POLICY)}
        canReview={
          permissions.includes(P.PRODUCTS_CONFIGURE_POLICY) &&
          permissions.includes(P.INBOUND_REQUESTS_CREATE)
        }
        canViewInbound={
          permissions.includes(P.INBOUND_REQUESTS_VIEW) &&
          permissions.includes(P.INBOUND_REQUESTS_VIEW_DRAFT)
        }
        canCreateTransfer={permissions.includes(P.TRANSFERS_CREATE)}
        canViewReports={permissions.includes(P.REPORTS_VIEW)}
      />
    </div>
  )
}
