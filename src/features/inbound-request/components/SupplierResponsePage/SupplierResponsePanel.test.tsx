import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import {
  supplierResponseSchema,
  type SupplierResponseFormValues,
} from '../../schemas/supplier-response.schema'
import type { SupplierInboundResponsePreview } from '../../types/inbound-request.types'
import { SupplierResponsePanel } from './SupplierResponsePanel'

function preview(
  overrides: Partial<SupplierInboundResponsePreview> = {}
): SupplierInboundResponsePreview {
  return {
    linkStatus: 'Open',
    expiresAt: '2026-11-25T00:00:00Z',
    tenantName: 'Demo Co',
    inboundRequestCode: 'IR-001',
    supplierName: 'NCC A',
    warehouseName: 'Kho A',
    warehouseAddress: '1 Lê Lợi',
    expectedDate: '2026-11-01T00:00:00Z',
    sourceReference: null,
    response: null,
    respondedAt: null,
    responseNote: null,
    proposedDate: null,
    lines: [{ sku: 'SKU-1', productName: 'Sữa', unit: 'Thùng', quantity: 5 }],
    ...overrides,
  }
}

function PanelHarness({
  data,
  onSubmit,
}: {
  readonly data: SupplierInboundResponsePreview
  readonly onSubmit: (values: SupplierResponseFormValues) => Promise<void>
}) {
  const form = useForm<SupplierResponseFormValues>({
    resolver: zodResolver(supplierResponseSchema),
    defaultValues: { decision: 'Confirmed', note: '', proposedDate: '' },
  })
  return (
    <SupplierResponsePanel
      token="token"
      preview={data}
      isLoading={false}
      form={form}
      isPending={false}
      onSubmit={onSubmit}
    />
  )
}

function renderPanel(data: SupplierInboundResponsePreview) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<PanelHarness data={data} onSubmit={onSubmit} />)
  return onSubmit
}

describe('SupplierResponsePanel', () => {
  it('shows the order lines and submits a confirmation', async () => {
    const onSubmit = renderPanel(preview())

    expect(screen.getByRole('heading', { name: 'IR-001' })).toBeInTheDocument()
    expect(screen.getByText('Sữa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'Confirmed' }),
      expect.anything()
    )
  })

  it('blocks a rejection without a reason', async () => {
    const onSubmit = renderPanel(preview())

    await userEvent.click(screen.getByRole('radio', { name: /Từ chối đơn hàng/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }))

    expect(await screen.findByText('Vui lòng nhập lý do từ chối.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the recorded answer instead of the form once the supplier responded', () => {
    renderPanel(
      preview({
        linkStatus: 'Responded',
        response: 'Rejected',
        responseNote: 'Hết hàng',
        respondedAt: '2026-10-25T03:00:00Z',
      })
    )

    expect(screen.getByText(/Đã ghi nhận phản hồi/)).toBeInTheDocument()
    expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).not.toBeInTheDocument()
  })

  it('explains why a replaced link can no longer be used', () => {
    renderPanel(preview({ linkStatus: 'Revoked' }))

    expect(screen.getByText(/email mới nhất/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).not.toBeInTheDocument()
  })
})
