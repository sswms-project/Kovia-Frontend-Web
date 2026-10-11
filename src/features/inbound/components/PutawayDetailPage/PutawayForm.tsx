'use client'

import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  MapPinned,
  PackageCheck,
  Plus,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { useWatch, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { FieldError } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { PutawayFormValues } from '../../schemas/inbound.schema'
import {
  getPutawayAllocationState,
  getPutawayFillRemaining,
} from '../../schemas/putaway-allocation.schema'
import { formatPutawayQuantity } from '../../utils/putaway-units'
import {
  hasPutawayPlan,
  isPutawayDeviationReasonValid,
  type PutawayPlanDeviation,
} from '../../utils/putaway-plan'
import type { GoodsReceiptDetail, GoodsReceiptItem } from '../../types/inbound.types'
import { PUTAWAY_ROW_GRID, PutawayAllocationRow } from './PutawayAllocationRow'
import { PutawayDeviationPanel, type PutawayEvidenceState } from './PutawayDeviationPanel'
import { PutawayPlanNotice } from './PutawayPlanNotice'
import { PutawayScanBar, type PutawayScanState } from './PutawayScanBar'
import { PutawaySuggestionPanel, type PutawaySuggestionState } from './PutawaySuggestionPanel'

export interface SlotOption {
  id: string
  code: string
  name: string
  zoneId: string
  zoneLabel: string
  hierarchy: string
  allowsMixedProducts?: boolean
  capacityLabel: string
  unavailableReason?: string
}

export interface PutawayPlanningState {
  readonly assigneeName: string | null
  readonly isSaving: boolean
  /** Có quyền cấu hình vị trí cất; thiếu thì chỉ giao việc được. */
  readonly canSavePlan: boolean
  readonly canAssign: boolean
  readonly onSavePlan: () => void
  readonly onAssign: () => void
}

interface PutawayFormProps {
  readonly receipt: GoodsReceiptDetail
  readonly form: UseFormReturn<PutawayFormValues>
  readonly fields: readonly FieldArrayWithId<PutawayFormValues, 'lines', 'id'>[]
  readonly slots: readonly SlotOption[]
  readonly isPending: boolean
  readonly hasUncertainSubmission?: boolean
  readonly planDeviation: PutawayPlanDeviation
  /** Cảnh báo theo chỉ số dòng đang chọn vị trí chừa cho sản phẩm khác sắp về. */
  readonly heldWarnings?: ReadonlyMap<number, string>
  readonly deviationTitle?: string
  readonly evidence: PutawayEvidenceState
  readonly canPlan?: boolean
  readonly suggestion?: PutawaySuggestionState
  readonly canCancel: boolean
  readonly cancelLabel?: string
  /**
   * Người xem là quản lý chứ không phải người được giao cất: màn này dùng để chốt vị trí rồi báo
   * cho nhân viên, không ghi nhận cất hàng.
   */
  readonly planning?: PutawayPlanningState
  /** Trạng thái quét mã vị trí của người đi cất; không có khi phiếu chưa được giao vị trí. */
  readonly scan?: PutawayScanState
  readonly onPlan?: () => void
  readonly onCancel: () => void
  readonly onApplyPlan: () => void
  /** Thêm một dòng phân bổ; có `itemId` thì dòng mới thuộc sẵn sản phẩm đó. */
  readonly onAdd: (itemId?: string) => void
  readonly onRemove: (index: number) => void
  readonly onSubmit: () => void
}

export function PutawayForm({
  receipt,
  form,
  fields,
  slots,
  isPending,
  hasUncertainSubmission = false,
  planDeviation,
  heldWarnings,
  deviationTitle,
  evidence,
  canPlan = false,
  suggestion,
  canCancel,
  cancelLabel = 'Hủy phần còn lại',
  planning,
  scan,
  onPlan,
  onCancel,
  onApplyPlan,
  onAdd,
  onRemove,
  onSubmit,
}: PutawayFormProps) {
  const {
    formState: { errors, isSubmitted, touchedFields },
  } = form
  const lines = useWatch({ control: form.control, name: 'lines' })
  const overrideReason = useWatch({ control: form.control, name: 'overrideReason' })
  const overrideReasonCode = useWatch({ control: form.control, name: 'overrideReasonCode' })
  const noteRequired = !overrideReasonCode || overrideReasonCode === 'Other'
  const reasonMissing =
    planDeviation.requiresReason &&
    !isPutawayDeviationReasonValid(overrideReasonCode, overrideReason)
  const reasonError =
    reasonMissing && (isSubmitted || (overrideReason ?? '').length > 0)
      ? 'Vui lòng chọn nhóm lý do hoặc mô tả lý do (tối thiểu 5 ký tự).'
      : null
  const allocationLocked = isPending || hasUncertainSubmission || Boolean(planning?.isSaving)
  // Chưa quét đủ mã thì chưa xác nhận được, trừ khi người cất đã báo không quét được và nêu lý do.
  const scanMissing =
    scan && !planning && !scan.skipRequested ? scan.requiredCount - scan.confirmedCount : 0
  // Nhóm sản phẩm người dùng đã thu gọn; mặc định mở hết để không giấu lỗi.
  const [collapsedItemIds, setCollapsedItemIds] = useState<ReadonlySet<string>>(new Set())
  const toggleItem = (itemId: string) =>
    setCollapsedItemIds((current) => {
      const next = new Set(current)
      if (!next.delete(itemId)) next.add(itemId)
      return next
    })
  const allocation = getPutawayAllocationState(lines, receipt.items, slots)
  const pendingItems = receipt.items.filter((item) => item.remainingPutAwayQuantity > 0)
  const isFullyAllocated = (item: GoodsReceiptItem) =>
    (allocation.assignedByItem.get(item.id) ?? 0) ===
    Math.round(item.remainingPutAwayQuantity * 100)
  const fullyAllocated = pendingItems.filter(isFullyAllocated).length

  const entries = fields.flatMap((field, index) => {
    const line = lines[index]
    return line ? [{ field, index, line }] : []
  })
  // Sản phẩm vừa được cất hết ở nơi khác vẫn giữ nhóm của nó chừng nào còn dòng đang nhập.
  const groupedItems = receipt.items.filter(
    (item) =>
      item.remainingPutAwayQuantity > 0 ||
      entries.some((entry) => entry.line.goodsReceiptItemId === item.id)
  )
  const groupedItemIds = new Set(groupedItems.map((item) => item.id))
  const looseEntries = entries.filter((entry) => !groupedItemIds.has(entry.line.goodsReceiptItemId))
  const slotCodeById = new Map(slots.map((slot) => [slot.id, slot.code]))
  const usedSlotIdsByItem = new Map<string, Set<string>>()
  for (const { line } of entries) {
    if (!line.goodsReceiptItemId || !line.slotId) continue
    const used = usedSlotIdsByItem.get(line.goodsReceiptItemId) ?? new Set<string>()
    used.add(line.slotId)
    usedSlotIdsByItem.set(line.goodsReceiptItemId, used)
  }

  const renderRow = (
    { field, index, line }: (typeof entries)[number],
    showProductSelect: boolean
  ) => {
    const item = receipt.items.find((candidate) => candidate.id === line.goodsReceiptItemId)
    return (
      <PutawayAllocationRow
        key={field.id}
        index={index}
        receipt={receipt}
        form={form}
        line={line}
        row={allocation.rows[index]!}
        assignedByItem={allocation.assignedByItem}
        slots={slots}
        locked={allocationLocked}
        showRequiredErrors={isSubmitted || Boolean(touchedFields.lines?.[index])}
        fillRemaining={getPutawayFillRemaining(lines, index, receipt.items, slots)}
        planStatus={
          // Nhãn theo/khác kế hoạch dành cho người đi cất; người đang soạn kế hoạch không cần.
          !planning && item && hasPutawayPlan(item)
            ? planDeviation.offPlanRows.has(index)
              ? 'offPlan'
              : 'onPlan'
            : null
        }
        heldWarning={heldWarnings?.get(index)}
        scan={planning ? 'none' : item && hasPutawayPlan(item) ? 'required' : 'optional'}
        showProductSelect={showProductSelect}
        onRemove={onRemove}
      />
    )
  }

  return (
    // `relative`: nhãn/ô ẩn dành cho trình đọc màn hình là phần tử absolute; neo chúng vào đây để
    // chúng không làm khung <main> (overflow hidden) bên ngoài bị cuộn và che mất đầu trang.
    <div className="relative flex min-h-full w-full min-w-0 shrink-0 flex-col gap-5">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link
              href={APP_ROUTES.inboundPutaway as Route}
              aria-label="Quay lại danh sách"
              aria-disabled={allocationLocked}
              onClick={(event) => {
                if (allocationLocked) event.preventDefault()
              }}
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-primary text-xs font-medium">Cất hàng</p>
            <h1 className="font-mono text-xl font-semibold break-words">{receipt.receiptCode}</h1>
            <p className="text-muted-foreground mt-1 text-xs break-words sm:text-sm">
              {receipt.inboundRequestCode} · {receipt.warehouseName}
            </p>
          </div>
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {canPlan && onPlan && !planning ? (
            <Button type="button" variant="outline" disabled={allocationLocked} onClick={onPlan}>
              <MapPinned aria-hidden="true" />
              Cấu hình vị trí cất
            </Button>
          ) : null}
          {planning?.canAssign ? (
            <Button
              type="button"
              variant="outline"
              disabled={allocationLocked}
              onClick={planning.onAssign}
            >
              <UserPlus aria-hidden="true" />
              {planning.assigneeName ? 'Giao lại nhân viên' : 'Giao nhân viên'}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="destructive"
              disabled={allocationLocked}
              onClick={onCancel}
            >
              <Ban aria-hidden="true" />
              {cancelLabel}
            </Button>
          ) : null}
        </div>
      </header>

      {planning ? (
        <p
          className="bg-muted/40 border-l-primary border border-l-4 px-4 py-3 text-sm"
          role="status"
        >
          {!planning.canSavePlan ? (
            <>
              Nhiệm vụ cất hàng{' '}
              {planning.assigneeName ? (
                <>
                  đang giao cho <strong>{planning.assigneeName}</strong>
                </>
              ) : (
                <strong>chưa giao cho ai</strong>
              )}
              . Chỉ nhân viên được giao mới ghi nhận cất hàng; bạn có thể giao hoặc giao lại nhiệm
              vụ. Tài khoản của bạn chưa có quyền “Cấu hình vị trí cất hàng” nên chưa lưu được vị
              trí cho nhân viên.
            </>
          ) : planning.assigneeName ? (
            <>
              Nhiệm vụ cất hàng đang giao cho <strong>{planning.assigneeName}</strong>. Chốt vị trí
              bên dưới rồi bấm “Lưu vị trí & báo nhân viên”; nhân viên sẽ nhận thông báo và làm
              theo.
            </>
          ) : (
            <>
              Nhiệm vụ cất hàng <strong>chưa giao cho ai</strong>. Chốt vị trí bên dưới rồi bấm “Lưu
              vị trí & giao nhân viên” để chọn người thực hiện.
            </>
          )}
        </p>
      ) : null}
      <PutawayPlanNotice receipt={receipt} disabled={allocationLocked} onApplyPlan={onApplyPlan} />
      {errors.root?.server?.message ? <FieldError>{errors.root.server.message}</FieldError> : null}

      <section className="bg-card border" aria-labelledby="putaway-allocation-title">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="putaway-allocation-title" className="text-sm font-semibold">
              Chọn vị trí cất cho từng sản phẩm
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <Progress
                className="max-w-56"
                value={pendingItems.length === 0 ? 0 : (fullyAllocated / pendingItems.length) * 100}
                aria-label="Tiến độ phân bổ"
              />
              <p className="text-muted-foreground text-xs tabular-nums" role="status">
                Đã phân bổ đủ {fullyAllocated}/{pendingItems.length} sản phẩm
              </p>
            </div>
          </div>
          {groupedItems.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsedItemIds(
                  collapsedItemIds.size === groupedItems.length
                    ? new Set()
                    : new Set(groupedItems.map((item) => item.id))
                )
              }
            >
              {collapsedItemIds.size === groupedItems.length ? 'Mở tất cả' : 'Thu gọn tất cả'}
            </Button>
          ) : null}
          {suggestion ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-tertiary/40 text-tertiary hover:text-tertiary"
              disabled={allocationLocked || suggestion.isSuggesting}
              onClick={suggestion.onSuggest}
            >
              {suggestion.isSuggesting ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {suggestion.isSuggesting ? 'Đang phân tích…' : 'Gợi ý vị trí bằng AI'}
            </Button>
          ) : null}
        </div>
        {suggestion ? (
          <PutawaySuggestionPanel
            items={receipt.items}
            state={suggestion}
            disabled={allocationLocked}
            usedSlotIdsByItem={usedSlotIdsByItem}
          />
        ) : null}

        {scan && !planning && scan.requiredCount > 0 ? (
          <PutawayScanBar
            state={scan}
            slots={slots}
            lines={entries.map(({ index, line }) => ({
              index,
              slotId: line.slotId,
              confirmedSlotCode: line.confirmedSlotCode,
            }))}
            disabled={allocationLocked}
            onConfirm={(index, code) =>
              form.setValue(`lines.${index}.confirmedSlotCode`, code, { shouldDirty: true })
            }
          />
        ) : null}
        <div className="divide-y">
          {groupedItems.map((item) => {
            const itemEntries = entries.filter((entry) => entry.line.goodsReceiptItemId === item.id)
            const requested = (allocation.requestedByItem.get(item.id) ?? 0) / 100
            const assigned = (allocation.assignedByItem.get(item.id) ?? 0) / 100
            const excess = Math.round((requested - item.remainingPutAwayQuantity) * 100) / 100
            const missing =
              Math.round((item.remainingPutAwayQuantity - Math.max(assigned, requested)) * 100) /
              100
            const collapsed = collapsedItemIds.has(item.id)
            return (
              <article key={item.id} aria-label={`${item.productSKU} - ${item.productName}`}>
                <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-expanded={!collapsed}
                      aria-label={`${collapsed ? 'Mở' : 'Thu gọn'} ${item.productSKU}`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={cn('transition-transform', collapsed && '-rotate-90')}
                      />
                    </Button>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold break-words">
                        {item.productSKU} - {item.productName}
                        {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                      </h3>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        Còn phải cất {formatPutawayQuantity(item, item.remainingPutAwayQuantity)} ·
                        đang phân bổ {formatPutawayQuantity(item, requested)} vào{' '}
                        {itemEntries.length} vị trí
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* `key` theo trạng thái để nhãn nảy nhẹ mỗi khi đổi từ thiếu sang đủ hay vượt. */}
                    {excess > 0 ? (
                      <Badge
                        key="over"
                        variant="destructive"
                        className="animate-in fade-in-0 zoom-in-95 animation-duration-200 motion-reduce:animate-none"
                      >
                        Vượt {formatPutawayQuantity(item, excess)}
                      </Badge>
                    ) : isFullyAllocated(item) ? (
                      <Badge
                        key="full"
                        variant="secondary"
                        className="animate-in fade-in-0 zoom-in-95 animation-duration-200 motion-reduce:animate-none"
                      >
                        <Check aria-hidden="true" />
                        Đã đủ
                      </Badge>
                    ) : missing > 0 ? (
                      <Badge
                        key="missing"
                        variant="outline"
                        className="border-warning text-warning animate-in fade-in-0 zoom-in-95 animation-duration-200 motion-reduce:animate-none"
                      >
                        Còn thiếu {formatPutawayQuantity(item, missing)}
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={allocationLocked}
                      onClick={() => onAdd(item.id)}
                    >
                      <Plus aria-hidden="true" />
                      Chia sang vị trí khác
                    </Button>
                  </div>
                </div>
                {collapsed ? (
                  <p className="text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 px-4 py-2 font-mono text-xs break-words motion-reduce:animate-none">
                    {itemEntries
                      .filter((entry) => entry.line.slotId)
                      .map(
                        (entry) =>
                          `${slotCodeById.get(entry.line.slotId) ?? '?'} × ${
                            Number.isFinite(entry.line.enteredQuantity)
                              ? entry.line.enteredQuantity
                              : '?'
                          }`
                      )
                      .join(' · ') || 'Chưa chọn vị trí'}
                  </p>
                ) : null}
                <Collapsible open={!collapsed}>
                  <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden motion-reduce:animate-none">
                    {itemEntries.length === 0 ? (
                      <p className="text-muted-foreground px-4 py-3 text-xs">
                        Chưa có vị trí nào cho sản phẩm này. Bấm “Chia sang vị trí khác” để thêm.
                      </p>
                    ) : (
                      <>
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
                          {itemEntries.map((entry) => renderRow(entry, false))}
                        </div>
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </article>
            )
          })}
          {looseEntries.length > 0 ? (
            <div aria-label="Dòng chưa chọn sản phẩm">
              {looseEntries.map((entry) => renderRow(entry, true))}
            </div>
          ) : null}
        </div>
        {allocation.canSubmit && scanMissing > 0 ? (
          <p
            className="text-warning animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 border-t px-4 py-3 text-xs motion-reduce:animate-none"
            role="status"
          >
            Còn {scanMissing} vị trí được giao chưa quét mã. Quét đủ mã để xác nhận cất hàng.
          </p>
        ) : null}
        {!allocation.canSubmit ? (
          <p className="text-muted-foreground border-t px-4 py-3 text-xs" role="status">
            Chọn vị trí và nhập số lượng trong giới hạn cho từng sản phẩm để xác nhận.
          </p>
        ) : null}
        {errors.lines?.root?.message ? (
          <div className="border-t p-3">
            <FieldError>{errors.lines.root.message}</FieldError>
          </div>
        ) : null}
      </section>
      {planDeviation.requiresReason && !planning ? (
        <PutawayDeviationPanel
          form={form}
          reasonError={reasonError}
          disabled={allocationLocked}
          evidence={evidence}
          title={deviationTitle}
          noteRequired={noteRequired}
        />
      ) : null}
      <footer className="bg-background/95 sticky bottom-0 z-10 -mx-3 mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 supports-backdrop-filter:backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5">
        <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
          <FooterStep
            done={pendingItems.length > 0 && fullyAllocated === pendingItems.length}
            label={`Phân bổ ${fullyAllocated}/${pendingItems.length} sản phẩm`}
          />
          {scan && !planning && scan.requiredCount > 0 ? (
            <FooterStep
              done={scan.confirmedCount >= scan.requiredCount}
              label={`Quét mã ${scan.confirmedCount}/${scan.requiredCount} vị trí`}
            />
          ) : null}
          {planDeviation.requiresReason && !planning ? (
            <FooterStep
              done={!reasonMissing}
              label={reasonMissing ? 'Chưa nêu lý do' : 'Đã nêu lý do'}
            />
          ) : null}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          {planning?.canSavePlan ? (
            <Button
              type="button"
              disabled={allocationLocked}
              aria-busy={planning.isSaving}
              onClick={planning.onSavePlan}
            >
              {planning.isSaving ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Send aria-hidden="true" data-icon="inline-start" />
              )}
              {planning.assigneeName ? 'Lưu vị trí & báo nhân viên' : 'Lưu vị trí & giao nhân viên'}
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn(planning && 'hidden')}
            disabled={
              isPending ||
              (!hasUncertainSubmission &&
                (!allocation.canSubmit || reasonMissing || scanMissing > 0))
            }
            aria-busy={isPending}
            onClick={onSubmit}
          >
            {isPending ? (
              <Spinner
                aria-hidden="true"
                data-icon="inline-start"
                className="motion-reduce:animate-none"
              />
            ) : (
              <PackageCheck aria-hidden="true" data-icon="inline-start" />
            )}
            {isPending
              ? 'Đang xử lý…'
              : hasUncertainSubmission
                ? 'Gửi lại an toàn'
                : 'Xác nhận cất hàng'}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function FooterStep({ done, label }: { readonly done: boolean; readonly label: string }) {
  return (
    <li className={cn('flex items-center gap-1.5', done && 'text-primary font-medium')}>
      {done ? (
        <Check
          aria-hidden="true"
          className="animate-in zoom-in-50 animation-duration-200 size-3.5 motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden="true" className="border-muted-foreground size-2.5 rounded-full border" />
      )}
      {label}
    </li>
  )
}
