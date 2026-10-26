'use client'

import { useId, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PutawayPlanNotice, PutawaySuggestionPanel } from '@/components/operations/putaway'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { FieldError } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import type { SlotOption } from '@/features/inbound/components/PutawayDetailPage'
import { PUTAWAY_ROW_GRID } from '@/features/inbound/components/PutawayDetailPage/PutawayAllocationRow'
import type { LookupOption } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { cn } from '@/lib/utils'
import type { useTransferPlanEditor } from '../../hooks/use-transfer-plan-editor'
import type { TransferDetail, TransferPutAwayPlanSuggestions } from '../../types/transfer.types'
import {
  adaptTransferPutawaySuggestions,
  buildTransferPlanDraft,
  transferPlanLocations,
} from '../../utils/transfer-putaway-plan'
import { TransferSlotMapDialog } from '../TransferFormPage/TransferSlotMapDialog'
import { TransferPlanAllocationRow } from './TransferPlanAllocationRow'

interface Props {
  readonly transfer: TransferDetail
  readonly editor: ReturnType<typeof useTransferPlanEditor>
  readonly canManage: boolean
  readonly slotOptions: readonly LookupOption[]
  readonly capacitySlots?: readonly SlotOption[]
  readonly isLoadingSlots: boolean
  readonly onSlotSearchChange: (value: string) => void
  readonly suggestions?: TransferPutAwayPlanSuggestions
  readonly isSuggesting: boolean
  readonly suggestionError?: string | null
  readonly onSuggest: () => void
  readonly onReload: () => Promise<void>
  readonly onSaved: () => Promise<void>
  readonly onApplySuggestion?: (only?: { itemId: string; slotId: string }) => void
}

