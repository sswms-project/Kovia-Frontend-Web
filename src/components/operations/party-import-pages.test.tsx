import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import SupplierImportPage from '@/features/supplier/pages/SupplierImportPage'
import StockRecipientImportPage from '@/features/stock-recipient/pages/StockRecipientImportPage'

const session = vi.hoisted(() => ({
  data: { id: 'user-a', tenantId: 'tenant-a', permissions: [] as string[] },
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({ useMeQuery: () => session }))
vi.mock('@/features/supplier/hooks/use-suppliers', () => ({
  useImportSuppliersMutation: () => ({}),
  usePreviewSupplierImportMutation: () => ({}),
  useInspectSupplierImportMutation: () => ({}),
  useSupplierImportTemplateMutation: () => ({}),
}))
vi.mock('@/features/stock-recipient/hooks/use-stock-recipients', () => ({
  useImportStockRecipientsMutation: () => ({}),
  usePreviewStockRecipientImportMutation: () => ({}),
  useInspectStockRecipientImportMutation: () => ({}),
  useStockRecipientImportTemplateMutation: () => ({}),
}))
vi.mock('./BulkImportPage', () => ({
  BulkImportPage: function TestSession() {
    const [draft, setDraft] = useState('')
    return (
      <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
    )
  },
}))

beforeEach(() => {
  session.data = { id: 'user-a', tenantId: 'tenant-a', permissions: [] }
})
describe.each([
  { name: 'supplier', Page: SupplierImportPage, permission: P.SUPPLIERS_CREATE },
  { name: 'recipient', Page: StockRecipientImportPage, permission: P.STOCK_RECIPIENTS_CREATE },
])('$name import workspace', ({ Page, permission }) => {
  it('does not render the upload session without effective create permission', () => {
    render(<Page />)
    expect(screen.getByRole('status')).toHaveTextContent('Bạn không có quyền')
    expect(screen.queryByLabelText('Draft')).not.toBeInTheDocument()
  })
  it('discards the old import session when tenant or user changes', async () => {
    session.data.permissions = [permission]
    const { rerender } = render(<Page />)
    await userEvent.type(screen.getByLabelText('Draft'), 'private-file')
    session.data = { ...session.data, tenantId: 'tenant-b' }
    rerender(<Page />)
    expect(screen.getByLabelText('Draft')).toHaveValue('')
    await userEvent.type(screen.getByLabelText('Draft'), 'other-file')
    session.data = { ...session.data, id: 'user-b' }
    rerender(<Page />)
    expect(screen.getByLabelText('Draft')).toHaveValue('')
  })
})
