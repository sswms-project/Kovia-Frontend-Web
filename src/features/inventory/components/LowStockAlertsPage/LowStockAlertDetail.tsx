import Link from 'next/link'
import { X, CheckCheck } from 'lucide-react'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table'
import type { UseQueryResult } from '@tanstack/react-query'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { OperationalLoadingState } from '@/components/operations/OperationalState'
import { LowStockErrorState } from './LowStockErrorState'
import type { LowStockAlert } from '../../types/low-stock-alert.types'
import { LOW_STOCK_NOTICE, lowStockDate, lowStockQuantity } from '../../utils/low-stock-alert'
import { LowStockAlertProduct, LowStockAlertStatus } from './LowStockAlertSummary'
export function LowStockAlertDetail({
  id,
  query,
  permissions,
  onClose,
  onAcknowledge,
  isAcknowledging = false,
}: {
  readonly id: string
  readonly query: UseQueryResult<LowStockAlert, Error>
  readonly permissions: readonly string[]
  readonly onClose: () => void
  readonly onAcknowledge?: () => void
  readonly isAcknowledging?: boolean
}) {
  const item = query.data
  const active = item?.warehouseStatus === 'Active' && item.productStatus === 'Active'
  return (
    <Sheet
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>Chi tiết cảnh báo tồn thấp</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Đóng chi tiết cảnh báo">
                <X aria-hidden="true" />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription>{LOW_STOCK_NOTICE}</SheetDescription>
        </SheetHeader>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pb-4"
          data-scrollbar="slim"
        >
          {query.isPending ? (
            <OperationalLoadingState rows={4} />
          ) : query.isError ? (
            <LowStockErrorState
              title="Không thể mở cảnh báo"
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : item ? (
            <>
              <LowStockAlertProduct item={item} />
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <LowStockAlertStatus status={item.status} />
                {item.status === 'Open' &&
                permissions.includes(P.INVENTORY_VIEW) &&
                onAcknowledge ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onAcknowledge}
                    disabled={isAcknowledging}
                  >
                    <CheckCheck aria-hidden="true" />
                    {isAcknowledging ? 'Đang tiếp nhận…' : 'Tiếp nhận cảnh báo'}
                  </Button>
                ) : null}
              </div>
              <div className="shrink-0 overflow-hidden rounded-md border">
                <Table
                  className="table-fixed text-sm"
                  aria-label="Thông tin chi tiết cảnh báo tồn thấp"
                >
                  <TableBody>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Kho
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {item.warehouseCode ?? '—'} · {item.warehouseName ?? 'Chưa có thông tin'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Tồn ghi nhận
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {lowStockQuantity(item.currentQuantity, item.quantityPrecision)}{' '}
                        {item.unitName ?? '—'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Ngưỡng ghi nhận
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {lowStockQuantity(item.minThreshold, item.quantityPrecision)}{' '}
                        {item.unitName ?? '—'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Ngày phát hiện
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {lowStockDate(item.createdAt)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Ngày tiếp nhận
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {lowStockDate(item.acknowledgedAt, 'Chưa tiếp nhận')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Người tiếp nhận
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {item.acknowledgedByName ??
                          (item.acknowledgedAt ? 'Chưa có thông tin người dùng' : 'Chưa tiếp nhận')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Ngày kết thúc
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {lowStockDate(
                          item.resolvedAt,
                          item.status === 'Resolved' ? 'Chưa có thông tin' : 'Chưa kết thúc'
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <th
                        scope="row"
                        className="bg-muted/40 w-2/5 border-r px-3 py-3 text-left align-top font-medium whitespace-normal"
                      >
                        Ghi nhận kết thúc bởi
                      </th>
                      <TableCell className="break-words whitespace-normal">
                        {item.resolvedByName ?? 'Chưa có thông tin'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-muted-foreground text-xs">
                Đợt có thể kết thúc do tồn hồi phục, thay đổi ngưỡng hoặc ngừng áp dụng chính sách.
                Ngưỡng lưu có thể khác ngưỡng dùng khi kết thúc nếu chính sách đã thay đổi. Người
                ghi nhận kết thúc là người thực hiện nghiệp vụ khiến hệ thống đánh giá lại, không
                phải thao tác đóng thủ công.
              </p>
              {!active ? (
                <p role="note" className="text-muted-foreground text-sm">
                  Liên kết tồn kho và dự báo chỉ hỗ trợ sản phẩm, kho đang hoạt động và có đủ thông
                  tin. Bạn vẫn có thể xem lịch sử cảnh báo tại đây.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {item && !query.isError && !query.isPending ? (
          <SheetFooter>
            {permissions.includes(P.INVENTORY_VIEW) ? (
              <Button asChild={Boolean(active)} variant="outline" disabled={!active}>
                {active ? (
                  <Link
                    href={{
                      pathname: APP_ROUTES.inventory,
                      query: { warehouseId: item.warehouseId, productId: item.productId },
                    }}
                  >
                    Xem tồn kho
                  </Link>
                ) : (
                  'Xem tồn kho'
                )}
              </Button>
            ) : null}
            {permissions.includes(P.INVENTORY_FORECAST_VIEW) ? (
              <Button asChild={Boolean(active)} disabled={!active}>
                {active ? (
                  <Link
                    href={{
                      pathname: APP_ROUTES.reportForecast,
                      query: { warehouseId: item.warehouseId, productId: item.productId },
                    }}
                  >
                    Đi tới dự báo &amp; bổ sung
                  </Link>
                ) : (
                  'Đi tới dự báo & bổ sung'
                )}
              </Button>
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