/** Cùng bố cục phân bổ của PutawayForm Nhập kho; chỉ nối thao tác vào kế hoạch điều chuyển. */
export function TransferPutawayPlanWorkspace({
  transfer,
  editor,
  canManage,
  slotOptions,
  capacitySlots = [],
  isLoadingSlots,
  onSlotSearchChange,
  suggestions,
  isSuggesting,
  suggestionError,
  onSuggest,
  onReload,
  onSaved,
  onApplySuggestion,
}: Props) {
  const headingId = useId()
  const content = useRef<HTMLDivElement>(null)
  const saving = useRef(false)
  const [mapTarget, setMapTarget] = useState<{ itemIndex: number; lineIndex: number } | null>(null)
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const disabled =
    !canManage || !editor.isOpen || editor.isPending || editor.reloadRequired || isSuggesting
  const groups = editor.draft.flatMap((entry, itemIndex) => {
    const item = transfer.items.find((item) => item.id === entry.itemId)
    if (!item) return []
    const locations = transferPlanLocations(item)
    const received = locations.reduce((sum, slot) => sum + slot.receivedQuantity, 0)
    const remaining = Math.max(0, item.quantity - item.stoppedQuantity - received)
    const assigned = entry.lines.reduce(
      (sum, line) =>
        sum +
        Math.max(
          0,
          (Number.isFinite(line.plannedTotal) ? line.plannedTotal : 0) -
            (locations.find((slot) => slot.slotId === line.slotId)?.receivedQuantity ?? 0)
        ),
      0
    )
    const complete =
      Number.isFinite(assigned) &&
      Math.abs(assigned - remaining) < 1e-7 &&
      entry.lines.every(
        (line) =>
          Boolean(line.slotId) && Number.isFinite(line.plannedTotal) && line.plannedTotal > 0
      )
    return [{ entry, item, itemIndex, locations, remaining, assigned, complete }]
  })
  const pendingGroups = groups.filter((group) => group.remaining > 0)
  const completeCount = pendingGroups.filter((group) => group.complete).length
  const savedPlan = transfer.items.flatMap((item) =>
    (item.putAwayPlan?.length ?? 0) > 0
      ? [
          {
            id: item.id,
            label: `${item.sku} - ${item.productName}${item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}`,
            locations: (item.putAwayPlan ?? [])
              .map(
                (line) =>
                  `${line.path}: ${formatQuantity(line.plannedTotal - line.receivedQuantity)} ${item.baseUnitName ?? ''}`
              )
              .join(' · '),
          },
        ]
      : []
  )
  // Vị trí đã chọn phải còn hiển thị khi không nằm trong kết quả tìm kiếm hiện tại.
  const displayedSlots = new Map(capacitySlots.map((slot) => [slot.id, slot]))
  for (const option of slotOptions)
    if (!displayedSlots.has(option.value))
      displayedSlots.set(option.value, {
        id: option.value,
        code: option.label.split('/').at(-1)?.trim() || option.label,
        name: '',
        zoneId: 'available',
        zoneLabel: 'Vị trí kho nhập',
        hierarchy: option.label,
        capacityLabel: 'Chưa có dữ liệu sức chứa',
      })
  for (const { entry } of groups)
    for (const line of entry.lines)
      if (line.slotId && !displayedSlots.has(line.slotId))
        displayedSlots.set(line.slotId, {
          id: line.slotId,
          code: line.path.split('/').at(-1)?.trim() || line.slotId,
          name: '',
          zoneId: 'saved',
          zoneLabel: 'Vị trí đã chọn',
          hierarchy: line.path,
          capacityLabel: 'Cần kiểm tra trạng thái vị trí',
          unavailableReason: 'Vị trí chưa có trong danh sách đang hoạt động',
        })
  const slots = [...displayedSlots.values()]
  function changeLine(
    itemIndex: number,
    lineIndex: number,
    change: Partial<Props['editor']['draft'][number]['lines'][number]>
  ) {
    if (disabled) return
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
  async function save() {
    if (disabled || saving.current) return
    saving.current = true
    try {
      const done = await editor.submit()
      if (done) await onSaved()
      else {
        setCollapsed(new Set())
        requestAnimationFrame(() =>
          content.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        )
      }
    } finally {
      saving.current = false
    }
  }
  return (
    <div
      ref={content}
      className="relative flex min-h-full w-full min-w-0 shrink-0 flex-col gap-5"
      aria-busy={editor.isPending || isSuggesting}
    >
      <p className="bg-muted/40 border-l-primary border border-l-4 px-4 py-3 text-sm" role="status">
        Vị trí và số lượng được điền sẵn theo kế hoạch hoặc quy tắc kho. Bạn có thể chỉnh lại rồi
        bấm <strong>“Lưu vị trí cất hàng”</strong>.
      </p>
      <PutawayPlanNotice
        items={savedPlan}
        disabled={disabled}
        onApplyPlan={() => editor.change(buildTransferPlanDraft(transfer.items))}
        description="Kế hoạch cất hàng của phiếu điều chuyển. Vị trí đã cất được khóa; bạn chỉ chỉnh phần còn lại. Lưu kế hoạch không ghi tăng tồn kho."
      />
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
      <section className="bg-card border" aria-labelledby={headingId}>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-sm font-semibold">
              Chọn vị trí cất cho từng sản phẩm
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <Progress
                className="max-w-56"
                value={pendingGroups.length ? (completeCount / pendingGroups.length) * 100 : 0}
                aria-label="Tiến độ phân bổ"
              />
              <p className="text-muted-foreground text-xs tabular-nums" role="status">
                Đã phân bổ đủ {completeCount}/{pendingGroups.length} sản phẩm
              </p>
            </div>
          </div>
          {groups.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsed(
                  collapsed.size === groups.length
                    ? new Set()
                    : new Set(groups.map((group) => group.item.id))
                )
              }
            >
              {collapsed.size === groups.length ? 'Mở tất cả' : 'Thu gọn tất cả'}
            </Button>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-tertiary/40 text-tertiary hover:text-tertiary"
              disabled={disabled}
              onClick={() => {
                setHideSuggestions(false)
                onSuggest()
              }}
            >
              {isSuggesting ? <Spinner aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {isSuggesting ? 'Đang phân tích…' : 'Gợi ý vị trí bằng AI'}
            </Button>
          ) : null}
        </div>
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
              onApply: (itemId, slotId) =>
                onApplySuggestion
                  ? onApplySuggestion({ itemId, slotId })
                  : editor.apply(suggestions, { itemId, slotId }),
              onApplyBest: () =>
                onApplySuggestion ? onApplySuggestion() : editor.apply(suggestions),
              onClear: () => setHideSuggestions(true),
            }}
            disabled={disabled}
          />
        ) : null}
        <div className="divide-y">
          {groups.map(({ entry, item, itemIndex, locations, remaining, assigned, complete }) => (
            <article key={item.id} aria-label={`${item.sku} - ${item.productName}`}>
              <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-expanded={!collapsed.has(item.id)}
                    aria-label={`${collapsed.has(item.id) ? 'Mở' : 'Thu gọn'} ${item.sku}`}
                    onClick={() =>
                      setCollapsed((current) => {
                        const next = new Set(current)
                        if (!next.delete(item.id)) next.add(item.id)
                        return next
                      })
                    }
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'transition-transform motion-reduce:transition-none',
                        collapsed.has(item.id) && '-rotate-90'
                      )}
                    />
                  </Button>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold break-words">
                      {item.sku} - {item.productName}
                      {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                    </h3>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      Còn phải cất {formatQuantity(remaining)} {item.baseUnitName} · đang phân bổ{' '}
                      {formatQuantity(assigned)} {item.baseUnitName} vào {entry.lines.length} vị trí
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {assigned > remaining + 1e-7 ? (
                    <Badge variant="destructive">
                      Vượt {formatQuantity(assigned - remaining)} {item.baseUnitName}
                    </Badge>
                  ) : complete ? (
                    <Badge variant="secondary">
                      <Check aria-hidden="true" />
                      Đã đủ
                    </Badge>
                  ) : assigned >= remaining ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      Cần kiểm tra phân bổ
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning text-warning">
                      Còn thiếu {formatQuantity(Math.max(0, remaining - assigned))}{' '}
                      {item.baseUnitName}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || entry.lines.length >= 20}
                    onClick={() =>
                      editor.change(
                        editor.draft.map((draft, index) =>
                          index === itemIndex
                            ? {
                                ...draft,
                                lines: [
                                  ...draft.lines,
                                  {
                                    slotId: '',
                                    path: '',
                                    plannedTotal: Math.max(0, remaining - assigned),
                                  },
                                ],
                              }
                            : draft
                        )
                      )
                    }
                  >
                    <Plus aria-hidden="true" />
                    Chia sang vị trí khác
                  </Button>
                </div>
              </div>
              {collapsed.has(item.id) ? (
                <p className="text-muted-foreground px-4 py-2 font-mono text-xs break-words">
                  {entry.lines
                    .filter((line) => line.slotId)
                    .map((line) => `${line.path} × ${formatQuantity(line.plannedTotal)}`)
                    .join(' · ') || 'Chưa chọn vị trí'}
                </p>
              ) : null}
              <Collapsible open={!collapsed.has(item.id)}>
                <CollapsibleContent className="motion-reduce:animate-none">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'text-muted-foreground hidden border-b px-4 py-1.5 text-xs font-medium',
                      PUTAWAY_ROW_GRID
                    )}
                  >
                    <span>Vị trí</span>
                    <span>Số lượng</span>
                    <span>Đơn vị</span>
                    <span>Quy đổi</span>
                    <span className="w-[6.5rem]" />
                  </div>
                  <div className="divide-y">
                    {entry.lines.map((line, lineIndex) => {
                      const received =
                        locations.find((saved) => saved.slotId === line.slotId)?.receivedQuantity ??
                        0
                      const otherRemaining = entry.lines.reduce(
                        (sum, other, index) =>
                          index === lineIndex
                            ? sum
                            : sum +
                              Math.max(
                                0,
                                other.plannedTotal -
                                  (locations.find((saved) => saved.slotId === other.slotId)
                                    ?.receivedQuantity ?? 0)
                              ),
                        0
                      )
                      const prefix = `items.${itemIndex}.lines.${lineIndex}`
                      const rowSlots = slots.map((slot) =>
                        entry.lines.some(
                          (other, index) => index !== lineIndex && other.slotId === slot.id
                        )
                          ? {
                              ...slot,
                              unavailableReason: 'Đã chọn cho sản phẩm này',
                            }
                          : slot
                      )
                      return (
                        <TransferPlanAllocationRow
                          key={`${item.id}-${lineIndex}`}
                          item={item}
                          line={line}
                          received={received}
                          remaining={Math.max(0, remaining - otherRemaining)}
                          slots={rowSlots}
                          disabled={disabled}
                          loading={isLoadingSlots}
                          slotError={editor.errors[`${prefix}.slotId`]}
                          quantityError={editor.errors[`${prefix}.plannedTotal`]}
                          onChange={(change) => changeLine(itemIndex, lineIndex, change)}
                          onSearch={onSlotSearchChange}
                          onOpenMap={() => setMapTarget({ itemIndex, lineIndex })}
                          onRemove={() =>
                            editor.change(
                              editor.draft.map((draft, index) =>
                                index === itemIndex
                                  ? {
                                      ...draft,
                                      lines: draft.lines.filter((_, index) => index !== lineIndex),
                                    }
                                  : draft
                              )
                            )
                          }
                        />
                      )
                    })}
                  </div>
                  {entry.lines.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-3 text-xs">
                      Chưa tìm được vị trí đủ điều kiện. Chọn trên sơ đồ hoặc thử lại gợi ý.
                    </p>
                  ) : null}
                  <FieldError>{editor.errors[`items.${itemIndex}.lines`]}</FieldError>
                </CollapsibleContent>
              </Collapsible>
            </article>
          ))}
        </div>
      </section>
      <footer className="bg-background/95 sticky bottom-0 z-10 mt-auto flex flex-wrap items-center justify-between gap-3 border-t py-3 supports-backdrop-filter:backdrop-blur">
        <p
          className="text-primary flex items-center gap-1.5 text-xs tabular-nums"
          role="status"
          aria-live="polite"
        >
          {completeCount === pendingGroups.length && pendingGroups.length > 0 ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : null}
          Phân bổ {completeCount}/{pendingGroups.length} sản phẩm
        </p>
        {canManage ? (
          <Button
            type="button"
            disabled={disabled || !editor.isDirty}
            aria-busy={editor.isPending}
            onClick={() => void save()}
          >
            {editor.isPending ? <Spinner aria-hidden="true" /> : <Send aria-hidden="true" />}
            {editor.isPending ? 'Đang lưu…' : 'Lưu vị trí cất hàng'}
          </Button>
        ) : null}
      </footer>
      <TransferSlotMapDialog
        open={Boolean(mapTarget)}
        warehouseId={transfer.destinationWarehouseId}
        title="Chọn vị trí cất hàng"
        description="Chọn vị trí đang nhận hàng tại kho nhập."
        onOpenChange={(open) => {
          if (!open) setMapTarget(null)
        }}
        onConfirm={(pick) => {
          if (mapTarget) {
            const entry = editor.draft[mapTarget.itemIndex]
            const duplicated = entry?.lines.some(
              (line, index) => index !== mapTarget.lineIndex && line.slotId === pick.slotId
            )
            if (duplicated) {
              toast.error('Vị trí này đã được chọn cho sản phẩm. Hãy cộng số lượng vào dòng cũ.')
              setMapTarget(null)
              return
            }
            changeLine(mapTarget.itemIndex, mapTarget.lineIndex, {
              slotId: pick.slotId,
              path: pick.label,
            })
          }
          setMapTarget(null)
        }}
      />
    </div>
  )
}
