'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type {
  CancelCycleCountFormValues,
  CreateStockAdjustmentVoucherFormValues,
  RecountFormValues,
} from '../../schemas/cycle-count.schema'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatCycleCountDate } from '../../utils/cycle-count-format'
import { CycleCountActionDialog } from './CycleCountActionDialog'
import { CycleCountAdjustmentBanner } from './CycleCountAdjustmentBanner'
import { CycleCountDetailHeader } from './CycleCountDetailHeader'
import { CycleCountDamagePanel } from './CycleCountDamagePanel'
import { CycleCountInfoSection } from './CycleCountInfoSection'
import { CycleCountItemsTable } from './CycleCountItemsTable'
import { CycleCountResolutionSummary } from './CycleCountResolutionSummary'
import { CycleCountUrgentBanner } from './CycleCountUrgentBanner'
import { CycleCountLinesSummary } from './CycleCountLinesSummary'
import type {
  CycleCountDetailMode,
  CycleCountDialog,
  CycleCountEvidenceActions,
  CycleCountItemFilter,
  CycleCountRecordEntry,
} from './types'

const ITEM_FILTERS: readonly CycleCountItemFilter[] = ['all', 'uncounted', 'counted', 'variance']

// Bộ lọc mở sẵn từ đường dẫn (?filter=variance); giá trị lạ thì bỏ qua.
function readInitialFilter(): CycleCountItemFilter {
  if (typeof window === 'undefined') return 'all'
  const value = new URLSearchParams(window.location.search).get('filter')
  return ITEM_FILTERS.find((filter) => filter === value) ?? 'all'
}

interface CycleCountDetailViewProps {
  readonly detail: CycleCountDetail
  readonly mode: CycleCountDetailMode
  readonly allowedActions: readonly string[]
  readonly isPending: boolean
  readonly isBeforeSchedule: boolean
  readonly evidenceActions: CycleCountEvidenceActions
  readonly canConfirmDamage: boolean
  readonly canOpenDamageCases: boolean
  readonly onConfirmDamage: (itemIds: string[]) => Promise<boolean>
  readonly canCreateAdjustment: boolean
  readonly recountForm: UseFormReturn<RecountFormValues>
  readonly voucherForm: UseFormReturn<CreateStockAdjustmentVoucherFormValues>
  readonly cancelForm: UseFormReturn<CancelCycleCountFormValues>
  readonly onSaveItems: (entries: readonly CycleCountRecordEntry[]) => Promise<boolean>
  readonly onStart: () => Promise<boolean>
  readonly onSubmit: () => Promise<void>
  readonly onRecount: (itemIds: string[], reason: string) => Promise<boolean>
  readonly onFinalize: () => Promise<void>
  readonly onExport: () => Promise<void>
  readonly onCancel: (reason: string) => Promise<boolean>
  readonly onCreateVoucher: (itemIds: string[], reason: string) => Promise<boolean>
}

