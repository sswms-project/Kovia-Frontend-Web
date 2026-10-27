import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildState, buildSuggestion, SOURCE_ID } from '../task-splitting.fixtures'
import { TaskSplitDialog } from './TaskSplitDialog'

const api = vi.hoisted(() => ({
  getState: vi.fn(),
  getSuggestion: vi.fn(),
  create: vi.fn(),
}))
vi.mock('../../services/task-splitting.service', () => ({ taskSplittingService: api }))

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => {
  api.getState.mockResolvedValue(buildState())
  api.getSuggestion.mockResolvedValue(buildSuggestion())
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <TaskSplitDialog
        open
        onOpenChange={onOpenChange}
        sourceType="Receiving"
        sourceId={SOURCE_ID}
      />
    </QueryClientProvider>
  )
  return { onOpenChange }
}

async function openPlan() {
  const user = userEvent.setup()
  const suggest = await screen.findByRole('button', { name: 'Gợi ý chia' })
  await waitFor(() => expect(suggest).toBeEnabled())
  await user.click(suggest)
  await screen.findByRole('spinbutton', { name: 'Số lượng Gạo ST25 cho phần 1' })
  return user
}

const quantityInput = (label: string, part: number) =>
  screen.getByRole('spinbutton', { name: `Số lượng ${label} cho phần ${part}` })

async function setQuantity(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
  value: string
) {
  await user.clear(input)
  if (value) await user.type(input, value)
}

describe('TaskSplitDialog', () => {
  it('preselects recommended staff', async () => {
    renderDialog()

    expect(await screen.findByRole('checkbox', { name: /Nguyễn Văn An/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Trần Thị Bình/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Lê Văn Chi/ })).not.toBeChecked()
    expect(screen.getAllByText('Đề xuất')).toHaveLength(2)

    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox', { name: /Lê Văn Chi/ }))
    await user.click(screen.getByRole('button', { name: 'Gợi ý chia' }))

    await waitFor(() =>
      expect(api.getSuggestion).toHaveBeenLastCalledWith('Receiving', SOURCE_ID, [
        'staff-an',
        'staff-binh',
        'staff-chi',
      ])
    )
  })

  it('blocks confirm on overflow', async () => {
    renderDialog()
    const user = await openPlan()
    const confirm = screen.getByRole('button', { name: 'Xác nhận' })
    expect(confirm).toBeEnabled()

    await setQuantity(user, quantityInput('Gạo ST25', 1), '12')
    expect(screen.getByText('Vượt 2')).toBeInTheDocument()
    expect(confirm).toBeDisabled()

    await setQuantity(user, quantityInput('Gạo ST25', 1), '10')
    expect(confirm).toBeEnabled()

    // Phần 2 bị bỏ trống: lượng trở về chưa giao và phần rỗng không được xác nhận.
    await setQuantity(user, quantityInput('Đường cát', 2), '')
    expect(screen.getByText('Còn 7 chưa giao')).toBeInTheDocument()
    expect(confirm).toBeDisabled()
  })

  it('keeps edits after API error', async () => {
    api.create.mockRejectedValue({ statusCode: 409, message: 'Dữ liệu đã thay đổi.' })
    const { onOpenChange } = renderDialog()
    const user = await openPlan()

    await setQuantity(user, quantityInput('Gạo ST25', 1), '6')
    await setQuantity(user, quantityInput('Gạo ST25', 2), '4')
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Dữ liệu đã thay đổi.'))
    expect(api.create).toHaveBeenCalledWith(
      'Receiving',
      SOURCE_ID,
      expect.objectContaining({
        expectedVersion: 'v1',
        parts: [
          { staffId: 'staff-an', lines: [{ sourceLineId: 'line-1', quantity: 6 }] },
          {
            staffId: 'staff-binh',
            lines: [
              { sourceLineId: 'line-1', quantity: 4 },
              { sourceLineId: 'line-2', quantity: 7 },
            ],
          },
        ],
      })
    )
    expect(quantityInput('Gạo ST25', 1)).toHaveValue(6)
    expect(quantityInput('Gạo ST25', 2)).toHaveValue(4)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
