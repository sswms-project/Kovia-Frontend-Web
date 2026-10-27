import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskSplitQuery } from '../../hooks/use-task-splitting'
import type { TaskSplitStateResponse } from '../../types/task-splitting.types'
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

/** The split state with one part replaced. */
function withPart(
  partId: string,
  change: Partial<TaskSplitStateResponse['parts'][number]>
): TaskSplitStateResponse {
  return {
    ...splitState,
    parts: splitState.parts.map((part) => (part.id === partId ? { ...part, ...change } : part)),
  }
}

beforeEach(() => {
  api.getState.mockResolvedValue(splitState)
  api.getSuggestion.mockResolvedValue(buildSuggestion())
  api.reassignPart.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

/** Mirrors a source page: the page owns the split state query and passes the state down. */
function PanelHost() {
  const query = useTaskSplitQuery('Receiving', SOURCE_ID)
  return query.data ? <TaskPartsPanel state={query.data} /> : null
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <PanelHost />
    </QueryClientProvider>
  )
}

async function partRow(name: string) {
  const row = (await screen.findByRole('cell', { name })).closest('tr')
  if (!row) throw new Error(`Không thấy dòng ${name}`)
  return row
}

const rowAction = (row: HTMLElement, action: string, part: string) =>
  within(row).getByRole('button', { name: `${action} (${part})` })

async function openAction(action: string, part: string) {
  const user = userEvent.setup()
  await user.click(rowAction(await partRow(part), action, part))
  return { user, dialog: await screen.findByRole('dialog') }
}

function deferred() {
  let resolve: (value: unknown) => void = () => {}
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('TaskPartsPanel', () => {
  it('shows only allowed actions', async () => {
    renderPanel()

    const first = await partRow('Phần 1/2')
    const second = await partRow('Phần 2/2')
    expect(screen.queryByRole('cell', { name: 'Phần 3/3' })).not.toBeInTheDocument()

    for (const name of ['Sửa', 'Giao lại', 'Tách phần còn lại', 'Gộp vào…', 'Huỷ']) {
      expect(rowAction(first, name, 'Phần 1/2')).toBeInTheDocument()
    }
    expect(within(first).queryByRole('button', { name: /Hoàn tất phần/ })).not.toBeInTheDocument()

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
    const { user, dialog } = await openAction('Giao lại', 'Phần 2/2')
    const staffSelect = within(dialog).getByRole('combobox', { name: 'Nhân viên nhận phần' })
    await within(dialog).findByRole('option', { name: /Lê Văn Chi/ })
    // The current holder is not offered: reassigning to them changes nothing.
    expect(within(dialog).queryByRole('option', { name: /Trần Thị Bình/ })).not.toBeInTheDocument()
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

  it('retries with the version reloaded after a conflict', async () => {
    api.getState
      .mockResolvedValueOnce(splitState)
      .mockResolvedValue(withPart('part-2', { version: 'p2-reloaded' }))
    api.reassignPart
      .mockRejectedValueOnce({ statusCode: 409, message: 'Dữ liệu đã thay đổi.' })
      .mockResolvedValue({})
    renderPanel()
    const { user, dialog } = await openAction('Giao lại', 'Phần 2/2')
    await within(dialog).findByRole('option', { name: /Lê Văn Chi/ })
    await user.selectOptions(within(dialog).getByRole('combobox'), 'staff-chi')
    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Nghỉ ốm')

    await user.click(within(dialog).getByRole('button', { name: 'Giao lại' }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Dữ liệu đã thay đổi.'))
    await waitFor(() => expect(api.getState).toHaveBeenCalledTimes(2))

    await user.click(within(dialog).getByRole('button', { name: 'Giao lại' }))
    await waitFor(() =>
      expect(api.reassignPart).toHaveBeenLastCalledWith(
        'part-2',
        expect.objectContaining({ expectedVersion: 'p2-reloaded' })
      )
    )
  })

  it('shows the current assignee and sends edited quantities', async () => {
    api.updatePart.mockResolvedValue({})
    renderPanel()
    const { user, dialog } = await openAction('Sửa', 'Phần 1/2')

    const staffSelect = within(dialog).getByRole('combobox', { name: 'Nhân viên nhận phần' })
    const current = await within(dialog).findByRole<HTMLOptionElement>('option', {
      name: /Nguyễn Văn An/,
    })
    expect(staffSelect).toHaveValue('staff-an')
    expect(current.selected).toBe(true)

    const quantity = within(dialog).getByRole('spinbutton', { name: 'Số lượng Gạo ST25' })
    await user.clear(quantity)
    await user.type(quantity, '8')
    await user.selectOptions(staffSelect, 'staff-chi')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    await waitFor(() =>
      expect(api.updatePart).toHaveBeenCalledWith('part-1', {
        expectedVersion: 'p1',
        staffId: 'staff-chi',
        lines: [{ sourceLineId: 'line-1', quantity: 8 }],
      })
    )
  })

  it('splits the remaining quantity to another person', async () => {
    api.splitRemainingPart.mockResolvedValue('part-4')
    renderPanel()
    const { user, dialog } = await openAction('Tách phần còn lại', 'Phần 2/2')
    await within(dialog).findByRole('option', { name: /Lê Văn Chi/ })
    await user.selectOptions(within(dialog).getByRole('combobox'), 'staff-chi')
    await user.click(within(dialog).getByRole('button', { name: 'Tách phần' }))
    expect(
      await within(dialog).findByText('Nhập ít nhất một số lượng lớn hơn 0.')
    ).toBeInTheDocument()

    await user.type(within(dialog).getByRole('spinbutton', { name: 'Số lượng Đường cát' }), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Tách phần' }))

    await waitFor(() =>
      expect(api.splitRemainingPart).toHaveBeenCalledWith('part-2', {
        expectedVersion: 'p2',
        staffId: 'staff-chi',
        lines: [{ sourceLineId: 'line-2', quantity: 2 }],
      })
    )
  })

  it('merges a queued part into another part', async () => {
    api.getState.mockResolvedValue(
      withPart('part-2', { executionStatus: 'Queued', allowedActions: ['merge'] })
    )
    api.mergePart.mockResolvedValue({})
    renderPanel()
    const { user, dialog } = await openAction('Gộp vào…', 'Phần 1/2')

    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Gộp vào phần' }),
      'part-2'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Gộp' }))

    await waitFor(() =>
      expect(api.mergePart).toHaveBeenCalledWith('part-1', {
        expectedVersion: 'p1',
        intoPartId: 'part-2',
      })
    )
  })

  it('cancels a part with a reason', async () => {
    api.cancelPart.mockResolvedValue({})
    renderPanel()
    const { user, dialog } = await openAction('Huỷ', 'Phần 1/2')
    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Không cần nữa')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ phần' }))

    await waitFor(() =>
      expect(api.cancelPart).toHaveBeenCalledWith('part-1', {
        expectedVersion: 'p1',
        reason: 'Không cần nữa',
      })
    )
  })

  it('completes a part only where allowed', async () => {
    api.getState.mockResolvedValue(withPart('part-2', { allowedActions: ['complete'] }))
    api.completePart.mockResolvedValue({})
    renderPanel()

    const first = await partRow('Phần 1/2')
    expect(within(first).queryByRole('button', { name: /Hoàn tất phần/ })).not.toBeInTheDocument()
    const { user, dialog } = await openAction('Hoàn tất phần', 'Phần 2/2')
    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Thiếu hàng')
    await user.click(within(dialog).getByRole('button', { name: 'Hoàn tất phần' }))

    await waitFor(() =>
      expect(api.completePart).toHaveBeenCalledWith('part-2', {
        expectedVersion: 'p2',
        reason: 'Thiếu hàng',
      })
    )
  })

  it('tells the user when the part no longer allows the action', async () => {
    api.getState
      .mockResolvedValueOnce(splitState)
      .mockResolvedValue(withPart('part-1', { version: 'p1b', allowedActions: [] }))
    api.cancelPart.mockRejectedValue({ statusCode: 409, message: 'Dữ liệu đã thay đổi.' })
    renderPanel()
    const { user, dialog } = await openAction('Huỷ', 'Phần 1/2')
    await user.type(within(dialog).getByRole('textbox', { name: 'Lý do' }), 'Không cần nữa')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ phần' }))

    expect(
      await within(dialog).findByText(
        'Phần việc đã thay đổi, thao tác này không còn thực hiện được.'
      )
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Huỷ phần' })).not.toBeInTheDocument()
  })

  it('cancels the split with a reason and the split version', async () => {
    api.getState.mockResolvedValue({ ...splitState, canCancelSplit: true })
    const request = deferred()
    api.cancel.mockReturnValue(request.promise)
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
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    request.resolve({})
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
