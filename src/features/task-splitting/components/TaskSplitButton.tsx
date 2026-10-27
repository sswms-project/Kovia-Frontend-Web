'use client'

import { Split } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskSplitStateResponse } from '../types/task-splitting.types'

interface TaskSplitButtonProps {
  readonly state: TaskSplitStateResponse | undefined
  readonly onSplit: () => void
  readonly disabled?: boolean
}

/** "Chia việc" in a page's action bar: always offered while the backend allows splitting. */
export function TaskSplitButton({ state, onSplit, disabled }: TaskSplitButtonProps) {
  if (!state?.canSplit) return null
  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={onSplit}>
      <Split aria-hidden="true" />
      Chia việc
    </Button>
  )
}
