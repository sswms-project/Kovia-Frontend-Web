'use client'

import { useId, useRef, useState } from 'react'
import { MapPinned, Plus, Sparkles, Trash2 } from 'lucide-react'
import { PutawaySuggestionPanel } from '@/components/operations/putaway'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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

export function TransferPutawayPlanWorkspace({
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
  const content = useRef<HTMLDivElement>(null)
  const [mapTarget, setMapTarget] = useState<{ itemIndex: number; lineIndex: number } | null>(null)
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const disabled =
    !canManage || !editor.isOpen || editor.isPending || editor.reloadRequired || isSuggesting
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
  return (
    <div
      ref={content}
      className="flex min-w-0 flex-col gap-3"
      aria-busy={editor.isPending || isSuggesting}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Kế hoạch cất hàng tốt</h2>
          <p className="text-muted-foreground text-sm">
            Phần đã cất tốt được khóa. Chỉnh phần còn lại; không đổi chứng từ đã ghi nhận.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              setHideSuggestions(false)
              onSuggest()
            }}
          >
            {isSuggesting ? <Spinner /> : <Sparkles />}Gợi ý vị trí
          </Button>
        ) : null}
      </header>
      {editor.errorMessage || suggestionError ? (
        <Alert role="alert">
          <AlertDescription>{editor.errorMessage ?? suggestionError}</AlertDescription>
          {editor.reloadRequired ? (
            <Button variant="outline" disabled={editor.isPending} onClick={() => void onReload()}>
              Tải lại và giữ nội dung đang sửa
            </Button>
          ) : null}
        </Alert>
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
          usedSlotIdsByItem={
            new Map(
              editor.draft.map((item) => [
                item.itemId,
                new Set(item.lines.map((line) => line.slotId)),
              ])
            )
          }
        />
      ) : null}
      {editor.draft.map((entry, itemIndex) => {
        const item = transfer.items.find((item) => item.id === entry.itemId)
        if (!item) return null
        const total = entry.lines.reduce((sum, line) => sum + line.plannedTotal, 0)
        const maximum = item.quantity - item.stoppedQuantity
        return (
          <section key={entry.itemId} className="bg-card border">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold break-words">
                  {item.sku} · {item.productName}
                </h3>
                <p className="text-muted-foreground text-xs tabular-nums">
                  Kế hoạch {formatQuantity(total)} / {formatQuantity(maximum)} {item.baseUnitName}
                </p>
              </div>
              <Button
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
                              { slotId: '', path: '', plannedTotal: Math.max(0, maximum - total) },
                            ],
                          }
                        : draft
                    )
                  )
                }
              >
                <Plus />
                Thêm vị trí
              </Button>
            </header>
            <FieldGroup className="gap-3 p-3">
              {entry.lines.length === 0 ? (
                <p className="text-muted-foreground text-sm">Chưa có vị trí theo kế hoạch.</p>
              ) : null}
              {entry.lines.map((line, lineIndex) => {
                const received =
                  transferPlanLocations(item).find((saved) => saved.slotId === line.slotId)
                    ?.receivedQuantity ?? 0
                const prefix = `items.${itemIndex}.lines.${lineIndex}`
                const slotError = editor.errors[`${prefix}.slotId`]
                const quantityError = editor.errors[`${prefix}.plannedTotal`]
                const slotInputId = `${id}-${itemIndex}-${lineIndex}-slot`
                const remainingId = `${id}-${itemIndex}-${lineIndex}-remaining`
                return (
                  <FieldGroup
                    key={`${entry.itemId}-${lineIndex}`}
                    className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto]"
                  >
                    <Field data-invalid={Boolean(slotError)}>
                      <FieldLabel htmlFor={slotInputId}>Vị trí cất</FieldLabel>
                      <LookupCombobox
                        id={slotInputId}
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
                          changeLine(itemIndex, lineIndex, { slotId, path: option?.label ?? '' })
                        }
                        footerAction={{
                          label: 'Chọn trên sơ đồ kho',
                          icon: <MapPinned />,
                          onClick: () => {
                            if (!disabled && received === 0) setMapTarget({ itemIndex, lineIndex })
                          },
                        }}
                      />
                      <FieldError>{slotError}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${remainingId}-done`}>Đã cất tốt</FieldLabel>
                      <Input id={`${remainingId}-done`} value={formatQuantity(received)} readOnly />
                    </Field>
                    <Field data-invalid={Boolean(quantityError)}>
                      <FieldLabel htmlFor={remainingId}>Còn lại</FieldLabel>
                      <Input
                        id={remainingId}
                        type="number"
                        min={0}
                        step={10 ** -Math.min(2, item.baseQuantityPrecision ?? 2)}
                        inputMode="decimal"
                        disabled={disabled}
                        value={
                          Number.isFinite(line.plannedTotal)
                            ? Number((line.plannedTotal - received).toPrecision(15))
                            : ''
                        }
                        aria-invalid={Boolean(quantityError)}
                        aria-describedby={quantityError ? `${remainingId}-error` : undefined}
                        onChange={(event) =>
                          changeLine(itemIndex, lineIndex, {
                            plannedTotal:
                              event.target.value === ''
                                ? Number.NaN
                                : planTotalFromRemaining(received, event.target.valueAsNumber),
                          })
                        }
                      />
                      <FieldError id={`${remainingId}-error`}>{quantityError}</FieldError>
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="sm:mt-6"
                      aria-label={'Bỏ vị trí ' + (line.path || lineIndex + 1)}
                      disabled={disabled || received > 0}
                      onClick={() =>
                        editor.change(
                          editor.draft.map((draft, i) =>
                            i === itemIndex
                              ? { ...draft, lines: draft.lines.filter((_, j) => j !== lineIndex) }
                              : draft
                          )
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </FieldGroup>
                )
              })}
              <FieldError>{editor.errors[`items.${itemIndex}.lines`]}</FieldError>
            </FieldGroup>
          </section>
        )
      })}
      {canManage ? (
        <footer className="bg-background sticky bottom-0 flex flex-wrap justify-end gap-2 border-t py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="sr-only" role="status">
            {editor.isPending ? 'Đang lưu kế hoạch…' : isSuggesting ? 'Đang lấy gợi ý…' : ''}
          </span>
          <Button
            disabled={disabled || !editor.isDirty}
            onClick={async () => {
              const done = await editor.submit()
              if (!done)
                requestAnimationFrame(() =>
                  content.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
                )
            }}
          >
            {editor.isPending ? <Spinner /> : null}Lưu kế hoạch
          </Button>
        </footer>
      ) : null}
      <TransferSlotMapDialog
        open={Boolean(mapTarget)}
        warehouseId={transfer.destinationWarehouseId}
        title="Chọn vị trí cất hàng"
        description="Chọn vị trí đang nhận hàng tại kho nhập."
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
    </div>
  )
}
