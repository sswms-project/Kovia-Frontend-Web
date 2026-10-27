import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState, buildSuggestion, SOURCE_ID } from '../task-splitting.fixtures'
import { TaskPartsPanel } from './TaskPartsPanel'

const api = vi.hoisted(() => ({
  getState: vi.fn(),
  getSuggestion: vi.fn(),
  cancel: vi.fn(),
  updatePart: vi.fn(),
  reassignPart: vi.fn(),
  splitRemainingPart: vi.fn(),
  mergePart: vi.fn(),
  cancelPart: vi.fn(),
  completePart: vi.fn(),
}))
vi.mock('../../services/task-splitting.service', () => ({ taskSplittingService: api }))

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

const splitState = buildState({
  isSplit: true,
  version: 'split-v1',
  splitSuggested: false,
  parts: [
    buildPart({ allowedActions: ['edit', 'reassign', 'splitRemaining', 'merge', 'cancel'] }),
    buildPart({
      id: 'part-2',
      sequence: 2,
      assignedTo: 'staff-binh',
      assigneeName: 'Trần Thị Bình',
      executionStatus: 'InProgress',
      version: 'p2',
      lines: [{ sourceLineId: 'line-2', label: 'Đường cát', quantity: 7, completedQuantity: 3 }],
      allowedActions: ['reassign', 'splitRemaining'],
    }),
    buildPart({ id: 'part-3', sequence: 3, executionStatus: 'Cancelled', version: 'p3' }),
  ],
})

beforeEach(() => {
  api.getState.mockResolvedValue(splitState)
  api.getSuggestion.mockResolvedValue(buildSuggestion())
  api.reassignPart.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TaskPartsPanel sourceType="Receiving" sourceId={SOURCE_ID} />
    </QueryClientProvider>
  )
}

const partRow = async (name: string) =>
  (await screen.findByRole('cell', { name })).closest('tr') as HTMLElement

describe('TaskPartsPanel', () => {
  it('shows only allowed actions', async () => {
    renderPanel()

    const first = await partRow('Phần 1/2')
    const second = await partRow('Phần 2/2')
    expect(screen.queryByRole('cell', { name: 'Phần 3/3' })).not.toBeInTheDocument()

    for (const name of ['Sửa', 'Giao lại', 'Tách phần còn lại', 'Gộp vào…', 'Huỷ']) {
      expect(within(first).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(first).queryByRole('button', { name: 'Hoàn tất phần' })).not.toBeInTheDocument()

    expect(
      within(second)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Giao lại', 'Tách phần còn lại'])
    expect(within(second).getByText('3/7')).toBeInTheDocument()
    expect(within(second).getByText('Đang làm')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ chia' })).not.toBeInTheDocument()
  })

  it('requires reason to reassign in-progress part', async () => {
    renderPanel()
    const user = userEvent.setup()
    const second = await partRow('Phần 2/2')

    await user.click(within(second).getByRole('button', { name: 'Giao lại' }))
    const dialog = await screen.findByRole('dialog')
    const staffSelect = within(dialog).getByRole('combobox', { name: 'Nhân viên nhận phần' })
    await within(dialog).findByRole('option', { name: /Lê Văn Chi/ })
    await user.selectOptions(staffSelect, 'staff-chi')
    await user.click(within(dialog).getByRole('button', { name: 'Giao lại' }))

    expect(await within(dialog).findByText('Vui lòng nhập lý do.')).toBeInTheDocument()
    expect(api.reassignPart).not.toHaveBeenCalled()

    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Nghỉ ốm')
    await user.click(within(dialog).getByRole('button', { name: 'Giao lại' }))

    await waitFor(() =>
      expect(api.reassignPart).toHaveBeenCalledWith('part-2', {
        expectedVersion: 'p2',
        staffId: 'staff-chi',
        expectedStaffId: 'staff-binh',
        reason: 'Nghỉ ốm',
      })
    )
  })

  it('cancels the split with a reason and the split version', async () => {
    api.getState.mockResolvedValue({ ...splitState, canCancelSplit: true })
    api.cancel.mockResolvedValue({})
    renderPanel()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Huỷ chia' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Đổi kế hoạch')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ chia' }))

    await waitFor(() =>
      expect(api.cancel).toHaveBeenCalledWith(
        'Receiving',
        SOURCE_ID,
        expect.objectContaining({ expectedVersion: 'split-v1', reason: 'Đổi kế hoạch' })
      )
    )
  })
})
