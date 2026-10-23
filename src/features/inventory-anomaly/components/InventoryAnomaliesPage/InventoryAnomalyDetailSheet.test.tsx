import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  reviewInventoryAnomalySchema,
  type ReviewInventoryAnomalyFormValues,
} from '../../schemas/review-inventory-anomaly.schema'
import type { InventoryAnomaly } from '../../types/inventory-anomaly.types'
import { InventoryAnomalyDetailSheet } from './InventoryAnomalyDetailSheet'

afterEach(cleanup)

const anomaly: InventoryAnomaly = {
  id: 'anomaly-1',
  warehouseId: 'warehouse-1',
  warehouseName: 'Kho Đà Nẵng',
  productId: 'product-1',
  sku: 'BEER',
  productName: 'Bia Tiger',
  unitName: 'Thùng',
  stockMovementId: 'movement-1',
  movementType: 'Pick',
  quantityChange: -480,
  balanceAfter: 20,
  occurredAt: '2026-10-17T19:14:00Z',
  performedByUserId: 'staff-1',
  performedByName: 'Nguyễn Văn A',
  referenceType: 'StockIssuePickDetail',
  referenceId: 'pick-detail-id',
  score: 0.71,
  percentile: 99.8,
  severity: 'High',
  reasons: [
    { code: 'QTY_DEVIATION', value: 480, baseline: 12 },
    { code: 'UNUSUAL_HOUR', value: 2, baseline: 0.0004 },
  ],
  reviewStatus: 'Open',
  reviewNote: null,
  reviewedByName: null,
  reviewedAt: null,
  createdAt: '2026-10-18T02:05:00Z',
}

function Harness({
  item = anomaly,
  canReview = true,
  onSubmit,
}: {
  readonly item?: InventoryAnomaly
  readonly canReview?: boolean
  readonly onSubmit: (values: ReviewInventoryAnomalyFormValues) => Promise<void>
}) {
  const form = useForm<ReviewInventoryAnomalyFormValues>({
    resolver: zodResolver(reviewInventoryAnomalySchema),
    defaultValues: { decision: 'Dismissed', note: '' },
  })
  return (
    <InventoryAnomalyDetailSheet
      anomaly={item}
      form={form}
      canReview={canReview}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
}

describe('InventoryAnomalyDetailSheet', () => {
  it('explains every reason with its numbers', () => {
    render(<Harness onSubmit={vi.fn()} />)

    expect(screen.getByText(/gấp 40 lần mức thường gặp/)).toBeInTheDocument()
    expect(screen.getByText(/khung giờ chỉ chiếm 0,04%/)).toBeInTheDocument()
    expect(screen.getByText('Phiếu xuất kho', { exact: false })).toBeInTheDocument()
  })

  it('requires a note to confirm an anomaly', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<Harness onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bất thường' }))
    expect(await screen.findByText('Vui lòng ghi chú khi xác nhận bất thường.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Ghi chú xem xét'), {
      target: { value: 'Xuất nhầm lô, đã báo kế toán' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bất thường' }))
    await waitFor(() =>
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({
        decision: 'Confirmed',
        note: 'Xuất nhầm lô, đã báo kế toán',
      })
    )
  })

  it('dismisses without a note', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<Harness onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bình thường' }))

    await waitFor(() =>
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ decision: 'Dismissed', note: '' })
    )
  })

  it('hides review actions without the review permission', () => {
    render(<Harness canReview={false} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Xác nhận bất thường' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ghi chú xem xét')).not.toBeInTheDocument()
  })

  it('shows the recorded decision once reviewed', () => {
    render(
      <Harness
        item={{
          ...anomaly,
          reviewStatus: 'Dismissed',
          reviewNote: 'Đơn hàng sỉ đã báo trước',
          reviewedByName: 'Quản lý kho',
          reviewedAt: '2026-10-18T03:00:00Z',
        }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText('Đơn hàng sỉ đã báo trước')).toBeInTheDocument()
    expect(screen.getByText('Quản lý kho')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bình thường' })).not.toBeInTheDocument()
  })
})
