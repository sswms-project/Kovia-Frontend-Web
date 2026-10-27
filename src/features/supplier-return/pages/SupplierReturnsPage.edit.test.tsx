import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'
import { P } from '@/config/permissionCodes'
import { buildSupplierReturn } from '../components/SupplierReturnsPage/fixtures'
import {
  createSupplierReturnSchema,
  type CreateSupplierReturnFormValues,
} from '../schemas/supplier-return.schema'
import SupplierReturnsPage from './SupplierReturnsPage'

const state = vi.hoisted(() => ({
  form: null as UseFormReturn<CreateSupplierReturnFormValues> | null,
}))
const document = buildSupplierReturn({
  status: 'Draft',
  version: 'AQ==',
  allowedActions: ['Update'],
  sourceGoodsReceiptId: '11111111-1111-4111-8111-111111111111',
})
const originalLine = document.items[0]
if (!originalLine) throw new Error('Fixture must have a line')
const saved = {
  ...document,
  items: [{ ...originalLine, quantity: 8, availableQuantity: 20, sourceRemainingQuantity: 10 }],
}
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/supplier-returns/return-1',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'user-creator', permissions: [P.SUPPLIER_RETURNS_CREATE] } }),
}))
vi.mock('@/hooks/use-return-list-state', () => ({
  useReturnListState: () => ({
    page: 1,
    pageSize: 10,
    searchText: '',
    listHref: '/supplier-returns',
  }),
}))
vi.mock('@/hooks/use-return-document-editing', () => ({
  useReturnDocumentEditing: () => ({ dialog: {} }),
  useSaveReturnDocument: () => ({ isPending: false }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => ({ data: { items: [] } }),
}))
vi.mock('@/features/supplier/hooks/use-suppliers', () => ({
  useSuppliersQuery: () => ({ data: { items: [] } }),
}))
vi.mock('../hooks/use-supplier-returns', () => ({
  useSupplierReturnsQuery: () => ({}),
  useSupplierReturnQuery: () => ({ data: saved }),
  useSupplierReturnSourcesQuery: () => ({ data: { items: [] } }),
  useSupplierReturnSourceStocksQuery: () => ({ data: { items: [] } }),
  useCreateSupplierReturnMutation: () => ({}),
  useApproveSupplierReturnMutation: () => ({}),
  useRejectSupplierReturnMutation: () => ({}),
  useCancelSupplierReturnMutation: () => ({}),
  useConfirmSupplierReturnDeliveryMutation: () => ({}),
}))
vi.mock('@/components/operations/ReturnDocumentActions', () => ({
  ReturnDocumentActionDialog: () => null,
  ReturnDocumentActions: ({ onEdit }: { onEdit: () => void }) => (
    <button onClick={onEdit}>Sửa nháp</button>
  ),
}))
vi.mock('../components/SupplierReturnsPage', () => ({
  SupplierReturnDetail: ({ editingActions }: { editingActions: ReactNode }) => (
    <>{editingActions}</>
  ),
  SupplierReturnDirectory: () => null,
  SupplierReturnDecisionDialog: () => null,
  ConfirmSupplierReturnDeliveryDialog: () => null,
  CreateSupplierReturnDialog: ({
    form,
    open,
  }: {
    form: UseFormReturn<CreateSupplierReturnFormValues>
    open: boolean
  }) => {
    if (open) state.form = form
    return null
  },
}))
afterEach(() => {
  cleanup()
  state.form = null
})

it('hydrates every saved line with product/lot group and receipt allowance without relying on stock search results', () => {
  render(<SupplierReturnsPage returnId="return-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Sửa nháp' }))
  const values = state.form?.getValues()
  expect(values?.lines[0]?.sourceGroupKey).toBe('product-1:')
  expect(values?.lines[0]?.sourceRemainingQuantity).toBe(10)
  if (!values?.lines[0]) throw new Error('Expected hydrated saved line')
  const total = createSupplierReturnSchema.safeParse({
    ...values,
    lines: [
      ...values.lines,
      { ...values.lines[0], inventoryStockId: 'second-location', quantity: 8 },
    ],
  })
  expect(total.success).toBe(false)
  const within = createSupplierReturnSchema.safeParse({
    ...values,
    lines: [
      ...values.lines,
      { ...values.lines[0], inventoryStockId: 'second-location', quantity: 2 },
    ],
  })
  expect(within.success).toBe(true)
})
