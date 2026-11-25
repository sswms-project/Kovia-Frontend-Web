import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { FormActions } from '../components/InboundRequestFormPage/FormActions'
import InboundRequestFormPage from './InboundRequestFormPage'

const fixture = vi.hoisted(() => {
  const values = {
    inboundRequestCode: 'NK-TEST',
    warehouseId: 'warehouse',
    sourceType: 'Other',
    sourceName: 'Nguồn hàng',
    sourceReference: '',
    supplierId: '',
    expectedDate: '',
    receivingAssignedTo: 'staff-old',
    lines: [],
  }
  return {
    values,
    permissions: [] as string[],
    form: {
      control: {},
      formState: { isDirty: false },
      reset: vi.fn(),
      getValues: () => values,
      setValue: vi.fn(),
      setError: vi.fn(),
      setFocus: vi.fn(),
      handleSubmit: (callback: (value: typeof values) => unknown) => () => callback(values),
    },
    update: vi.fn().mockResolvedValue({}),
    submit: vi.fn().mockResolvedValue({}),
    replace: vi.fn(),
    query: { isLoading: false, isError: false, data: undefined },
    detail: {
      id: 'draft',
      status: 'Draft',
      inboundRequestCode: 'NK-TEST',
      warehouseId: 'warehouse',
      sourceType: 'Other',
      sourceName: 'Nguồn hàng',
      receivingAssignedTo: 'staff-old',
      lines: [],
      version: 'AQ==',
    },
  }
})
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: fixture.replace, push: vi.fn() }),
}))
vi.mock('react-hook-form', () => ({
  useForm: () => fixture.form,
  useFieldArray: () => ({ fields: [] }),
  useWatch: ({ name }: { name: string }) => (name === 'lines' ? [] : 'warehouse'),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (select: (state: unknown) => unknown) => select({ user: { role: 'Tenant Owner' } }),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: fixture.permissions } }),
}))
vi.mock('@/hooks/use-unauthorized-redirect', () => ({ useUnauthorizedRedirect: vi.fn() }))
vi.mock('@/hooks/use-code-suggestion', () => ({
  useCodeSuggestion: () => ({ markEdited: vi.fn() }),
}))
vi.mock('@/features/inbound/hooks/use-inbound', () => ({
  useAssignableStaffQuery: () => fixture.query,
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => fixture.query,
}))
vi.mock('@/features/product/hooks/use-products', () => ({ useUnitsQuery: () => fixture.query }))
vi.mock('../hooks/use-inbound-request-ai-draft', () => ({
  useInboundRequestAiDraft: () => ({ complete: vi.fn() }),
}))
vi.mock('../hooks/use-inbound-requests', () => ({
  useCreateInboundRequestMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateInboundRequestMutation: () => ({ mutateAsync: fixture.update }),
  useSubmitInboundRequestMutation: () => ({ mutateAsync: fixture.submit }),
  useUpdateInboundRequestCodeMutation: () => ({}),
  useInboundRequestQuery: () => ({ data: fixture.detail }),
  useInboundRequestAllowedActionsQuery: () => ({
    data: { allowedActions: ['Update', 'UpdateAndSelfApprove'] },
  }),
  useNextInboundRequestCodeQuery: () => fixture.query,
  useInboundRequestProductDetails: () => [],
  useInboundRequestUnitConversions: () => [],
  useProductOptionsQuery: () => fixture.query,
  useSupplierOptionsQuery: () => fixture.query,
  useInboundProductAvailabilityQuery: () => fixture.query,
}))
vi.mock('../components/InboundRequestFormPage', () => ({
  InboundRequestForm: FormActions,
  InboundRequestCodeForm: () => null,
}))

describe('reopened owner inbound draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixture.permissions = [P.GOODS_RECEIPTS_CREATE]
    fixture.values.receivingAssignedTo = 'staff-old'
  })

  it('keeps Save draft separate and does not submit or self-approve it', async () => {
    render(<InboundRequestFormPage inboundRequestId="draft" />)
    expect(screen.getByRole('button', { name: 'Tạo' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request).not.toHaveProperty('selfApprovalAcknowledged')
    expect(fixture.update.mock.calls[0]?.[0].request.expectedVersion).toBe('AQ==')
    expect(fixture.submit).not.toHaveBeenCalled()
  })

  it('requires confirmation before Create and self-approves without a separate submit', async () => {
    render(<InboundRequestFormPage inboundRequestId="draft" />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }))
    expect(fixture.update).not.toHaveBeenCalled()
    expect(screen.getByText('Tạo yêu cầu nhập kho?')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Tạo' }).at(-1)!)
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request).toMatchObject({
      selfApprovalAcknowledged: true,
      expectedVersion: 'AQ==',
    })
    expect(fixture.submit).not.toHaveBeenCalled()
  })
  it('hydrates the planned assignee and saves a replacement together with the draft', async () => {
    render(<InboundRequestFormPage inboundRequestId="draft" />)
    expect(fixture.form.reset).toHaveBeenCalledWith(
      expect.objectContaining({ receivingAssignedTo: 'staff-old' })
    )
    fixture.values.receivingAssignedTo = 'staff-new'
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request).toMatchObject({
      updateReceivingAssignment: true,
      receivingAssignedTo: 'staff-new',
      expectedVersion: 'AQ==',
    })
    expect(fixture.submit).not.toHaveBeenCalled()
  })

  it('sends an explicit null to remove a planned assignee', async () => {
    render(<InboundRequestFormPage inboundRequestId="draft" />)
    fixture.values.receivingAssignedTo = ''
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request).toMatchObject({
      updateReceivingAssignment: true,
      receivingAssignedTo: null,
    })
  })

  it('omits assignment updates for a caller without assignment permission', async () => {
    fixture.permissions = []
    render(<InboundRequestFormPage inboundRequestId="draft" />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request).not.toHaveProperty(
      'updateReceivingAssignment'
    )
    expect(fixture.update.mock.calls[0]?.[0].request).not.toHaveProperty('receivingAssignedTo')
  })
})
