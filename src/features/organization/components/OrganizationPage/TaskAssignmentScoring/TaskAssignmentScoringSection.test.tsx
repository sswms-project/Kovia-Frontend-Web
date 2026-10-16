import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { organizationService } from '../../../services/organization.service'
import type { TaskAssignmentScoringResponse } from '../../../types/organization.types'
import { TaskAssignmentScoringSection } from '.'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getTaskAssignmentScoring: vi.fn(),
    updateTaskAssignmentScoring: vi.fn(),
    resetTaskAssignmentScoring: vi.fn(),
  },
}))

const service = vi.mocked(organizationService)
const defaults = {
  receivingBase: 3,
  putAwayBase: 3,
  warehouseTaskBase: 2,
  cycleCountBase: 3,
  pointsPerLine: 1,
  pointsPerQuantityLog: 2,
  urgentMultiplier: 1.5,
}

function respond(scoring: TaskAssignmentScoringResponse) {
  return { isSuccess: true, statusCode: 200, message: '', data: scoring }
}

function renderSection(canUpdate = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TaskAssignmentScoringSection canUpdate={canUpdate} />
    </QueryClientProvider>
  )
}

describe('TaskAssignmentScoringSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves edited weights with the current version and shows the new values', async () => {
    const user = userEvent.setup()
    service.getTaskAssignmentScoring
      .mockResolvedValueOnce(
        respond({ weights: defaults, defaults, isCustomized: false, version: 0 })
      )
      .mockResolvedValueOnce(
        respond({
          weights: { ...defaults, pointsPerLine: 4 },
          defaults,
          isCustomized: true,
          version: 1,
        })
      )
    service.updateTaskAssignmentScoring.mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    renderSection()

    const pointsPerLine = await screen.findByLabelText('Điểm mỗi dòng hàng')
    expect(screen.getByText('Đang dùng hệ số mặc định')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Khôi phục mặc định/ })).not.toBeInTheDocument()

    await user.clear(pointsPerLine)
    await user.type(pointsPerLine, '4')
    await user.click(screen.getByRole('button', { name: /Lưu hệ số/ }))

    await waitFor(() =>
      expect(service.updateTaskAssignmentScoring.mock.calls[0]?.[0]).toEqual({
        ...defaults,
        pointsPerLine: 4,
        version: 0,
      })
    )
    expect(await screen.findByText('Đang dùng hệ số riêng')).toBeInTheDocument()
    expect(screen.getByLabelText('Điểm mỗi dòng hàng')).toHaveValue(4)
  })

  it('blocks out-of-range values before calling the API', async () => {
    const user = userEvent.setup()
    service.getTaskAssignmentScoring.mockResolvedValue(
      respond({ weights: defaults, defaults, isCustomized: false, version: 0 })
    )
    renderSection()

    const urgent = await screen.findByLabelText('Hệ số việc gấp')
    await user.clear(urgent)
    await user.type(urgent, '6')
    await user.click(screen.getByRole('button', { name: /Lưu hệ số/ }))

    expect(await screen.findByText('Hệ số việc gấp phải từ 1 đến 5.')).toBeInTheDocument()
    expect(service.updateTaskAssignmentScoring).not.toHaveBeenCalled()
  })

  it('restores defaults after confirmation, sending the current version', async () => {
    const user = userEvent.setup()
    service.getTaskAssignmentScoring
      .mockResolvedValueOnce(
        respond({
          weights: { ...defaults, receivingBase: 10 },
          defaults,
          isCustomized: true,
          version: 3,
        })
      )
      .mockResolvedValueOnce(
        respond({ weights: defaults, defaults, isCustomized: false, version: 0 })
      )
    service.resetTaskAssignmentScoring.mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Khôi phục mặc định/ }))
    await user.click(screen.getByRole('button', { name: 'Khôi phục mặc định' }))

    await waitFor(() => expect(service.resetTaskAssignmentScoring.mock.calls[0]?.[0]).toBe(3))
    expect(await screen.findByText('Đang dùng hệ số mặc định')).toBeInTheDocument()
    expect(screen.getByLabelText('Nhận hàng')).toHaveValue(3)
  })

  it('asks to reload when the version is stale', async () => {
    const user = userEvent.setup()
    service.getTaskAssignmentScoring.mockResolvedValue(
      respond({ weights: defaults, defaults, isCustomized: true, version: 2 })
    )
    service.updateTaskAssignmentScoring.mockRejectedValue({ statusCode: 409, message: 'Xung đột' })
    renderSection()

    const putAway = await screen.findByLabelText('Cất hàng')
    await user.clear(putAway)
    await user.type(putAway, '5')
    await user.click(screen.getByRole('button', { name: /Lưu hệ số/ }))

    expect(await screen.findByText('Hệ số đã thay đổi ở nơi khác')).toBeInTheDocument()
    expect(screen.getByLabelText('Cất hàng')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Tải lại/ }))
    await waitFor(() => expect(service.getTaskAssignmentScoring).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Hệ số đã thay đổi ở nơi khác')).not.toBeInTheDocument()
  })

  it('is read-only without update permission', async () => {
    service.getTaskAssignmentScoring.mockResolvedValue(
      respond({ weights: defaults, defaults, isCustomized: false, version: 0 })
    )
    renderSection(false)

    expect(await screen.findByLabelText('Nhận hàng')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Lưu hệ số/ })).not.toBeInTheDocument()
  })
})
