'use client'

import { MapPinned, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { PutawaySuggestionPanel } from '@/components/operations/putaway'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { useTransferPlanEditor } from '../../hooks/use-transfer-plan-editor'
import type { TransferDetail, TransferPutAwayPlanSuggestions } from '../../types/transfer.types'
import {
  adaptTransferPutawaySuggestions,
  planTotalFromRemaining,
  transferPlanLocations,
} from '../../utils/transfer-putaway-plan'
import { TransferSlotMapDialog } from '../TransferFormPage/TransferSlotMapDialog'
import { TransferConfirmDialog } from '../TransferShared'

interface Props {
  readonly transfer: TransferDetail
  readonly editor: ReturnType<typeof useTransferPlanEditor>
  readonly canManage: boolean
  readonly slotOptions: readonly LookupOption[]
  readonly isLoadingSlots: boolean
  readonly onSlotSearchChange: (value: string) => void
  readonly suggestions?: TransferPutAwayPlanSuggestions
  readonly isSuggesting: boolean
  readonly suggestionError?: string | null
  readonly onSuggest: () => void
  readonly onReload: () => Promise<void>
}

/** Sheet chỉ sửa nháp; mọi ghi dữ liệu do hook thực hiện sau khi người dùng bấm Lưu. */
export function TransferPutawayPlanSheet({
  transfer,
  editor,
  canManage,
  slotOptions,
  isLoadingSlots,
  onSlotSearchChange,
  suggestions,
  isSuggesting,
  suggestionError,
  onSuggest,
  onReload,
}: Props) {
  const id = useId()
  const [mapTarget, setMapTarget] = useState<{ itemIndex: number; lineIndex: number } | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const reloadLock = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const historyTraversal = useRef<'idle' | 'restoring' | 'leaving'>('idle')
  const [leavingByHistory, setLeavingByHistory] = useState(false)
  // Làm mới trang hoặc đóng tab khi còn nháp chưa lưu phải được hỏi lại; Sheet đã chặn bấm liên kết trong trang.
  useEffect(() => {
    if (!editor.isOpen || !editor.isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    // Back/Forward của trình duyệt không đi qua Sheet: trả lại trang hiện tại rồi hỏi trước khi bỏ nháp.
    const interceptHistory = () => {
      if (historyTraversal.current !== 'idle') {
        historyTraversal.current = 'idle'
        return
      }
      historyTraversal.current = 'restoring'
      window.history.forward()
      setLeavingByHistory(true)
      setConfirmClose(true)
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    window.addEventListener('popstate', interceptHistory)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      window.removeEventListener('popstate', interceptHistory)
    }
  }, [editor.isOpen, editor.isDirty])
  const disabled =
    !canManage || editor.isPending || editor.reloadRequired || isReloading || isSuggesting
  const usedSlots = new Map(
    editor.draft.map((item) => [item.itemId, new Set(item.lines.map((line) => line.slotId))])
  )

  function changeLine(
    itemIndex: number,
    lineIndex: number,
    change: Partial<{ slotId: string; path: string; plannedTotal: number }>
  ) {
    editor.change(
      editor.draft.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              lines: item.lines.map((line, j) => (j === lineIndex ? { ...line, ...change } : line)),
            }
          : item
      )
    )
  }
  function close() {
    if (editor.isPending || isReloading) return
    if (editor.isDirty) setConfirmClose(true)
    else editor.close()
  }
  async function reload() {
    if (reloadLock.current || editor.isPending) return
    reloadLock.current = true
    setIsReloading(true)
    try {
      await onReload()
    } finally {
      reloadLock.current = false
      setIsReloading(false)
    }
  }
  async function save() {
    const done = await editor.submit()
    if (!done)
      requestAnimationFrame(() =>
        contentRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      )
  }

  return (
    <>
      <Sheet
        open={editor.isOpen && !mapTarget}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <SheetContent
          ref={contentRef}
          showCloseButton={false}
          className="data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full animation-duration-300 flex flex-col gap-0 p-0 ease-out data-[side=right]:w-full motion-reduce:animate-none data-[side=right]:sm:max-w-2xl"
          aria-busy={editor.isPending || isReloading}
        >
          <SheetHeader className="shrink-0 border-b p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle>{canManage ? 'Kế hoạch cất hàng' : 'Xem kế hoạch cất hàng'}</SheetTitle>
                <SheetDescription className="mt-1 break-words">
                  {transfer.transferCode} · Kho {transfer.destinationWarehouseName}
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đóng kế hoạch"
                disabled={editor.isPending || isReloading}
                onClick={close}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Phần đã nhận được khóa. Chỉnh phần còn lại; tổng kế hoạch sẽ được lưu cùng phần đã
              nhận.
            </p>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setHideSuggestions(false)
                  onSuggest()
                }}
              >
                {isSuggesting ? <Spinner aria-hidden="true" /> : <Sparkles aria-hidden="true" />}{' '}
                {isSuggesting ? 'Đang lấy gợi ý…' : 'Gợi ý vị trí'}
              </Button>
            ) : null}
          </SheetHeader>
          <div
            data-slot="transfer-scroll"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
          >
            {editor.errorMessage || suggestionError ? (
              <div role="alert" className="bg-muted border-b p-4 text-sm">
                <p>{editor.errorMessage ?? suggestionError}</p>
                {editor.reloadRequired ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    disabled={isReloading}
                    onClick={() => void reload()}
                  >
                    {isReloading ? 'Đang tải lại…' : 'Tải lại và giữ nội dung đang sửa'}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {!hideSuggestions && suggestions ? (
              <PutawaySuggestionPanel
                items={transfer.items.map((item) => ({
                  id: item.id,
                  productSKU: item.sku,
                  productName: item.productName,
                  baseUnitName: item.baseUnitName,
                }))}
                state={{
                  suggestions: adaptTransferPutawaySuggestions(suggestions),
                  isSuggesting,
                  onSuggest,
                  onApply: (itemId, slotId) => editor.apply(suggestions, { itemId, slotId }),
                  onApplyBest: () => editor.apply(suggestions),
                  onClear: () => setHideSuggestions(true),
                }}
                disabled={disabled}
                usedSlotIdsByItem={usedSlots}
              />
            ) : null}
            <div className="space-y-4 p-4">
              {editor.draft.map((entry, itemIndex) => {
                const item = transfer.items.find((item) => item.id === entry.itemId)
                if (!item) return null
                const total = entry.lines.reduce((sum, line) => sum + line.plannedTotal, 0)
                const maximum = item.quantity - item.stoppedQuantity
                return (
                  <section
                    key={entry.itemId}
                    className="bg-card border [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2 border-b p-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold break-words">
                          {item.sku} · {item.productName}
                        </h3>
                        <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                          Kế hoạch {formatQuantity(total)} / {formatQuantity(maximum)}{' '}
                          {item.baseUnitName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || entry.lines.length >= 20}
                        onClick={() =>
                          editor.change(
                            editor.draft.map((draft, i) =>
                              i === itemIndex
                                ? {
                                    ...draft,
                                    lines: [
                                      ...draft.lines,
                                      {
                                        slotId: '',
                                        path: '',
                                        plannedTotal: Math.max(0, maximum - total),
                                      },
                                    ],
                                  }
                                : draft
                            )
                          )
                        }
                      >
                        <Plus aria-hidden="true" />
                        Thêm vị trí
                      </Button>
                    </header>
                    <div className="space-y-3 p-3">
                      {entry.lines.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Chưa có vị trí theo kế hoạch.
                        </p>
                      ) : null}
                      {entry.lines.map((line, lineIndex) => {
                        const received =
                          transferPlanLocations(item).find((saved) => saved.slotId === line.slotId)
                            ?.receivedQuantity ?? 0
                        const prefix = `items.${itemIndex}.lines.${lineIndex}`
                        const slotError = editor.errors[`${prefix}.slotId`]
                        const quantityError = editor.errors[`${prefix}.plannedTotal`]
                        return (
                          <div
                            key={`${entry.itemId}-${lineIndex}`}
                            className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto]"
                          >
                            <Field data-invalid={Boolean(slotError)}>
                              <FieldLabel htmlFor={`${id}-${itemIndex}-${lineIndex}-slot`}>
                                Vị trí cất
                              </FieldLabel>
                              <LookupCombobox
                                id={`${id}-${itemIndex}-${lineIndex}-slot`}
                                value={line.slotId}
                                selectedOption={
                                  line.slotId
                                    ? { value: line.slotId, label: line.path || line.slotId }
                                    : undefined
                                }
                                options={slotOptions}
                                placeholder="Chọn vị trí…"
                                emptyMessage="Không tìm thấy vị trí nhận hàng."
                                ariaLabel="Vị trí cất hàng"
                                isLoading={isLoadingSlots}
                                isInvalid={Boolean(slotError)}
                                disabled={disabled || received > 0}
                                onSearchChange={onSlotSearchChange}
                                onChange={(slotId, option) =>
                                  changeLine(itemIndex, lineIndex, {
                                    slotId,
                                    path: option?.label ?? '',
                                  })
                                }
                                footerAction={{
                                  label: 'Chọn trên sơ đồ kho',
                                  icon: <MapPinned aria-hidden="true" />,
                                  onClick: () => {
                                    if (!disabled && received === 0)
                                      setMapTarget({ itemIndex, lineIndex })
                                  },
                                }}
                              />
                              <FieldError>{slotError}</FieldError>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${id}-${itemIndex}-${lineIndex}-received`}>
                                Đã nhận
                              </FieldLabel>
                              <Input
                                id={`${id}-${itemIndex}-${lineIndex}-received`}
                                value={formatQuantity(received)}
                                readOnly
                                className="bg-muted tabular-nums"
                              />
                            </Field>
                            <Field data-invalid={Boolean(quantityError)}>
                              <FieldLabel htmlFor={`${id}-${itemIndex}-${lineIndex}-remaining`}>
                                Còn lại
                              </FieldLabel>
                              <Input
                                id={`${id}-${itemIndex}-${lineIndex}-remaining`}
                                name={`remaining-${item.id}-${lineIndex}`}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={10 ** -Math.min(2, item.baseQuantityPrecision ?? 2)}
                                value={
                                  Number.isFinite(line.plannedTotal)
                                    ? Number((line.plannedTotal - received).toPrecision(15))
                                    : ''
                                }
                                disabled={disabled}
                                aria-invalid={Boolean(quantityError)}
                                aria-describedby={
                                  quantityError
                                    ? `${id}-${itemIndex}-${lineIndex}-error`
                                    : undefined
                                }
                                onChange={(event) =>
                                  changeLine(itemIndex, lineIndex, {
                                    plannedTotal:
                                      event.target.value === ''
                                        ? Number.NaN
                                        : planTotalFromRemaining(
                                            received,
                                            event.target.valueAsNumber
                                          ),
                                  })
                                }
                              />
                              <FieldError id={`${id}-${itemIndex}-${lineIndex}-error`}>
                                {quantityError}
                              </FieldError>
                            </Field>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="sm:mt-6"
                              aria-label={`Bỏ vị trí ${line.path || lineIndex + 1}`}
                              disabled={disabled || received > 0}
                              onClick={() =>
                                editor.change(
                                  editor.draft.map((draft, i) =>
                                    i === itemIndex
                                      ? {
                                          ...draft,
                                          lines: draft.lines.filter((_, j) => j !== lineIndex),
                                        }
                                      : draft
                                  )
                                )
                              }
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        )
                      })}
                      <FieldError>{editor.errors[`items.${itemIndex}.lines`]}</FieldError>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
          <SheetFooter className="bg-card shrink-0 flex-row justify-end border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <span className="sr-only" role="status">
              {editor.isPending ? 'Đang lưu kế hoạch…' : isSuggesting ? 'Đang lấy gợi ý…' : ''}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={editor.isPending || isReloading}
              onClick={close}
            >
              Đóng
            </Button>
            {canManage ? (
              <Button
                type="button"
                disabled={disabled || !editor.isDirty}
                onClick={() => void save()}
              >
                {editor.isPending ? <Spinner aria-hidden="true" /> : null}
                {editor.isPending ? 'Đang lưu…' : 'Lưu kế hoạch'}
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <TransferSlotMapDialog
        open={Boolean(mapTarget)}
        warehouseId={transfer.destinationWarehouseId}
        title="Chọn vị trí cất hàng"
        description="Chọn một vị trí đang nhận hàng tại kho nhập."
        onOpenChange={(open) => {
          if (!open) setMapTarget(null)
        }}
        onConfirm={(pick) => {
          if (mapTarget)
            changeLine(mapTarget.itemIndex, mapTarget.lineIndex, {
              slotId: pick.slotId,
              path: pick.label,
            })
          setMapTarget(null)
        }}
      />
      <TransferConfirmDialog
        open={confirmClose}
        onOpenChange={(open) => {
          setConfirmClose(open)
          if (!open) setLeavingByHistory(false)
        }}
        title="Bỏ nội dung đang sửa?"
        description={<p>Kế hoạch chưa lưu sẽ bị bỏ. Dữ liệu đã lưu không thay đổi.</p>}
        confirmLabel="Bỏ thay đổi"
        pendingLabel="Đang đóng…"
        isPending={editor.isPending}
        onConfirm={() => {
          setConfirmClose(false)
          editor.close()
          if (leavingByHistory) {
            setLeavingByHistory(false)
            historyTraversal.current = 'leaving'
            window.history.back()
          }
        }}
      />
    </>
  )
}
