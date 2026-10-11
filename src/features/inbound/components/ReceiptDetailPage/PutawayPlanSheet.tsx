'use client'

import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type {
  GoodsReceiptItem,
  PutAwayHeldSlot,
  PutAwaySuggestionsResponse,
} from '../../types/inbound.types'
import {
  PutawayLocationSelect,
  PutawaySuggestionList,
  PutawaySuggestionSummary,
  type SlotOption,
} from '../PutawayDetailPage'
import type { PlanDraftValidation, PlanDrafts } from '../../utils/putaway-plan-draft'
import { getHeldSlotWarning, getUnplannedQuantity } from '../../utils/putaway-plan-draft'

interface PutawayPlanSheetProps {
  readonly open: boolean
  readonly receiptCode: string
  readonly items: readonly GoodsReceiptItem[]
  readonly slots: readonly SlotOption[]
  readonly drafts: PlanDrafts
  readonly validation: PlanDraftValidation
  readonly suggestions: PutAwaySuggestionsResponse | null
  /** Vị trí đang chừa cho hàng sắp về; có ngay khi mở, không cần bấm gợi ý. */
  readonly heldSlots?: readonly PutAwayHeldSlot[]
  readonly isLoadingSlots: boolean
  readonly isSlotsError: boolean
  readonly isSuggesting: boolean
  readonly isSaving: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRetrySlots: () => void
  readonly onAddLine: (itemId: string) => void
  readonly onChangeLine: (
    itemId: string,
    key: string,
    patch: { slotId?: string; quantity?: number }
  ) => void
  readonly onRemoveLine: (itemId: string, key: string) => void
  readonly onFillRemaining: (itemId: string, key: string) => void
  readonly onSuggest: () => void
  readonly onApplySuggestion: (itemId: string, slotId: string) => void
  readonly onApplyBestSuggestions: () => void
  readonly onSave: () => void
}

