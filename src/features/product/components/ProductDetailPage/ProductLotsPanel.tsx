'use client'

import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WarehouseResponse } from '@/types/warehouse'
import type { ProductLot, ProductLotImpact, ProductLotStatus } from '../../types/product.types'

interface ProductLotsPanelProps {
  readonly lots: readonly ProductLot[]
  readonly warehouses: readonly WarehouseResponse[]
  readonly warehouseId: string
  readonly status: ProductLotStatus | ''
  readonly onlyAvailable: boolean
  readonly expiresOnOrBefore: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly impact: ProductLotImpact | null
  readonly isImpactLoading: boolean
  readonly isUpdating: boolean
  readonly canBlock: boolean
  readonly canUnlock: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onStatusChange: (value: ProductLotStatus | '') => void
  readonly onOnlyAvailableChange: (value: boolean) => void
  readonly onExpiryChange: (value: string) => void
  readonly onRetry: () => void
  readonly onInspectImpact: (lot: ProductLot) => void
  readonly onBlock: (lot: ProductLot, reason: string) => void
  readonly onUnlock: (lot: ProductLot, reason: string) => void
}

function lotStatusLabel(status: ProductLotStatus) {
  if (status === 'Active') return 'Đang hoạt động'
  if (status === 'Blocked') return 'Đang khóa'
  return 'Đã hết hạn'
}

function parseLotStatus(value: string): ProductLotStatus | '' {
  return value === 'Active' || value === 'Expired' || value === 'Blocked' ? value : ''
}

const lotDateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' })
const lotQuantityFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 })

function formatLotDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : lotDateFormatter.format(date)
}

