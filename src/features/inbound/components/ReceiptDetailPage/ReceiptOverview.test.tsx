import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GoodsReceiptDetail } from '../../types/inbound.types'
import { ReceiptOverview } from './ReceiptOverview'

function makeReceipt(overrides: Partial<GoodsReceiptDetail>): GoodsReceiptDetail {
  return {
    id: 'receipt-1',
    inboundRequestCode: 'IR-001',
    warehouseName: 'Kho A',
    createdByName: 'Thủ kho',
    createdAt: '2026-11-01T03:00:00Z',
    status: 'Draft',
    receivingFlowVersion: 1,
    items: [],
    ...overrides,
  } as GoodsReceiptDetail
}

describe('ReceiptOverview requester (BUG-028)', () => {
  it('shows who created the inbound request', () => {
    render(
      <ReceiptOverview receipt={makeReceipt({ inboundRequestCreatedByName: 'Nguyễn Văn A' })} />
    )

    expect(screen.getByText('Người tạo yêu cầu nhập')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
  })

  it('hides the field when the requester is unknown', () => {
    render(<ReceiptOverview receipt={makeReceipt({ inboundRequestCreatedByName: null })} />)

    expect(screen.queryByText('Người tạo yêu cầu nhập')).not.toBeInTheDocument()
  })
})
