'use client'

import { Split } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { TaskSplitStateResponse } from '../types/task-splitting.types'
import { formatScore } from '../utils/task-split-quantity'

interface TaskSplitReminderProps {
  readonly state: TaskSplitStateResponse | undefined
  readonly onSplit: () => void
}

export function TaskSplitReminder({ state, onSplit }: TaskSplitReminderProps) {
  if (!state?.splitSuggested || !state.canSplit) return null

  return (
    <Alert className="flex flex-wrap items-center gap-3">
      <AlertDescription className="text-foreground flex-1 text-sm">
        Việc lớn (điểm {formatScore(state.taskScore)}, ngưỡng {formatScore(state.threshold)}) — nên
        chia cho nhiều người
      </AlertDescription>
      <Button type="button" size="sm" onClick={onSplit}>
        <Split aria-hidden="true" />
        Chia việc
      </Button>
    </Alert>
  )
}
