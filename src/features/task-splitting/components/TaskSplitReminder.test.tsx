import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildState } from './task-splitting.fixtures'
import { TaskSplitReminder } from './TaskSplitReminder'

afterEach(cleanup)

describe('TaskSplitReminder', () => {
  it('suggests splitting a large task and opens the dialog', async () => {
    const onSplit = vi.fn()
    render(<TaskSplitReminder state={buildState()} onSplit={onSplit} />)

    expect(
      screen.getByText('Việc lớn (điểm 42, ngưỡng 30) — nên chia cho nhiều người')
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chia việc' }))
    expect(onSplit).toHaveBeenCalledOnce()
  })

  it('reminder hidden below threshold', () => {
    const { container, rerender } = render(
      <TaskSplitReminder state={buildState({ splitSuggested: false })} onSplit={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<TaskSplitReminder state={buildState({ canSplit: false })} onSplit={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<TaskSplitReminder state={undefined} onSplit={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
