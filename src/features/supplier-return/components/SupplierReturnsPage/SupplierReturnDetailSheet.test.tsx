import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type { SupplierReturnStatus } from '../../types/supplier-return.types'
import { buildSupplierReturn } from './fixtures'
import { SupplierReturnDetailSheet } from './SupplierReturnDetailSheet'

function renderSheet(
  status: SupplierReturnStatus,
  permissions: string[],
  currentUserId = 'user-other',
  onApprove = vi.fn()
) {
  return render(
    <SupplierReturnDetailSheet
      item={buildSupplierReturn({ status, version: 'AQ==' })}
      isLoading={false}
      isError={false}
      canApprove={permissions.includes(P.SUPPLIER_RETURNS_APPROVE)}
      canSelfApprove={permissions.includes(P.SUPPLIER_RETURNS_SELF_APPROVE)}
      canDispatch={permissions.includes(P.SUPPLIER_RETURNS_DISPATCH)}
      currentUserId={currentUserId}
      onRetry={vi.fn()}
      onOpenChange={vi.fn()}
      onApprove={onApprove}
      onReject={vi.fn()}
      onCancel={vi.fn()}
      onDeliver={vi.fn()}
    />
  )
}

const queryButton = (name: RegExp) => screen.queryByRole('button', { name })

describe('SupplierReturnDetailSheet actions', () => {
  it('does not offer self approval to a creator without a self approval grant', () => {
    renderSheet('Pending', [P.SUPPLIER_RETURNS_APPROVE], 'user-creator')
    expect(queryButton(/^Duyệt$|^Tự duyệt$/)).not.toBeInTheDocument()
  })
  it('requires explicit acknowledgement before sending a self approval', async () => {
    const onApprove = vi.fn()
    renderSheet(
      'Pending',
      [P.SUPPLIER_RETURNS_APPROVE, P.SUPPLIER_RETURNS_SELF_APPROVE],
      'user-creator',
      onApprove
    )
    const button = screen.getByRole('button', { name: 'Tự duyệt' })
    expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /Tôi xác nhận tự duyệt/ }))
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({ version: 'AQ==' }), true)
    expect(button).toBeDisabled()
  })
  it('shows approve, reject and cancel for approvers on a pending return', () => {
    renderSheet('Pending', [P.SUPPLIER_RETURNS_VIEW, P.SUPPLIER_RETURNS_APPROVE])
    expect(queryButton(/^Duyệt$/)).toBeInTheDocument()
    expect(queryButton(/Từ chối/)).toBeInTheDocument()
    expect(queryButton(/Huỷ phiếu/)).toBeInTheDocument()
    expect(queryButton(/Xác nhận đã giao/)).not.toBeInTheDocument()
  })

  it('hides approve, reject and cancel without approve permission for a non-creator', () => {
    renderSheet('Pending', [P.SUPPLIER_RETURNS_VIEW, P.SUPPLIER_RETURNS_CREATE])
    expect(queryButton(/^Duyệt$/)).not.toBeInTheDocument()
    expect(queryButton(/Từ chối/)).not.toBeInTheDocument()
    expect(queryButton(/Huỷ phiếu/)).not.toBeInTheDocument()
  })

  it('lets the creator cancel without the approve permission', () => {
    renderSheet('Pending', [P.SUPPLIER_RETURNS_VIEW], 'user-creator')
    expect(queryButton(/Huỷ phiếu/)).toBeInTheDocument()
    expect(queryButton(/^Duyệt$/)).not.toBeInTheDocument()
  })

  it('does not treat a namesake with a different id as the creator', () => {
    renderSheet('Pending', [P.SUPPLIER_RETURNS_VIEW], 'user-namesake')
    expect(queryButton(/Huỷ phiếu/)).not.toBeInTheDocument()
  })

  it('shows confirm delivery only to dispatchers on an approved return', () => {
    renderSheet('Approved', [P.SUPPLIER_RETURNS_VIEW, P.SUPPLIER_RETURNS_DISPATCH])
    expect(queryButton(/Xác nhận đã giao/)).toBeInTheDocument()
    expect(queryButton(/^Duyệt$/)).not.toBeInTheDocument()
    expect(queryButton(/Huỷ phiếu/)).not.toBeInTheDocument()
  })

  it.each(['Completed', 'Rejected', 'Cancelled'] as const)('shows no actions when %s', (status) => {
    renderSheet(
      status,
      [P.SUPPLIER_RETURNS_VIEW, P.SUPPLIER_RETURNS_APPROVE, P.SUPPLIER_RETURNS_DISPATCH],
      'user-creator'
    )
    expect(queryButton(/Xác nhận đã giao|^Duyệt$|Từ chối|Huỷ phiếu/)).not.toBeInTheDocument()
  })
})
