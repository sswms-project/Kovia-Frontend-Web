import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferAllocationMove, TransferAllocationOption } from '../../types/transfer.types'
import {
  buildAllocationMoves,
  deltaOf,
  hasChanges,
  initialTargets,
  maxAllocation,
  minAllocation,
  nonFefoStockIds,
  validateTargets,
  type AllocationTargets,
} from '../../utils/transfer-allocation'

interface AdjustAllocationDialogProps {
  readonly open: boolean
  readonly items: ReadonlyArray<{ id: string; label: string }>
  readonly itemId: string
  readonly options: readonly TransferAllocationOption[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly onSelectItem: (itemId: string) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (moves: TransferAllocationMove[], reason: string) => Promise<boolean>
}

export function AdjustAllocationDialog({
  open,
  items,
  itemId,
  options,
  isLoading,
  isError,
  isPending,
  onSelectItem,
  onOpenChange,
  onSubmit,
}: AdjustAllocationDialogProps) {
  // Số liệu server đổi (sau khi lưu hoặc có người khác chỉnh) thì dựng lại ô nhập từ số mới.
  const editorKey = `${itemId}|${options
    .map(
      (option) => `${option.inventoryStockId}:${option.reservedForItem}:${option.movableQuantity}`
    )
    .join(',')}`
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Điều chỉnh nơi lấy hàng</DialogTitle>
          <DialogDescription>
            Hệ thống đã phân bổ theo FEFO. Đổi sang vị trí hoặc lô khác nếu cần; chỉ chuyển được
            phần chưa lấy, không cần duyệt và được ghi vào nhật ký.
          </DialogDescription>
        </DialogHeader>
        {items.length > 1 ? (
          <Field>
            <FieldLabel htmlFor="allocation-item">Dòng hàng</FieldLabel>
            <NativeSelect
              id="allocation-item"
              className="w-full"
              value={itemId}
              disabled={isPending}
              onChange={(event) => onSelectItem(event.target.value)}
            >
              {items.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : items[0] ? (
          <p className="text-sm font-medium">{items[0].label}</p>
        ) : null}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Đang tải vị trí và lô…</p>
        ) : isError ? (
          <p className="text-destructive text-sm" role="alert">
            Không tải được danh sách vị trí. Hãy đóng hộp thoại rồi mở lại.
          </p>
        ) : options.length === 0 ? (
          <p className="text-sm">Dòng này không còn vị trí nào để điều chỉnh.</p>
        ) : (
          <AllocationEditor
            key={editorKey}
            itemId={itemId}
            options={options}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface AllocationEditorProps {
  readonly itemId: string
  readonly options: readonly TransferAllocationOption[]
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onSubmit: (moves: TransferAllocationMove[], reason: string) => Promise<boolean>
}

function AllocationEditor({
  itemId,
  options,
  isPending,
  onClose,
  onSubmit,
}: AllocationEditorProps) {
  const [targets, setTargets] = useState<AllocationTargets>(() => initialTargets(options))
  // Giữ chuỗi người dùng đang gõ để xóa trắng ô hoặc gõ dở "4." không bị ép về số.
  const [typed, setTyped] = useState<Readonly<Record<string, string>>>({})
  const [reason, setReason] = useState('')
  const changed = hasChanges(options, targets)
  const error = changed ? validateTargets(options, targets) : null
  const nonFefo = nonFefoStockIds(options, targets)
  const canSave = changed && !error && !isPending

  function setTarget(stockId: string, raw: string) {
    setTyped((current) => ({ ...current, [stockId]: raw }))
    setTargets((current) => ({ ...current, [stockId]: raw === '' ? 0 : Number(raw) }))
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSave) void onSubmit(buildAllocationMoves(itemId, options, targets), reason)
      }}
    >
      <div className="max-h-[50vh] overflow-auto border" data-slot="transfer-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vị trí</TableHead>
              <TableHead>Lô / hạn dùng</TableHead>
              <TableHead className="text-right">Đang giữ</TableHead>
              <TableHead className="text-right">Còn trống</TableHead>
              <TableHead className="w-32 text-right">Phân bổ mới</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((option) => {
              const delta = deltaOf(option, targets)
              const picked = minAllocation(option)
              const inputId = `allocation-${option.inventoryStockId}`
              return (
                <TableRow key={option.inventoryStockId}>
                  <TableCell className="font-medium">
                    {option.location}
                    {picked > 0 ? (
                      <span className="text-muted-foreground block text-xs font-normal">
                        Đã lấy {formatQuantity(picked)}, giữ nguyên
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {option.lotNumber ? (
                      <>
                        <span className="font-mono" translate="no">
                          {option.lotNumber}
                        </span>
                        {option.expiryDate ? (
                          <span className="text-muted-foreground block text-xs">
                            HSD {formatOperationalDate(option.expiryDate)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Không theo lô</span>
                    )}
                    {nonFefo.has(option.inventoryStockId) ? (
                      <Badge variant="outline" className="mt-1 block w-fit">
                        Ngoài FEFO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(option.reservedForItem)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(option.availableQuantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <label htmlFor={inputId} className="sr-only">
                      Phân bổ mới tại {option.location}
                    </label>
                    <Input
                      id={inputId}
                      type="number"
                      min={minAllocation(option)}
                      max={maxAllocation(option)}
                      step="0.01"
                      inputMode="decimal"
                      className="ml-auto h-9 w-28 text-right tabular-nums"
                      disabled={
                        isPending || (option.movableQuantity <= 0 && option.availableQuantity <= 0)
                      }
                      value={
                        typed[option.inventoryStockId] ??
                        String(targets[option.inventoryStockId] ?? option.reservedForItem)
                      }
                      onChange={(event) => setTarget(option.inventoryStockId, event.target.value)}
                    />
                    {delta !== 0 ? (
                      <span
                        className={`mt-1 block text-xs tabular-nums ${delta > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {delta > 0 ? '+' : ''}
                        {formatQuantity(delta)}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {nonFefo.size > 0 && !error ? (
        <Alert role="status">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Lấy ngoài FEFO</AlertTitle>
          <AlertDescription>
            Có lô hết hạn sớm hơn vẫn còn hàng. Bạn vẫn lưu được; việc này sẽ được ghi vào nhật ký.
          </AlertDescription>
        </Alert>
      ) : null}
      <Field>
        <FieldLabel htmlFor="allocation-reason">Lý do (không bắt buộc)</FieldLabel>
        <Textarea
          id="allocation-reason"
          rows={2}
          maxLength={500}
          disabled={isPending}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button type="submit" disabled={!canSave}>
          {isPending ? 'Đang lưu…' : 'Lưu phân bổ'}
        </Button>
      </DialogFooter>
    </form>
  )
}
