import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from './task-splitting.fixtures'
import { TaskSplitButton } from './TaskSplitButton'
import { TaskSplitSection } from './TaskSplitSection'

afterEach(cleanup)

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('TaskSplitSection', () => {
  it('shows the reminder and opens the dialog from it', async () => {
    const onOpenChange = vi.fn()
    renderWithQuery(
      <TaskSplitSection
        state={buildState()}
        isError={false}
        onRetry={vi.fn()}
        open={false}
        onOpenChange={onOpenChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Chia việc' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('heading', { name: 'Phần việc' })).not.toBeInTheDocument()
  })

  it('shows the parts once split', () => {
    renderWithQuery(
      <TaskSplitSection
        state={buildState({ isSplit: true, splitSuggested: false, parts: [buildPart({})] })}
        isError={false}
        onRetry={vi.fn()}
        open={false}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
  })

  it('reports a failed state load without blocking the page', async () => {
    const onRetry = vi.fn()
    renderWithQuery(
      <TaskSplitSection
        state={undefined}
        isError
        onRetry={onRetry}
        open={false}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải thông tin chia việc.')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders nothing while the state loads', () => {
    const { container } = renderWithQuery(
      <TaskSplitSection
        state={undefined}
        isError={false}
        onRetry={vi.fn()}
        open={false}
        onOpenChange={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TaskSplitButton', () => {
  it('is offered only when splitting is allowed', async () => {
    const onSplit = vi.fn()
    const { rerender } = render(
      <TaskSplitButton state={buildState({ splitSuggested: false })} onSplit={onSplit} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Chia việc' }))
    expect(onSplit).toHaveBeenCalledOnce()

    rerender(<TaskSplitButton state={buildState({ canSplit: false })} onSplit={onSplit} />)
    expect(screen.queryByRole('button', { name: 'Chia việc' })).not.toBeInTheDocument()

    rerender(<TaskSplitButton state={undefined} onSplit={onSplit} />)
    expect(screen.queryByRole('button', { name: 'Chia việc' })).not.toBeInTheDocument()
  })
})
