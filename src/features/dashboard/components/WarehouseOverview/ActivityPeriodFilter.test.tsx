import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  activityPeriodSchema,
  defaultActivityPeriod,
  type ActivityPeriodValues,
} from '../../schemas/activity-period.schema'
import { ActivityPeriodFilter } from './ActivityPeriodFilter'

afterEach(cleanup)
function Harness({ onApply }: { onApply: (values: ActivityPeriodValues) => void }) {
  const form = useForm<ActivityPeriodValues>({
    resolver: zodResolver(activityPeriodSchema),
    defaultValues: defaultActivityPeriod(new Date('2026-10-18T00:00:00Z')),
  })
  return <ActivityPeriodFilter form={form} onApply={onApply} />
}
describe('activity period filter', () => {
  it('does not request data while editing and applies the selected quarter explicitly', async () => {
    const apply = vi.fn()
    render(<Harness onApply={apply} />)
    fireEvent.change(screen.getByLabelText('Kỳ hoạt động'), { target: { value: 'quarter' } })
    fireEvent.change(screen.getByLabelText('Chọn quý'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Chọn năm'), { target: { value: '2025' } })
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(
        expect.objectContaining({ period: 'quarter', quarter: '2', year: '2025' }),
        expect.anything()
      )
    )
  })
  it('rejects a reversed custom range and retains editable date controls', async () => {
    const apply = vi.fn()
    render(<Harness onApply={apply} />)
    fireEvent.change(screen.getByLabelText('Kỳ hoạt động'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-19' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-18' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Từ ngày không được sau đến ngày')
    expect(screen.getByLabelText('Từ ngày')).toBeEnabled()
    expect(apply).not.toHaveBeenCalled()
  })
  it.each(['week', 'month', 'year'])('shows only the controls needed for %s', (period) => {
    render(<Harness onApply={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Kỳ hoạt động'), { target: { value: period } })
    expect(
      screen.getByLabelText(
        period === 'week' ? 'Chọn tuần' : period === 'month' ? 'Chọn tháng' : 'Chọn năm'
      )
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Từ ngày')).not.toBeInTheDocument()
  })
})