export function ProductLotsPanel(props: ProductLotsPanelProps) {
  const [actionLot, setActionLot] = useState<ProductLot | null>(null)
  const [reason, setReason] = useState('')
  const isUnlocking = actionLot?.status === 'Blocked'
  const canSubmit = reason.trim().length > 0 && !props.isUpdating

  function closeDialog() {
    if (props.isUpdating) return
    setActionLot(null)
    setReason('')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lô sản phẩm</CardTitle>
          <CardDescription>
            Lô được tạo khi nhận hàng thực tế; ngày sản xuất và hạn sử dụng có thể để trống.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="lot-warehouse-filter">Kho</FieldLabel>
              <NativeSelect
                id="lot-warehouse-filter"
                value={props.warehouseId}
                onChange={(event) => props.onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
                {props.warehouses.map((warehouse) => (
                  <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouseName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="lot-status-filter">Trạng thái</FieldLabel>
              <NativeSelect
                id="lot-status-filter"
                value={props.status}
                onChange={(event) => props.onStatusChange(parseLotStatus(event.target.value))}
              >
                <NativeSelectOption value="">Tất cả</NativeSelectOption>
                <NativeSelectOption value="Active">Đang hoạt động</NativeSelectOption>
                <NativeSelectOption value="Blocked">Đang khóa</NativeSelectOption>
                <NativeSelectOption value="Expired">Đã hết hạn</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="lot-expiry-filter">Hết hạn trước ngày</FieldLabel>
              <Input
                id="lot-expiry-filter"
                type="date"
                value={props.expiresOnOrBefore}
                onChange={(event) => props.onExpiryChange(event.target.value)}
              />
            </Field>
            <Field orientation="horizontal" className="items-end pb-2">
              <Checkbox
                id="lot-available-filter"
                checked={props.onlyAvailable}
                onCheckedChange={(checked) => props.onOnlyAvailableChange(checked === true)}
              />
              <FieldLabel htmlFor="lot-available-filter">Chỉ còn khả dụng</FieldLabel>
            </Field>
          </FieldGroup>

          {props.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : props.isError ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 border text-center">
              <p className="text-sm font-medium">Không thể tải danh sách lô</p>
              <Button type="button" variant="outline" size="sm" onClick={props.onRetry}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Thử lại
              </Button>
            </div>
          ) : props.lots.length === 0 ? (
            <div className="text-muted-foreground flex min-h-40 items-center justify-center border text-sm">
              Chưa có lô phù hợp.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số lô</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>Ngày sản xuất</TableHead>
                  <TableHead>Hạn sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                  <TableHead className="text-right">Đang giữ</TableHead>
                  <TableHead className="text-right">Khả dụng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono">{lot.lotNumber}</TableCell>
                    <TableCell>{lot.supplierName ?? '—'}</TableCell>
                    <TableCell>{formatLotDate(lot.manufacturedDate)}</TableCell>
                    <TableCell>{formatLotDate(lot.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lotStatusLabel(lot.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lotQuantityFormatter.format(lot.quantityOnHand)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lotQuantityFormatter.format(lot.reservedQuantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lotQuantityFormatter.format(lot.availableQuantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => props.onInspectImpact(lot)}
                        >
                          Ảnh hưởng
                        </Button>
                        {lot.status === 'Active' && props.canBlock ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={props.isUpdating}
                            onClick={() => setActionLot(lot)}
                          >
                            Khóa lô
                          </Button>
                        ) : lot.status === 'Blocked' && props.canUnlock ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={props.isUpdating}
                            onClick={() => setActionLot(lot)}
                          >
                            Mở khóa
                          </Button>
                        ) : (
                          '—'
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {props.isImpactLoading ? <Skeleton className="h-24 w-full" /> : null}
          {props.impact ? (
            <section className="bg-muted/30 space-y-3 border p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Lot Impact Summary · {props.impact.lotNumber}
                </h3>
                <p className="text-muted-foreground text-xs">
                  Tồn và đơn đang ảnh hưởng được dùng để quyết định thay lô hoặc tạm dừng giao hàng.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kho</TableHead>
                    <TableHead className="text-right">Tồn</TableHead>
                    <TableHead className="text-right">Đang giữ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {props.impact.warehouses.map((warehouse) => (
                    <TableRow key={warehouse.warehouseId}>
                      <TableCell>{warehouse.warehouseName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lotQuantityFormatter.format(warehouse.quantityOnHand)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lotQuantityFormatter.format(warehouse.reservedQuantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div>
                <p className="text-xs font-semibold">Đơn đang bị ảnh hưởng</p>
                {props.impact.affectedOrders.length === 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">Không có đơn chưa hoàn tất.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs">
                    {props.impact.affectedOrders.map((order) => (
                      <li key={order.outboundOrderId} className="flex flex-wrap gap-x-2">
                        <span className="font-mono">{order.orderCode}</span>
                        <span>{order.status}</span>
                        <span>{order.warehouseName}</span>
                        <span>{lotQuantityFormatter.format(order.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(actionLot)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUnlocking ? 'Mở khóa' : 'Khóa'} lô {actionLot?.lotNumber}?
            </DialogTitle>
            <DialogDescription>
              {isUnlocking
                ? 'Chỉ Chủ doanh nghiệp được mở khóa. Lý do sẽ được lưu vào lịch sử kiểm toán.'
                : 'Lô sẽ bị chặn xuất ở toàn bộ kho. Thao tác được lưu vào lịch sử kiểm toán.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Lý do thao tác lô"
            placeholder="Nhập lý do bắt buộc"
            value={reason}
            maxLength={500}
            disabled={props.isUpdating}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={props.isUpdating}
              onClick={closeDialog}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={isUnlocking ? 'default' : 'destructive'}
              disabled={!canSubmit}
              onClick={() => {
                if (!actionLot) return
                if (isUnlocking) props.onUnlock(actionLot, reason.trim())
                else props.onBlock(actionLot, reason.trim())
                closeDialog()
              }}
            >
              {props.isUpdating ? 'Đang xử lý…' : isUnlocking ? 'Mở khóa lô' : 'Khóa lô'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
