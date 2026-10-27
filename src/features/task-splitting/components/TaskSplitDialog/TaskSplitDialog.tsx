'use client'

import { ArrowLeft, Check, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import type { QueryKey } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useTaskSplitPlan } from '../../hooks/use-task-split-plan'
import type { SplittableTaskType } from '../../types/task-splitting.types'
import { TaskSplitPlanTable } from './TaskSplitPlanTable'
import { TaskSplitStaffPicker } from './TaskSplitStaffPicker'

export interface TaskSplitDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly sourceType: SplittableTaskType
  readonly sourceId: string
  /** Query keys of the source page to refresh after the split is created. */
  readonly invalidateKeys?: readonly QueryKey[]
}

export function TaskSplitDialog({ open, onOpenChange, ...source }: TaskSplitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        {/* Mounted only while open, so every opening starts from a fresh suggestion. */}
        {open ? <TaskSplitDialogBody {...source} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

interface TaskSplitDialogBodyProps extends Omit<TaskSplitDialogProps, 'open' | 'onOpenChange'> {
  readonly onClose: () => void
}

function TaskSplitDialogBody({
  sourceType,
  sourceId,
  invalidateKeys,
  onClose,
}: TaskSplitDialogBodyProps) {
  const plan = useTaskSplitPlan(sourceType, sourceId, invalidateKeys, onClose)
  const activeQuery = plan.step === 'staff' ? plan.staffQuery : plan.planQuery

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chia việc {plan.code}</DialogTitle>
        <DialogDescription>
          {plan.step === 'staff'
            ? `Chọn người nhận phần việc. Người nhẹ việc được xếp trước${
                plan.recommendedPeople ? `; đề xuất ${plan.recommendedPeople} người` : ''
              }.`
            : 'Kiểm tra và chỉnh số lượng từng phần trước khi xác nhận.'}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] min-w-0 overflow-y-auto" data-scrollbar="slim">
        {activeQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : activeQuery.isError ? (
          <div className="flex flex-col items-start gap-2 border p-3 text-sm">
            <span>Không thể tải gợi ý chia việc.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeQuery.isFetching}
              onClick={() => void activeQuery.refetch()}
            >
              <RefreshCw aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : plan.step === 'staff' ? (
          <TaskSplitStaffPicker
            staff={plan.staff}
            checkedStaffIds={plan.checkedStaffIds}
            preselectedStaffIds={plan.preselectedStaffIds}
            disabled={false}
            onToggle={plan.toggleStaff}
          />
        ) : (
          <TaskSplitPlanTable
            rows={plan.rows}
            columns={plan.columns}
            draft={plan.draft}
            disabled={plan.isPending}
            onChangeQuantity={plan.changeQuantity}
          />
        )}
      </div>

      <DialogFooter>
        {plan.step === 'staff' ? (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              disabled={!plan.staffQuery.isSuccess || plan.checkedStaffIds.length === 0}
              onClick={plan.suggest}
            >
              <Sparkles aria-hidden="true" />
              Gợi ý chia
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={plan.isPending}
              onClick={plan.backToStaff}
            >
              <ArrowLeft aria-hidden="true" />
              Quay lại
            </Button>
            <Button type="button" disabled={!plan.canConfirm} onClick={plan.confirm}>
              {plan.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              Xác nhận
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  )
}