export function PutawayPlanSheet({
  open,
  receiptCode,
  items,
  slots,
  drafts,
  validation,
  suggestions,
  heldSlots,
  isLoadingSlots,
  isSlotsError,
  isSuggesting,
  isSaving,
  onOpenChange,
  onRetrySlots,
  onAddLine,
  onChangeLine,
  onRemoveLine,
  onFillRemaining,
  onSuggest,
  onApplySuggestion,
  onApplyBestSuggestions,
  onSave,
}: PutawayPlanSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw]">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Cấu hình vị trí cất hàng</SheetTitle>
          <SheetDescription>
            Phiếu {receiptCode}. Nhân viên được giao sẽ thấy và làm theo; họ vẫn có thể cất khác vị
            trí nhưng phải nhập lý do.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-tertiary/40 text-tertiary hover:text-tertiary"
              disabled={isSuggesting}
              onClick={onSuggest}
            >
              {isSuggesting ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Sparkles aria-hidden="true" data-icon="inline-start" />
              )}
              {isSuggesting ? 'Đang phân tích…' : 'Gợi ý vị trí bằng AI'}
            </Button>
            {suggestions ? (
              <Button type="button" variant="ghost" size="sm" onClick={onApplyBestSuggestions}>
                Áp dụng phân bổ gợi ý cho dòng chưa cấu hình
              </Button>
            ) : null}
            {suggestions ? null : (
              <p className="text-muted-foreground text-xs" role="status">
                Số lượng cấu hình tính theo đơn vị gốc của sản phẩm.
              </p>
            )}
          </div>
          {suggestions ? <PutawaySuggestionSummary suggestions={suggestions} /> : null}

          {isSlotsError ? (
            <Alert variant="destructive">
              <AlertTitle>Không tải được danh sách vị trí</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                Vui lòng thử lại.
                <Button type="button" variant="outline" size="sm" onClick={onRetrySlots}>
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Phiếu này không còn dòng hàng nào cần cất.
            </p>
          ) : (
            items.map((item) => {
              const lines = drafts[item.id] ?? []
              const itemError = validation.itemErrors.get(item.id)
              const unplanned = getUnplannedQuantity(item, lines)
              const itemSuggestion = suggestions?.items.find(
                (entry) => entry.goodsReceiptItemId === item.id
              )
              return (
                <section key={item.id} className="border" aria-label={item.productName}>
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b p-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold break-words">
                        {item.productSKU} - {item.productName}
                        {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                      </h3>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        Còn phải cất {formatQuantity(item.remainingPutAwayQuantity)}{' '}
                        {item.baseUnitName} · chưa cấu hình {formatQuantity(unplanned)}{' '}
                        {item.baseUnitName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoadingSlots}
                      onClick={() => onAddLine(item.id)}
                    >
                      <Plus aria-hidden="true" data-icon="inline-start" />
                      Thêm vị trí
                    </Button>
                  </div>

                  {itemError ? (
                    <p
                      role="alert"
                      className="text-destructive animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 border-b px-3 py-2 text-xs motion-reduce:animate-none"
                    >
                      {itemError}
                    </p>
                  ) : null}

                  {lines.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-3 text-xs">
                      Chưa cấu hình. Nhân viên sẽ tự chọn vị trí cho dòng hàng này.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {lines.map((line, index) => {
                        const key = `${item.id}:${line.key}`
                        const error = validation.lineErrors.get(key)
                        const warning = validation.lineWarnings.get(key)
                        const heldWarning = getHeldSlotWarning(
                          heldSlots ?? suggestions?.heldSlots,
                          line.slotId,
                          item.productId
                        )
                        const slotFieldId = `plan-slot-${item.id}-${line.key}`
                        const quantityFieldId = `plan-quantity-${item.id}-${line.key}`
                        return (
                          <div
                            key={line.key}
                            className="animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 grid gap-3 p-3 motion-reduce:animate-none sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]"
                          >
                            <Field data-invalid={Boolean(error)}>
                              <FieldLabel htmlFor={slotFieldId}>Vị trí {index + 1}</FieldLabel>
                              <PutawayLocationSelect
                                id={slotFieldId}
                                invalid={Boolean(error)}
                                disabled={isSaving || isLoadingSlots}
                                slots={slots}
                                value={line.slotId}
                                onChange={(slotId) => onChangeLine(item.id, line.key, { slotId })}
                              />
                              {error ? <FieldError>{error}</FieldError> : null}
                              {warning ? (
                                <p className="text-warning text-xs" role="status">
                                  {warning}. Lúc cất hệ thống vẫn kiểm tra lại sức chứa.
                                </p>
                              ) : null}
                              {heldWarning ? (
                                <p className="text-warning text-xs" role="status">
                                  {heldWarning}
                                </p>
                              ) : null}
                            </Field>
                            <Field data-invalid={Boolean(error)}>
                              <FieldLabel htmlFor={quantityFieldId}>
                                Số lượng ({item.baseUnitName})
                              </FieldLabel>
                              <Input
                                id={quantityFieldId}
                                type="number"
                                min={0.01}
                                step={0.01}
                                disabled={isSaving}
                                aria-invalid={Boolean(error)}
                                value={Number.isFinite(line.quantity) ? line.quantity : ''}
                                onChange={(event) =>
                                  onChangeLine(item.id, line.key, {
                                    quantity: event.target.valueAsNumber,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSaving || unplanned <= 0}
                                onClick={() => onFillRemaining(item.id, line.key)}
                              >
                                Điền phần còn lại
                              </Button>
                            </Field>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isSaving}
                                aria-label={`Xóa vị trí ${index + 1} của ${item.productName}`}
                                onClick={() => onRemoveLine(item.id, line.key)}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {itemSuggestion &&
                  (itemSuggestion.suggestions.length > 0 ||
                    itemSuggestion.unallocatedQuantity > 0) ? (
                    <div className="bg-muted/40 animate-in fade-in-0 slide-in-from-top-2 animation-duration-250 border-t p-3 motion-reduce:animate-none">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                        <Sparkles aria-hidden="true" className="text-tertiary size-3" />
                        Gợi ý vị trí
                      </p>
                      <PutawaySuggestionList
                        entry={itemSuggestion}
                        unitName={item.baseUnitName}
                        disabled={isSaving}
                        usedSlotIds={new Set(lines.map((line) => line.slotId).filter(Boolean))}
                        onApply={(slotId) => onApplySuggestion(item.id, slotId)}
                      />
                    </div>
                  ) : null}
                </section>
              )
            })
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={!validation.canSave || isSaving} onClick={onSave}>
            {isSaving ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
            Lưu vị trí cất hàng
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
