'use client'

import { CircleCheck, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScanInput } from '@/features/transfer/components/TransferWork/ScanInput'
import { recordCycleCountItemSchema } from '../../schemas/cycle-count.schema'
import type { CycleCountItem } from '../../types/cycle-count.types'
import { formatCount } from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import type { CycleCountRecordEntry } from './types'

interface CycleCountScanDialogProps {
  readonly open: boolean
  readonly items: readonly CycleCountItem[]
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSave: (entries: readonly CycleCountRecordEntry[]) => Promise<boolean>
}

interface ScanMessage {
  readonly ok: boolean
  readonly text: string
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('vi')

function matchesSlot(item: CycleCountItem, code: string): boolean {
  // Kệ mặc định dùng chung một mã nội bộ nên nhân viên quét mã kệ thay cho mã vị trí.
  return [item.slotCode, item.slotBarcode, item.isSystemDefaultSlot ? item.rackCode : null].some(
    (candidate) => candidate && normalize(candidate) === code
  )
}

function matchesProduct(item: CycleCountItem, code: string): boolean {
  return [item.productSku, item.productBarcode].some(
    (candidate) => candidate && normalize(candidate) === code
  )
}

function describeItem(item: CycleCountItem): string {
  return `${item.productSku} · ${item.lotNumber ?? 'Theo số lượng'}`
}

export function CycleCountScanDialog({
  open,
  items,
  isPending,
  onOpenChange,
  onSave,
}: CycleCountScanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quét mã kiểm kê</DialogTitle>
          <DialogDescription>
            Quét mã vị trí, sau đó quét mã hàng để nhập số đếm. Hàng không có mã vạch thì chọn thẳng
            trong danh sách.
          </DialogDescription>
        </DialogHeader>
        {/* Gắn khi mở để mỗi lần quét bắt đầu lại từ bước chọn vị trí. */}
        {open ? <ScanSession items={items} isPending={isPending} onSave={onSave} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ScanSessionProps {
  readonly items: readonly CycleCountItem[]
  readonly isPending: boolean
  readonly onSave: (entries: readonly CycleCountRecordEntry[]) => Promise<boolean>
}

function ScanSession({ items, isPending, onSave }: ScanSessionProps) {
  const [slotId, setSlotId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [candidateIds, setCandidateIds] = useState<readonly string[]>([])
  const [quantity, setQuantity] = useState('')
  const [damaged, setDamaged] = useState('')
  const [message, setMessage] = useState<ScanMessage | null>(null)
  const [isIncrementMode, setIsIncrementMode] = useState(false)

  const slotItems = slotId === null ? [] : items.filter((item) => item.slotId === slotId)
  const activeItem = items.find((item) => item.id === activeItemId) ?? null
  const countedInSlot = slotItems.filter((item) => item.countedQuantity !== null).length
  const selectableItems =
    candidateIds.length > 0 ? slotItems.filter((item) => candidateIds.includes(item.id)) : slotItems
  const quantityError =
    quantity !== '' && !recordCycleCountItemSchema.safeParse(quantity).success
      ? 'Số lượng từ 0, tối đa 2 chữ số thập phân.'
      : null
  const damagedError =
    damaged !== '' &&
    (!recordCycleCountItemSchema.safeParse(damaged).success ||
      (quantityError === null && quantity !== '' && Number(damaged) > Number(quantity)))
      ? 'Số hỏng phải từ 0 và không vượt số đếm.'
      : null

  function selectItem(item: CycleCountItem, code: string | null) {
    setActiveItemId(item.id)
    setScannedCode(code)
    setCandidateIds([])
    setQuantity(item.countedQuantity === null ? '' : String(item.countedQuantity))
    setDamaged(item.countedDamagedQuantity === null ? '' : String(item.countedDamagedQuantity))
  }

  function handleSlotScan(raw: string): boolean {
    const code = normalize(raw)
    const matched = items.find((item) => matchesSlot(item, code))
    if (!matched) {
      setMessage({ ok: false, text: `Vị trí "${raw}" không nằm trong phiếu kiểm kê này.` })
      return false
    }
    setSlotId(matched.slotId)
    setActiveItemId(null)
    setScannedCode(null)
    setCandidateIds([])
    setMessage({ ok: true, text: `Đã chọn vị trí ${formatStockLocation(matched)}.` })
    return true
  }

  function handleProductScan(raw: string): boolean {
    const code = normalize(raw)
    const matches = slotItems.filter((item) => matchesProduct(item, code))
    const [matched] = matches
    if (!matched) {
      const elsewhere = items.filter((item) => matchesProduct(item, code))
      setMessage({
        ok: false,
        text:
          elsewhere.length > 0
            ? `Hàng "${raw}" không thuộc vị trí này, mà thuộc ${[...new Set(elsewhere.map(formatStockLocation))].join(', ')}.`
            : `Mã "${raw}" không có trong phiếu. Hàng ngoài phiếu hãy ghi chú để xử lý bằng phiếu điều chỉnh.`,
      })
      return false
    }
    if (matches.length > 1) {
      setActiveItemId(null)
      setScannedCode(raw.trim())
      setCandidateIds(matches.map((item) => item.id))
      setMessage({ ok: true, text: 'Hàng có nhiều lô ở vị trí này, hãy chọn lô đang đếm.' })
      return true
    }
    if (isIncrementMode) {
      // Quét lại chính dòng đang đếm thì cộng dồn; dòng khác bắt đầu lại từ 1 (ghi đè số cũ).
      const nextQuantity = activeItemId === matched.id ? Number(quantity || 0) + 1 : 1
      const keptDamaged = activeItemId === matched.id ? damaged : ''
      selectItem(matched, raw.trim())
      setQuantity(String(nextQuantity))
      setDamaged(keptDamaged)
      setMessage({ ok: true, text: `${describeItem(matched)}: ${nextQuantity}.` })
      return true
    }
    selectItem(matched, raw.trim())
    setMessage({ ok: true, text: `Khớp ${describeItem(matched)}.` })
    return true
  }

  async function handleSave() {
    if (!activeItem || quantity === '' || quantityError || damagedError) return
    const saved = await onSave([
      {
        itemId: activeItem.id,
        quantity: Number(quantity),
        damagedQuantity: damaged === '' ? null : Number(damaged),
        note: activeItem.note,
        countMethod: scannedCode === null ? 'Manual' : 'Scanned',
        scannedBarcode: scannedCode,
      },
    ])
    if (!saved) return
    setMessage({ ok: true, text: `Đã lưu ${describeItem(activeItem)}.` })
    setActiveItemId(null)
    setScannedCode(null)
    setQuantity('')
    setDamaged('')
  }

  return (
    <div className="flex flex-col gap-4">
      <ScanInput
        id="cycle-count-scan-slot"
        label="Vị trí"
        confirmedValue={slotItems[0] ? formatStockLocation(slotItems[0]) : undefined}
        autoFocus
        pending={isPending}
        onScan={handleSlotScan}
      />
      {slotId !== null ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="cycle-count-scan-increment" className="text-sm">
              Mỗi lần quét hàng cộng 1
            </label>
            <Switch
              id="cycle-count-scan-increment"
              checked={isIncrementMode}
              onCheckedChange={setIsIncrementMode}
            />
          </div>
          <ScanInput
            id="cycle-count-scan-product"
            label="Mã hàng"
            confirmedValue={activeItem ? describeItem(activeItem) : undefined}
            focusWhen={activeItem === null || isIncrementMode}
            pending={isPending}
            onScan={handleProductScan}
          />
          <p className="text-muted-foreground text-xs">
            Vị trí này: đã đếm {countedInSlot}/{slotItems.length} dòng.
          </p>
        </>
      ) : null}
      {message ? (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={message.ok ? 'text-primary text-sm' : 'text-destructive text-sm'}
        >
          {message.text}
        </p>
      ) : null}
      {activeItem ? (
        <div className="flex flex-col gap-3 border p-3">
          <div>
            <p className="font-medium">{activeItem.productName}</p>
            <p className="text-muted-foreground font-mono text-xs">{describeItem(activeItem)}</p>
            {activeItem.systemQuantity === null ? (
              <p className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-xs">
                <LockKeyhole className="size-3" aria-hidden="true" />
                Phiếu kiểm kê mù: số sổ sách được ẩn.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs">
                Sổ sách: {formatCount(activeItem.systemQuantity)} {activeItem.unitName ?? ''}
              </p>
            )}
          </div>
          <Field data-invalid={Boolean(quantityError)}>
            <FieldLabel htmlFor="cycle-count-scan-quantity">Số đếm thực tế</FieldLabel>
            <Input
              id="cycle-count-scan-quantity"
              autoFocus
              className="h-11 text-right font-mono text-base"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={quantity}
              aria-invalid={Boolean(quantityError)}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSave()
              }}
            />
            {quantityError ? <FieldError>{quantityError}</FieldError> : null}
            {isIncrementMode ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={quantity === '' || Number(quantity) <= 0}
                onClick={() => setQuantity(String(Math.max(0, Number(quantity) - 1)))}
              >
                Quét nhầm, trừ 1
              </Button>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(damagedError)}>
            <FieldLabel htmlFor="cycle-count-scan-damaged">Trong đó hỏng</FieldLabel>
            <Input
              id="cycle-count-scan-damaged"
              className="h-11 text-right font-mono text-base"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={damaged}
              disabled={quantity === ''}
              aria-invalid={Boolean(damagedError)}
              onChange={(event) => setDamaged(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSave()
              }}
            />
            {damagedError ? <FieldError>{damagedError}</FieldError> : null}
          </Field>
          <Button
            type="button"
            className="h-11"
            disabled={isPending || quantity === '' || Boolean(quantityError || damagedError)}
            onClick={() => void handleSave()}
          >
            Lưu và quét tiếp
          </Button>
        </div>
      ) : null}
      {slotId !== null && !activeItem ? (
        <ul className="flex flex-col gap-1" aria-label="Dòng kiểm kê tại vị trí này">
          {selectableItems.map((item) => (
            <li key={item.id}>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-between gap-2 py-2 text-left"
                disabled={isPending}
                onClick={() => selectItem(item, scannedCode)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{item.productName}</span>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {describeItem(item)}
                  </span>
                </span>
                {item.countedQuantity === null ? (
                  <Badge variant="outline">Chưa đếm</Badge>
                ) : (
                  <Badge variant="secondary">
                    <CircleCheck aria-hidden="true" />
                    {formatCount(item.countedQuantity)}
                  </Badge>
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
