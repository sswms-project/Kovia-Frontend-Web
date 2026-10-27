'use client'

import { RefreshCw } from 'lucide-react'
import type { QueryKey } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { TaskSplitStateResponse } from '../types/task-splitting.types'
import { TaskPartsPanel } from './TaskPartsPanel'
import { TaskSplitDialog } from './TaskSplitDialog'
import { TaskSplitReminder } from './TaskSplitReminder'

export interface TaskSplitSectionProps {
  /** Split state owned by the page (`useTaskSplitQuery`). */
  readonly state: TaskSplitStateResponse | undefined
  readonly isError: boolean
  readonly onRetry: () => void
  /** Owned by the page so its own "Chia việc" action opens the same dialog. */
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Query keys of the source page to refresh after a split or part change. */
  readonly invalidateKeys?: readonly QueryKey[]
}

/**
 * Reminder, parts panel and split dialog of one source task. Splitting is secondary to the page, so a
 * loading state renders nothing and a failed load only shows a retry line.
 */
export function TaskSplitSection({
  state,
  isError,
  onRetry,
  open,
  onOpenChange,
  invalidateKeys,
}: TaskSplitSectionProps) {
  if (!state) {
    if (!isError) return null
    return (
      <Alert variant="destructive" className="flex flex-wrap items-center gap-3">
        <AlertDescription className="flex-1 text-sm">
          Không thể tải thông tin chia việc.
        </AlertDescription>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Thử lại
        </Button>
      </Alert>
    )
  }

  // Panel and dialog stay mounted while the split flips so their pending toasts are never dropped.
  return (
    <>
      <TaskSplitReminder state={state} onSplit={() => onOpenChange(true)} />
      <TaskPartsPanel state={state} invalidateKeys={invalidateKeys} />
      <TaskSplitDialog
        open={open}
        onOpenChange={onOpenChange}
        state={state}
        invalidateKeys={invalidateKeys}
      />
    </>
  )
}
