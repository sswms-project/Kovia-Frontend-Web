import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StockRecipient } from '../../types/stock-recipient.types'
import { StockRecipientMobileList } from './StockRecipientMobileList'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const recipient: StockRecipient = {
  id: 'recipient-1',
  recipientCode: 'KH-001',
  recipientName: 'Công ty TNHH Tấn An',
  taxCode: null,
  phone: '0901234567',
  email: 'lienhe@tanan.vn',
  address: 'Đà Nẵng',
  shippingAddress: null,
  recipientType: 'Organization',
  contactSalutation: null,
  contactName: null,
  contactMobile: null,
  contactChannel: null,
  contactChannelName: null,
  status: 'Active',
  createdAt: '2026-09-29T00:00:00Z',
  modifiedAt: null,
}

describe('StockRecipientMobileList', () => {
  it('opens the customer from the card and keeps edit and status actions separate', () => {
    const onEdit = vi.fn()
    const onChangeStatus = vi.fn()
    render(
      <StockRecipientMobileList
        items={[recipient]}
        canUpdate
        canManageStatus
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
      />
    )

    expect(screen.getByRole('link', { name: 'Công ty TNHH Tấn An' })).toHaveAttribute(
      'href',
      '/stock-recipients/recipient-1'
    )
    expect(screen.getByText('0901234567 · lienhe@tanan.vn')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Công ty TNHH Tấn An' }))
    expect(onEdit).toHaveBeenCalledWith(recipient)
    fireEvent.click(screen.getByRole('button', { name: 'Ngừng hợp tác Công ty TNHH Tấn An' }))
    expect(onChangeStatus).toHaveBeenCalledWith(recipient)
    expect(push).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('KH-001'))
    expect(push).toHaveBeenCalledWith('/stock-recipients/recipient-1')
  })
})
