import { useState } from 'react'
import { WarehouseLocationMapButton } from '@/features/warehouse/components/WarehouseLocationMap'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RecordStockPickingFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { formatStockIssueUnitQuantity } from '../../utils/stock-issue-format'
import { StockIssuePickEntry } from './StockIssuePickEntry'

interface RecordStockPickingDialogProps {
  readonly canViewMap?: boolean
  readonly mapAccessScope?: string
  readonly order: StockIssueRequestSummary | null
  readonly form: UseFormReturn<RecordStockPickingFormValues>
  readonly isPending: boolean
  readonly isUncertain?: boolean
  readonly needsRefresh?: boolean
  readonly onRefresh?: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: RecordStockPickingFormValues) => Promise<void>
}
export function RecordStockPickingDialog({
  canViewMap = false,
  mapAccessScope = '',
  order,
  form,
  isPending,
  isUncertain = false,
  needsRefresh = false,
  onRefresh,
  onOpenChange,
  onSubmit,
}: RecordStockPickingDialogProps) {
  const lines = useWatch({ control: form.control, name: 'lines' })
  const [selection, setSelection] = useState({ id: order?.id, version: order?.version, index: 0 })
  const selected =
    selection.id === order?.id && selection.version === order?.version ? selection.index : 0
  const [revision, setRevision] = useState(0)
  const [cameraOn, setCameraOn] = useState(false)
  const line = lines[selected]
  const maximum = line
    ? Math.max(
        0,
        Math.min(
          line.availableQuantity,
          line.remainingQuantity -
            lines.reduce(
              (sum, other, index) =>
                index !== selected && other.stockIssueRequestItemId === line.stockIssueRequestItemId
                  ? sum + other.pickedQuantity
                  : sum,
              0
            )
        )
      )
    : 0
  const source = line
    ? order?.items
        .find((item) => item.id === line.stockIssueRequestItemId)
        ?.pickLocations.find((location) => location.inventoryStockId === line.inventoryStockId)
    : undefined
  function close(open: boolean) {
    if (isPending || isUncertain) return
    onOpenChange(open)
  }
  function select(index: number) {
    if (isPending || isUncertain || needsRefresh) return
    setSelection({ id: order?.id, version: order?.version, index })
    setRevision((value) => value + 1)
  }
  function confirmLine(quantity: number, slotCode: string, productCode: string) {
    if (isPending || isUncertain || needsRefresh || !line) return
    lines.forEach((_, index) => form.setValue(`lines.${index}.pickedQuantity`, 0))
    form.setValue(`lines.${selected}.pickedQuantity`, quantity, { shouldDirty: true })
    form.setValue(`lines.${selected}.scannedSlotCode`, slotCode, { shouldDirty: true })
    form.setValue(`lines.${selected}.scannedBarcode`, productCode, { shouldDirty: true })
    form.clearErrors(`lines.${selected}`)
    void form.handleSubmit(onSubmit)()
  }
  return (
    <Dialog open={Boolean(order)} onOpenChange={close}>
      <DialogContent
        showCloseButton={!isPending && !isUncertain}
        className="flex h-dvh max-h-dvh max-w-full flex-col gap-3 sm:h-[92dvh] sm:max-w-6xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Lấy hàng xuất kho · {order?.stockIssueRequestCode}</DialogTitle>
          <DialogDescription>
            {order?.warehouseName} → {order?.recipientName}. Quét vị trí nguồn → mã hàng → số lượng.
            Đưa hàng tới điểm chờ xuất.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)] lg:overflow-hidden">
          <div className="min-w-0 shrink-0 lg:order-last lg:min-h-0 lg:overflow-y-auto">
            {order && line && source ? (
              <WarehouseLocationMapButton
                warehouseId={order.warehouseId}
                warehouseName={order.warehouseName}
                slotId={source.slotId}
                locationLabel={line.slotPath || source.slotCode}
                productLabel={`${line.sku} · ${line.productName}${line.lotNumber ? ` · Lô ${line.lotNumber}` : ''}`}
                canView={canViewMap}
                onOpen={() => setCameraOn(false)}
                accessScope={mapAccessScope}
                sourceVersion={JSON.stringify([
                  order.id,
                  order.version,
                  selected,
                  source.inventoryStockId,
                ])}
                ready={!isPending && !isUncertain && !needsRefresh && !!order.version}
              />
            ) : null}
            {line ? (
              <StockIssuePickEntry
                key={`${order?.version}-${selected}-${revision}`}
                line={line}
                source={source}
                maximum={maximum}
                cameraOn={cameraOn}
                onCameraChange={setCameraOn}
                disabled={
                  isPending ||
                  isUncertain ||
                  needsRefresh ||
                  !source ||
                  !line.destinationStagingSlotId ||
                  maximum <= 0
                }
                onConfirm={confirmLine}
              />
            ) : (
              <p role="status" className="bg-card border p-4 text-sm">
                Không còn dòng cần lấy. Các lượt đã xác nhận đã được lưu vào phiếu.
              </p>
            )}
          </div>
          <OperationalListPanel
            aria-label="Hàng cần lấy"
            className="flex-none lg:order-first lg:flex-1"
          >
            <div
              className="grid content-start divide-y lg:hidden"
              data-slot="operational-list-body"
            >
              {lines.map((item, index) => (
                <article
                  key={`${item.stockIssueRequestItemId}:${item.inventoryStockId}`}
                  className="flex flex-col gap-2 p-3"
                >
                  <p className="text-sm font-medium">
                    {item.sku} · {item.productName}
                  </p>
                  <p className="text-sm break-words">
                    {item.slotPath || 'Chưa giữ vị trí'}
                    {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Còn tại vị trí:{' '}
                    {formatStockIssueUnitQuantity(item.availableQuantity, item.unitName)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={isPending || isUncertain || needsRefresh || !item.inventoryStockId}
                    onClick={() => select(index)}
                  >
                    Lấy hàng
                  </Button>
                </article>
              ))}
            </div>
            <div className="hidden lg:contents">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hàng hóa / Nơi lấy</TableHead>
                    <TableHead>Còn tại vị trí</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((item, index) => (
                    <TableRow
                      key={`${item.stockIssueRequestItemId}:${item.inventoryStockId}`}
                      data-state={selected === index ? 'selected' : undefined}
                    >
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{item.productName}</p>
                        <p className="font-mono text-xs" translate="no">
                          {item.sku}
                        </p>
                        <p className="mt-1 text-xs break-words">
                          {item.slotPath || 'Chưa giữ vị trí'}
                          {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                        </p>
                        {item.directFromReceiving ? (
                          <Badge variant="outline">Đi thẳng từ khu nhận</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-normal tabular-nums">
                        {formatStockIssueUnitQuantity(item.availableQuantity, item.unitName)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            isPending || isUncertain || needsRefresh || !item.inventoryStockId
                          }
                          onClick={() => select(index)}
                        >
                          Lấy hàng
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </OperationalListPanel>
        </div>
        <FieldError>
          {form.formState.errors.lines?.message ||
            form.formState.errors.lines?.root?.message ||
            (form.formState.isSubmitted && !form.formState.isValid
              ? 'Kiểm tra mã nguồn, mã hàng và số lượng của các dòng trước khi lưu.'
              : undefined)}
        </FieldError>
        <DialogFooter className="shrink-0 border-t pt-3 pb-[env(safe-area-inset-bottom)]">
          <p role="status" className="mr-auto text-xs">
            {isPending
              ? 'Đang ghi nhận và tải phần còn lại…'
              : isUncertain
                ? 'Chưa xác định kết quả lưu. Kiểm tra lại cùng thao tác; không sửa hoặc tạo lượt mới.'
                : needsRefresh
                  ? 'Phiếu hoặc nguồn lấy đã thay đổi. Tải lại phiếu trước khi lấy tiếp.'
                  : 'Mỗi lần Xác nhận & tiếp tục được lưu ngay. Lượt chưa xác nhận không được lưu.'}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isUncertain}
            onClick={() => close(false)}
          >
            Đóng
          </Button>
          {needsRefresh ? (
            <Button type="button" disabled={isPending} onClick={onRefresh}>
              Tải lại phiếu
            </Button>
          ) : isUncertain ? (
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void onSubmit(form.getValues())}
            >
              Kiểm tra lại thao tác
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
