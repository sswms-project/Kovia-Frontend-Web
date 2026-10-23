import { useState } from 'react'
import { Check, MapPin, ScanBarcode } from 'lucide-react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { OperationalEmptyState } from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { RecordStockPickingFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import {
  formatStockIssueQuantity,
  formatStockIssueUnitQuantity,
} from '../../utils/stock-issue-format'
import { normalizeScanCode, resolveStockPickingScan } from '../../utils/stock-issue-picking'

const SCAN_INPUT_ID = 'stock-issue-pick-scan'

interface RecordStockPickingDialogProps {
  readonly order: StockIssueRequestSummary | null
  readonly form: UseFormReturn<RecordStockPickingFormValues>
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: RecordStockPickingFormValues) => Promise<void>
}

export function RecordStockPickingDialog({
  order,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: RecordStockPickingDialogProps) {
  const lines = useWatch({ control: form.control, name: 'lines' })
  const linesError = form.formState.errors.lines
  const [scanCode, setScanCode] = useState('')
  const [currentSlotCode, setCurrentSlotCode] = useState<string | null>(null)
  const [scanMessage, setScanMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function focusLine(index: number) {
    requestAnimationFrame(() =>
      document
        .getElementById(`stock-issue-pick-line-${index}`)
        ?.scrollIntoView({ block: 'nearest' })
    )
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setScanCode('')
      setCurrentSlotCode(null)
      setScanMessage(null)
    }
    onOpenChange(open)
  }

  function handleScan() {
    const code = scanCode.trim()
    setScanCode('')
    if (!code) return

    const result = resolveStockPickingScan(lines, code, currentSlotCode)
    if (result.kind === 'rejected') {
      setScanMessage({ ok: false, text: result.message })
      return
    }
    focusLine(result.lineIndex)
    if (result.kind === 'shelf') {
      setCurrentSlotCode(result.slotCode)
      setScanMessage({ ok: true, text: `Đang ở vị trí ${result.slotCode}. Quét mã hàng.` })
      return
    }

    const line = lines[result.lineIndex]
    if (!line) return
    form.setValue(`lines.${result.lineIndex}.pickedQuantity`, result.pickedQuantity, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    if (currentSlotCode)
      form.setValue(`lines.${result.lineIndex}.scannedSlotCode`, currentSlotCode, {
        shouldDirty: true,
      })
    // Backend đòi mã đã quét cho mọi dòng của sản phẩm có mã vạch, kể cả dòng nhập số lượng bằng tay.
    lines.forEach((candidate, index) => {
      if (candidate.stockIssueRequestItemId === line.stockIssueRequestItemId)
        form.setValue(`lines.${index}.scannedBarcode`, line.barcode ?? '', { shouldDirty: true })
    })
    setScanMessage({
      ok: true,
      text: `${line.productName} tại ${line.slotPath || line.slotCode || 'vị trí đã giữ'}: ${formatStockIssueQuantity(result.pickedQuantity)}/${formatStockIssueQuantity(line.availableQuantity)}`,
    })
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quét &amp; lấy hàng</DialogTitle>
          <DialogDescription>
            Đi theo thứ tự vị trí bên dưới. Quét mã hàng một lần là điền đủ số lượng của dòng (quét
            thêm mã kệ nếu cần xác nhận đúng vị trí); lấy thiếu thì sửa số trong ô. Hàng đã lấy được
            chuyển ra khu chờ xuất; tồn chỉ giảm khi hàng rời kho.
          </DialogDescription>
        </DialogHeader>
        {order ? (
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="bg-muted/40 shrink-0 border p-3">
              <p className="truncate font-mono text-sm font-medium" translate="no">
                {order.stockIssueRequestCode}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {order.recipientName} · {order.warehouseName}
              </p>
            </div>

            <Field className="shrink-0">
              <FieldLabel htmlFor={SCAN_INPUT_ID}>Quét mã kệ hoặc mã hàng</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <ScanBarcode aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id={SCAN_INPUT_ID}
                  name="stockIssuePickScan"
                  autoFocus
                  autoComplete="off"
                  className="font-mono"
                  placeholder="Quét mã, rồi Enter…"
                  disabled={isPending}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    handleScan()
                  }}
                />
              </InputGroup>
              {currentSlotCode ? (
                <FieldDescription className="flex items-center gap-2">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Đang ở vị trí{' '}
                  <span className="text-foreground font-mono font-medium" translate="no">
                    {currentSlotCode}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentSlotCode(null)}
                  >
                    Bỏ chọn vị trí
                  </Button>
                </FieldDescription>
              ) : null}
              {scanMessage ? (
                <p
                  role="status"
                  className={cn('text-xs', scanMessage.ok ? 'text-primary' : 'text-destructive')}
                >
                  {scanMessage.text}
                </p>
              ) : null}
            </Field>

            {lines.length === 0 ? (
              <OperationalEmptyState
                title="Không còn dòng hàng cần lấy"
                description="Phiếu này đã được lấy đủ hàng."
              />
            ) : (
              <ol className="min-h-0 flex-1 divide-y overflow-y-auto border">
                {lines.map((line, index) => {
                  const lineError = form.formState.errors.lines?.[index]
                  const inputId = `stock-issue-pick-quantity-${index}`
                  const isDone = (line.pickedQuantity || 0) >= line.availableQuantity
                  const isAtCurrentSlot =
                    currentSlotCode !== null &&
                    normalizeScanCode(line.slotCode) === normalizeScanCode(currentSlotCode)

                  return (
                    <li
                      key={`${line.stockIssueRequestItemId}:${line.inventoryStockId}`}
                      id={`stock-issue-pick-line-${index}`}
                      className={cn(
                        'grid grid-cols-[2rem_minmax(0,1fr)_7rem] items-center gap-3 p-3',
                        isAtCurrentSlot && 'bg-primary/5'
                      )}
                    >
                      <span className="text-muted-foreground text-center text-xs tabular-nums">
                        {isDone ? (
                          <Check className="text-primary mx-auto size-4" aria-label="Đã lấy đủ" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                          <span className="font-mono" translate="no">
                            {line.slotPath || line.slotCode || 'Chưa giữ vị trí'}
                          </span>
                          {line.lotNumber ? (
                            <span className="text-muted-foreground text-xs font-normal">
                              Lô{' '}
                              <span className="font-mono" translate="no">
                                {line.lotNumber}
                              </span>
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-sm">{line.productName}</p>
                        {line.directFromReceiving && (
                          <p className="text-primary text-xs font-medium">
                            Đi thẳng từ khu nhận đến khu xuất
                          </p>
                        )}
                        {line.allocationReason && (
                          <p className="text-muted-foreground text-xs">{line.allocationReason}</p>
                        )}
                        <p className="mt-1 text-sm font-medium">
                          Đưa tới: {line.stagingPath || 'Chưa xác định khu xuất'}
                        </p>
                        <Field className="mt-2">
                          <FieldLabel htmlFor={`pick-source-${index}`}>Mã vị trí nguồn</FieldLabel>
                          <Input
                            id={`pick-source-${index}`}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.preventDefault()
                            }}
                            disabled={isPending}
                            maxLength={200}
                            {...form.register(`lines.${index}.scannedSlotCode`)}
                          />
                          <FieldError>{lineError?.scannedSlotCode?.message}</FieldError>
                        </Field>
                        <Field className="mt-2">
                          <FieldLabel htmlFor={`pick-staging-${index}`}>
                            Quét/nhập mã khu chờ xuất đích
                          </FieldLabel>
                          <Input
                            id={`pick-staging-${index}`}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.preventDefault()
                            }}
                            disabled={isPending}
                            maxLength={200}
                            {...form.register(`lines.${index}.scannedStagingSlotCode`)}
                          />
                          <FieldError>{lineError?.scannedStagingSlotCode?.message}</FieldError>
                        </Field>
                        <p className="text-muted-foreground text-xs">
                          <span className="font-mono" translate="no">
                            {line.barcode ?? line.sku}
                          </span>{' '}
                          · Lấy tại đây{' '}
                          {formatStockIssueUnitQuantity(line.availableQuantity, line.unitName)}
                          {line.barcode && !line.scannedBarcode ? ' · Chưa quét mã' : ''}
                        </p>
                        <FieldError
                          errors={
                            lineError?.pickedQuantity
                              ? [lineError.pickedQuantity]
                              : lineError?.inventoryStockId
                                ? [lineError.inventoryStockId]
                                : undefined
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel className="sr-only" htmlFor={inputId}>
                          Số lượng lấy ({line.unitName}) {line.productName} tại{' '}
                          {line.slotPath || line.slotCode}
                        </FieldLabel>
                        <Input
                          id={inputId}
                          type="number"
                          min={0}
                          max={line.availableQuantity}
                          step={line.unitFactor === 1 ? '0.01' : '1'}
                          inputMode="decimal"
                          className="text-right tabular-nums"
                          disabled={isPending || !line.inventoryStockId}
                          aria-invalid={Boolean(lineError)}
                          {...form.register(`lines.${index}.pickedQuantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}

            <FieldError errors={linesError?.root ? [linesError.root] : undefined} />

            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending || lines.length === 0}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Xác nhận lấy hàng
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