export function CycleCountDetailView({
  detail,
  mode,
  allowedActions,
  isPending,
  isBeforeSchedule,
  evidenceActions,
  canConfirmDamage,
  canOpenDamageCases,
  onConfirmDamage,
  canCreateAdjustment,
  recountForm,
  voucherForm,
  cancelForm,
  onSaveItems,
  onStart,
  onSubmit,
  onRecount,
  onFinalize,
  onExport,
  onCancel,
  onCreateVoucher,
}: CycleCountDetailViewProps) {
  const [dialog, setDialog] = useState<CycleCountDialog | null>(null)
  const [initialFilter] = useState(readInitialFilter)
  const isLines = mode === 'lines'
  // Dòng được chọn sẵn từ panel hàng hỏng chỉ giữ lại nếu quản lý xác nhận đếm lại.
  const [isRecountFromPanel, setIsRecountFromPanel] = useState(false)
  const selectedItemIds = recountForm.watch('itemIds')
  const countableItems = detail.items.filter(
    (item) => detail.status !== 'Recount' || item.requestedRecountRound === detail.recountRound
  )
  const allCounted =
    countableItems.length > 0 && countableItems.every((item) => item.countedQuantity !== null)
  const countedCount = detail.items.filter((item) => item.countedQuantity !== null).length
  const hasHiddenQuantity = detail.items.some((item) => item.systemQuantity === null)
  const varianceCount = hasHiddenQuantity
    ? null
    : detail.items.filter((item) => item.difference !== null && item.difference !== 0).length
  const showResolution =
    (detail.status === 'Submitted' || detail.status === 'Completed') && (varianceCount ?? 0) > 0

  function toggleSelect(itemId: string, checked: boolean) {
    recountForm.setValue(
      'itemIds',
      checked ? [...selectedItemIds, itemId] : selectedItemIds.filter((id) => id !== itemId),
      { shouldValidate: true }
    )
  }

  // Dòng lệch chưa có phiếu điều chỉnh đang chờ duyệt hoặc đã duyệt.
  const adjustableItems = detail.items.filter(
    (item) => item.difference !== null && item.difference !== 0 && !item.activeAdjustmentId
  )

  // Một dialog cho cả hai lối vào: từng dòng = chỉ tick sẵn dòng đó, banner = tick sẵn tất cả.
  function openAdjustment(itemIds: string[]) {
    voucherForm.reset({ cycleCountItemIds: itemIds, reason: '' })
    setDialog('adjustment')
  }

  const pendingDamageCount =
    detail.status === 'Submitted'
      ? detail.items.filter(
          (item) => (item.countedDamagedQuantity ?? 0) > 0 && item.damageConfirmedAt === null
        ).length
      : 0

  async function confirmDialog() {
    if (dialog === 'start') {
      if (await onStart()) setDialog(null)
    } else if (dialog === 'recount')
      await recountForm.handleSubmit(async (values) => {
        if (await onRecount(values.itemIds, values.reason.trim())) {
          recountForm.reset({ itemIds: [], reason: '' })
          setDialog(null)
        }
      })()
    else if (dialog === 'cancel')
      await cancelForm.handleSubmit(async (values) => {
        if (await onCancel(values.reason.trim())) {
          cancelForm.reset({ reason: '' })
          setDialog(null)
        }
      })()
    else if (dialog === 'adjustment')
      await voucherForm.handleSubmit(async (values) => {
        if (await onCreateVoucher(values.cycleCountItemIds, values.reason.trim())) {
          voucherForm.reset({ cycleCountItemIds: [], reason: '' })
          setDialog(null)
        }
      })()
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <CycleCountDetailHeader
        detail={detail}
        mode={mode}
        allowedActions={allowedActions}
        isPending={isPending}
        recountSelectedCount={selectedItemIds.length}
        isBeforeSchedule={isBeforeSchedule}
        pendingDamageCount={pendingDamageCount}
        onFinalize={onFinalize}
        onExport={onExport}
        onOpenDialog={(next) => {
          if (next === 'recount') setIsRecountFromPanel(false)
          setDialog(next)
        }}
      />
      <CycleCountUrgentBanner detail={detail} canStart={allowedActions.includes('Start')} />
      {detail.status === 'Cancelled' ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>
            Phiếu đã bị huỷ
            {detail.cancelledAt ? ` lúc ${formatCycleCountDate(detail.cancelledAt)}` : ''}
            {detail.cancelledByName ? ` bởi ${detail.cancelledByName}` : ''}. Lý do:{' '}
            {detail.cancelReason ?? '—'}
          </AlertDescription>
        </Alert>
      ) : null}
      {detail.status === 'Completed' ? (
        <CycleCountAdjustmentBanner
          items={detail.items}
          canCreateAdjustment={canCreateAdjustment}
          isPending={isPending}
          onCreateAll={() => openAdjustment(adjustableItems.map((item) => item.id))}
        />
      ) : null}
      {isLines ? null : (
        <>
          <CycleCountDamagePanel
            detail={detail}
            canConfirm={canConfirmDamage}
            canOpenDamageCases={canOpenDamageCases}
            isPending={isPending}
            evidenceActions={evidenceActions}
            onConfirm={onConfirmDamage}
            onRecountItem={(itemId) => {
              recountForm.setValue('itemIds', [itemId], { shouldValidate: true })
              setIsRecountFromPanel(true)
              setDialog('recount')
            }}
          />
          <CycleCountInfoSection
            detail={detail}
            countedCount={countedCount}
            varianceCount={varianceCount}
          />
          <CycleCountLinesSummary
            detail={detail}
            countedCount={countedCount}
            varianceCount={varianceCount}
          />
        </>
      )}
      {isLines ? (
        <CycleCountItemsTable
          detail={detail}
          initialFilter={initialFilter}
          allowedActions={allowedActions}
          isPending={isPending}
          canCreateAdjustment={canCreateAdjustment}
          selectedItemIds={selectedItemIds}
          onToggleSelect={toggleSelect}
          canSubmit={allCounted}
          isBeforeSchedule={isBeforeSchedule}
          evidenceActions={evidenceActions}
          onSaveItems={onSaveItems}
          onSubmit={onSubmit}
          onCreateAdjustment={(itemId) => openAdjustment([itemId])}
        />
      ) : null}
      {!isLines && showResolution ? <CycleCountResolutionSummary items={detail.items} /> : null}
      <CycleCountActionDialog
        dialog={dialog}
        recountForm={recountForm}
        voucherForm={voucherForm}
        cancelForm={cancelForm}
        recountSelectedCount={selectedItemIds.length}
        adjustableItems={adjustableItems}
        isPending={isPending}
        onClose={() => {
          if (dialog === 'recount' && isRecountFromPanel) recountForm.setValue('itemIds', [])
          setIsRecountFromPanel(false)
          setDialog(null)
        }}
        onConfirm={confirmDialog}
      />
    </div>
  )
}
