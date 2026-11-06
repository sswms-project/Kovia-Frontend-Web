import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { ForecastWorkspace } from '../../hooks/use-forecast-workspace'
import type { ForecastRun, ForecastRunStatus } from '../../types/inventory.types'
import { ForecastRunPanel } from './ForecastRunPanel'

vi.mock('./ForecastOverviewView', () => ({
  ForecastOverviewView: () => <div>Kết quả tổng quan</div>,
}))
vi.mock('./ForecastDemandView', () => ({ ForecastDemandView: () => null }))
vi.mock('./ReplenishmentList', () => ({ ReplenishmentList: () => null }))
vi.mock('./ForecastRebalancingView', () => ({ ForecastRebalancingView: () => null }))
vi.mock('./ReplenishmentReviewDialog', () => ({
  ReplenishmentReviewDialog: () => <div>Kiểm tra nháp</div>,
}))

afterEach(cleanup)

function run(status: ForecastRunStatus): ForecastRun {
  return {
    id: 'run-1',
    warehouseId: 'warehouse-1',
    warehouseName: 'Đà Nẵng',
    createdByUserId: 'user-1',
    createdByName: 'Manager',
    method: 'auto',
    historicalPeriodDays: 90,
    forecastStartDate: '2026-11-06',
    forecastEndDate: '2026-11-19',
    createdAt: '2026-11-06T06:00:00Z',
    status,
    failureReason: status === 'Failed' ? 'Dịch vụ dự báo không phản hồi.' : null,
    completedAt: null,
    results: [],
    replenishmentSuggestions: [],
    rebalancingSuggestions: [],
    details: null,
  }
}

function show(item: ForecastRun, options: { canRun?: boolean; isCreating?: boolean } = {}) {
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  function Harness() {
    const createForm = useForm({ defaultValues: { historicalPeriodDays: 90, horizonDays: 14 } })
    // Only the panel's form/query surface is needed; data-heavy children are mocked above.
    const workspace = {
      createForm,
      warehouseId: item.warehouseId,
      runId: item.id,
      runQuery: {
        data: item,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      runsQuery: { data: [item], isLoading: false, isError: false },
      selectRun: vi.fn(),
      changeWarehouse: vi.fn(),
      createAndRun: submit,
      isCreating: options.isCreating ?? false,
      overview: {},
    } as unknown as ForecastWorkspace
    return (
      <TooltipProvider>
        <ForecastRunPanel
          workspace={workspace}
          warehouseOptions={[]}
          warehousesLoading={false}
          warehousesError={false}
          retryWarehouses={vi.fn()}
          canRun={options.canRun ?? true}
          canReview
          canViewInbound
          canCreateTransfer={false}
          canViewReports={false}
        />
      </TooltipProvider>
    )
  }
  render(<Harness />)
  return submit
}

describe('forecast run outcome', () => {
  it('shows failure without legacy warnings, result conclusions or review actions, and can retry', async () => {
    const submit = show(run('Failed'))
    expect(screen.getByRole('alert')).toHaveTextContent('Dịch vụ dự báo không phản hồi.')
    expect(screen.getByText('Chưa có kết quả dự báo')).toBeInTheDocument()
    expect(screen.queryByText(/Phiên cũ chưa lưu/)).not.toBeInTheDocument()
    expect(screen.queryByText(/SKU đủ lịch sử/)).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('Kiểm tra nháp')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tính lại' }))
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('does not show partial results from a failed run', () => {
    show({ ...run('Failed'), details: { products: [], draftCreationNotice: 'Thông báo nháp' } })
    expect(screen.queryByText('Thông báo nháp')).not.toBeInTheDocument()
    expect(screen.queryByText('Kết quả tổng quan')).not.toBeInTheDocument()
  })

  it('prevents resubmission while running and respects permission to run', () => {
    show(run('Failed'), { isCreating: true })
    expect(screen.getByRole('button', { name: 'Đang tính & lập nháp…' })).toBeDisabled()
    cleanup()
    show(run('Failed'), { canRun: false })
    expect(screen.queryByRole('button', { name: 'Tính lại' })).not.toBeInTheDocument()
    expect(screen.getByText(/Chọn phiên đã hoàn tất.*để xem kết quả/)).toBeInTheDocument()
  })

  it('retains completed legacy results and their explanation', () => {
    show(run('Completed'))
    expect(screen.getByText(/Phiên cũ chưa lưu/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tổng quan (0)' })).toBeInTheDocument()
    expect(screen.getByText('Kết quả tổng quan')).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra nháp')).toBeInTheDocument()
  })

  it.each(['Pending', 'Running'] as const)(
    'keeps %s runs in progress without results',
    (status) => {
      show(run(status))
      expect(screen.getByText('Đang tính dự báo & lập nháp…')).toBeInTheDocument()
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.queryByText(/Phiên cũ chưa lưu/)).not.toBeInTheDocument()
    }
  )
})
