import { useState } from 'react'
import { Check, MapPin, Plus, ScanBarcode, Trash2 } from 'lucide-react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import type { RecordStockPickingFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { formatStockIssueQuantity } from '../../utils/stock-issue-format'

interface RecordStockPickingDialogProps {
  readonly order: StockIssueRequestSummary | null
  readonly form: UseFormReturn<RecordStockPickingFormValues>
  readonly isPending: boolean
  readonly inventorySearch: string
  readonly onInventorySearchChange: (value: string) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: RecordStockPickingFormValues) => Promise<void>
  readonly inventoryOptions: readonly {
    productId: string
    inventoryStockId: string
    slotId: string
    lotNumber: string | null
    qualityStatus: string
    label: string
    availableQuantity: number
  }[]
}

export function RecordStockPickingDialog({
  order,
  form,
  isPending,
  onOpenChange,
  onSubmit,
  inventoryOptions,
  inventorySearch,
  onInventorySearchChange,
}: RecordStockPickingDialogProps) {
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
  const lines = form.watch('lines')
  const linesError = form.formState.errors.lines
  const [step, setStep] = useState<'scan' | 'allocate'>('scan')
  const scanLines = lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }, position, all) =>
        all.findIndex((c) => c.line.stockIssueRequestItemId === line.stockIssueRequestItemId) ===
        position
    )

  const [scanCounts, setScanCounts] = useState<Record<string, number>>({})
  const [scanCode, setScanCode] = useState('')
  const [shelfCode, setShelfCode] = useState('')
  const [currentShelf, setCurrentShelf] = useState<string | null>(null)
  const [scanMessage, setScanMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const requiresShelf = inventoryOptions.length > 0

  function focusScanInput(id: 'issue-scan-input' | 'issue-scan-shelf' = 'issue-scan-input') {
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  function resetScan() {
    setStep('scan')
    setScanCounts({})
    setScanCode('')
    setShelfCode('')
    setCurrentShelf(null)
    setScanMessage(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetScan()
    onOpenChange(open)
  }

  function normalizeCode(value: string | null | undefined) {
    return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  function sameCode(a: string | null | undefined, b: string) {
    const left = normalizeCode(a)
    return left !== '' && left === normalizeCode(b)
  }

  function handleShelfScan() {
    const code = shelfCode.trim()
    setShelfCode('')
    if (!code) return
    const shelf = inventoryOptions.find((option) => sameCode(option.label, code))
    if (!shelf) {
      setScanMessage({ ok: false, text: `Mã kệ "${code}" không có trong phiếu này.` })
      focusScanInput('issue-scan-shelf')
      return
    }
    setCurrentShelf(shelf.label)
    setScanMessage({ ok: true, text: `Đang ở kệ ${shelf.label}. Quét mã hàng.` })
    focusScanInput()
  }

  function handleScan() {
    const code = scanCode.trim()
    setScanCode('')
    focusScanInput()
    if (!code) return
    const match =
      scanLines.find(({ line }) => sameCode(line.barcode, code)) ??
      scanLines.find(({ line }) => sameCode(line.sku, code))
    if (!match) {
      setScanMessage({ ok: false, text: `Mã hàng "${code}" không thuộc phiếu này.` })
      return
    }
    const { line } = match
    const shelfOption = currentShelf
      ? inventoryOptions.find(
          (option) => option.productId === line.productId && sameCode(option.label, currentShelf)
        )
      : undefined
    if (currentShelf && !shelfOption) {
      setScanMessage({
        ok: false,
        text: `${line.productName} không được giữ tại kệ ${currentShelf}.`,
      })
      return
    }
    const itemId = line.stockIssueRequestItemId
    const count = scanCounts[itemId] ?? 0
    if (count >= line.remainingQuantity) {
      setScanMessage({ ok: false, text: `${line.productName} đã quét đủ số lượng cần lấy.` })
      return
    }
    setScanCounts((current) => ({ ...current, [itemId]: count + 1 }))
    lines.forEach((candidate, index) => {
      if (candidate.stockIssueRequestItemId === itemId) {
        form.setValue(`lines.${index}.scannedBarcode`, line.barcode ?? '', { shouldDirty: true })
      }
    })
    if (shelfOption) {
      const target = lines.findIndex(
        (candidate) =>
          candidate.stockIssueRequestItemId === itemId &&
          (candidate.inventoryStockId === '' ||
            candidate.inventoryStockId === shelfOption.inventoryStockId)
      )
      if (target >= 0) {
        form.setValue(`lines.${target}.inventoryStockId`, shelfOption.inventoryStockId, {
          shouldDirty: true,
        })
        form.setValue(`lines.${target}.availableQuantity`, shelfOption.availableQuantity)
        form.setValue(`lines.${target}.scannedSlotCode`, currentShelf ?? '', { shouldDirty: true })
      }
    }
    setScanMessage({
      ok: true,
      text: `${line.productName}: ${count + 1}/${formatStockIssueQuantity(line.remainingQuantity)}`,
    })
  }

  function goToAllocate() {
    scanLines.forEach(({ line, index }) => {
      const count = scanCounts[line.stockIssueRequestItemId] ?? 0
      if (count > 0 && !((lines[index]?.pickedQuantity ?? 0) > 0)) {
        form.setValue(`lines.${index}.pickedQuantity`, Math.min(count, line.remainingQuantity), {
          shouldDirty: true,
        })
      }
    })
    setStep('allocate')
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'scan' ? 'Bước 1/2 · Quét mã hàng' : 'Bước 2/2 · Vị trí & số lượng lấy'}
          </DialogTitle>
          <DialogDescription>
            {step === 'scan'
              ? 'Quét mã kệ để xác nhận đúng vị trí, rồi quét mã từng sản phẩm bằng máy quét. Hệ thống tự đối chiếu và cộng số lượng.'
              : 'Chọn vị trí hoặc lô và nhập số lượng lấy. Hàng sẽ được chuyển ra khu chờ xuất (Ready for Issue); tồn thực tế chỉ giảm khi hàng rời kho.'}
          </DialogDescription>
        </DialogHeader>
        {order ? (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="bg-muted/40 border p-3">
                <p className="truncate font-mono text-sm font-medium" translate="no">
                  {order.stockIssueRequestCode}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {order.recipientName} · {order.warehouseName}
                </p>
              </div>

              {step === 'scan' ? (
                <FieldGroup>
                  {requiresShelf ? (
                    <Field>
                      <FieldLabel htmlFor="issue-scan-shelf">1. Quét mã kệ</FieldLabel>
                      {currentShelf ? (
                        <p className="flex items-center justify-between border px-3 py-2 text-sm">
                          <span>
                            Kệ hiện tại:{' '}
                            <span className="font-mono font-medium" translate="no">
                              {currentShelf}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentShelf(null)
                              focusScanInput('issue-scan-shelf')
                            }}
                          >
                            Đổi kệ
                          </Button>
                        </p>
                      ) : (
                        <div className="relative">
                          <ScanBarcode
                            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                            aria-hidden="true"
                          />
                          <Input
                            id="issue-scan-shelf"
                            name="issueScanShelf"
                            autoFocus
                            autoComplete="off"
                            placeholder="Quét mã kệ, rồi Enter…"
                            className="pl-9 font-mono"
                            value={shelfCode}
                            onChange={(event) => setShelfCode(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleShelfScan()
                              }
                            }}
                          />
                        </div>
                      )}
                    </Field>
                  ) : null}
                  <Field>
                    <FieldLabel htmlFor="issue-scan-input">
                      {requiresShelf ? '2. Quét mã hàng' : 'Quét mã hàng'}
                    </FieldLabel>
                    <div className="relative">
                      <ScanBarcode
                        className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="issue-scan-input"
                        name="issueScanInput"
                        autoFocus={!requiresShelf}
                        disabled={requiresShelf && !currentShelf}
                        autoComplete="off"
                        placeholder={
                          requiresShelf && !currentShelf
                            ? 'Quét mã kệ trước…'
                            : 'Quét mã hàng, rồi Enter…'
                        }
                        className="pl-9 font-mono"
                        value={scanCode}
                        onChange={(event) => setScanCode(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleScan()
                          }
                        }}
                      />
                    </div>
                    {scanMessage ? (
                      <p
                        role="status"
                        className={
                          scanMessage.ok ? 'text-xs text-emerald-600' : 'text-destructive text-xs'
                        }
                      >
                        {scanMessage.text}
                      </p>
                    ) : null}
                  </Field>
                  <ul className="divide-y border text-sm">
                    {scanLines.map(({ line }) => {
                      const count = scanCounts[line.stockIssueRequestItemId] ?? 0
                      const done = count >= line.remainingQuantity
                      return (
                        <li
                          key={line.stockIssueRequestItemId}
                          className="flex items-center justify-between gap-2 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{line.productName}</span>
                            <span
                              className="text-muted-foreground font-mono text-xs"
                              translate="no"
                            >
                              {line.barcode ?? line.sku}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 tabular-nums">
                            {done ? (
                              <Check className="size-4 text-emerald-600" aria-hidden="true" />
                            ) : null}
                            {count}/{formatStockIssueQuantity(line.remainingQuantity)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-muted-foreground text-xs">
                    Quét mã kệ trước, rồi quét từng sản phẩm (mỗi lần +1). Mã kệ lấy từ vị trí đã
                    giữ hàng cho phiếu này.
                  </p>
                </FieldGroup>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="issue-inventory-search">Tìm vị trí tồn</FieldLabel>
                    <Input
                      id="issue-inventory-search"
                      name="issueInventorySearch"
                      autoComplete="off"
                      placeholder="Tìm SKU hoặc sản phẩm…"
                      value={inventorySearch}
                      onChange={(event) => onInventorySearchChange(event.target.value)}
                    />
                  </Field>

                  <FieldGroup>
                    {lines.map((line, index) => {
                      const lineError = form.formState.errors.lines?.[index]
                      const inputId = `issue-stock-line-${index}`

                      return (
                        <Field key={fieldArray.fields[index]?.id} data-invalid={Boolean(lineError)}>
                          <FieldLabel htmlFor={inputId}>
                            <span className="truncate">{line.productName}</span>
                          </FieldLabel>
                          <p className="text-muted-foreground text-xs">
                            <span className="font-mono" translate="no">
                              {line.sku}
                            </span>{' '}
                            · Còn lại {formatStockIssueQuantity(line.remainingQuantity)}
                          </p>
                          <Input
                            id={inputId}
                            type="number"
                            min={0}
                            max={line.remainingQuantity}
                            step="0.01"
                            inputMode="decimal"
                            disabled={isPending}
                            aria-invalid={Boolean(lineError)}
                            {...form.register(`lines.${index}.pickedQuantity`, {
                              valueAsNumber: true,
                            })}
                          />
                          <NativeSelect
                            aria-label={`Dòng tồn kho lấy ${line.productName}`}
                            value={line.inventoryStockId}
                            onChange={(event) => {
                              const option = inventoryOptions.find(
                                (candidate) => candidate.inventoryStockId === event.target.value
                              )
                              form.setValue(`lines.${index}.inventoryStockId`, event.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                              form.setValue(
                                `lines.${index}.availableQuantity`,
                                option?.availableQuantity ?? 0,
                                { shouldValidate: true }
                              )
                            }}
                          >
                            <NativeSelectOption value="">Chọn dòng tồn kho</NativeSelectOption>
                            {inventoryOptions
                              .filter((option) => option.productId === line.productId)
                              .map((option) => (
                                <NativeSelectOption
                                  key={option.inventoryStockId}
                                  value={option.inventoryStockId}
                                >
                                  {option.label} · {option.qualityStatus}
                                  {option.lotNumber ? ` · lô ${option.lotNumber}` : ''} · khả dụng{' '}
                                  {option.availableQuantity}
                                </NativeSelectOption>
                              ))}
                          </NativeSelect>
                          <FieldError
                            errors={
                              lineError?.pickedQuantity
                                ? [lineError.pickedQuantity]
                                : lineError?.inventoryStockId
                                  ? [lineError.inventoryStockId]
                                  : undefined
                            }
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                fieldArray.append({
                                  ...line,
                                  inventoryStockId: '',
                                  availableQuantity: 0,
                                  pickedQuantity: 0,
                                })
                              }
                            >
                              <Plus aria-hidden="true" />
                              Thêm vị trí/lô
                            </Button>
                            {lines.filter(
                              (candidate) =>
                                candidate.stockIssueRequestItemId === line.stockIssueRequestItemId
                            ).length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Xóa phân bổ ${line.productName}`}
                                onClick={() => fieldArray.remove(index)}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            ) : null}
                          </div>
                        </Field>
                      )
                    })}
                  </FieldGroup>

                  <FieldError errors={linesError?.root ? [linesError.root] : undefined} />
                </>
              )}
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => (step === 'allocate' ? setStep('scan') : handleOpenChange(false))}
              >
                {step === 'allocate' ? 'Quay lại quét' : 'Hủy'}
              </Button>
              {step === 'scan' ? (
                <Button type="button" onClick={goToAllocate}>
                  <MapPin data-icon="inline-start" aria-hidden="true" />
                  Tiếp tục
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner data-icon="inline-start" /> : null}
                  Xác nhận lấy hàng
                </Button>
              )}
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
