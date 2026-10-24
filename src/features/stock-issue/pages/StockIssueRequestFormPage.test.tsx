import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BusinessCodeField } from '@/components/forms/BusinessCodeField'
import type { StockIssueRequestForm } from '../components/StockIssueRequestFormPage'
import StockIssueRequestFormPage from './StockIssueRequestFormPage'

const fixture = vi.hoisted(() => ({
  code: 'XK000001' as string | undefined,
  fetching: false,
  error: false,
  create: vi.fn(),
  update: vi.fn(),
  editing: false,
  nextCode: vi.fn(),
}))
const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({ useWarehousesQuery: () => ({}) }))
vi.mock('@/features/stock-recipient/components/StockRecipientsPage', () => ({
  StockRecipientFormDialog: () => null,
}))
vi.mock('@/features/stock-recipient/hooks/use-stock-recipients', () => ({
  useCreateStockRecipientMutation: () => ({}),
  useNextStockRecipientCodeQuery: () => ({}),
}))
vi.mock('../hooks/use-stock-issue-requests', () => ({
  useStockIssueRequestQuery: () =>
    fixture.editing
      ? {
          data: {
            id: 'saved-id',
            stockIssueRequestCode: 'SIR-LEGACY',
            warehouseId: '10000000-0000-4000-8000-000000000001',
            stockRecipientId: '10000000-0000-4000-8000-000000000002',
            items: [],
            status: 'Pending',
            version: 'AQ==',
          },
        }
      : {},
  useStockRecipientOptionsQuery: () => ({}),
  useStockIssueProductOptionsQuery: () => ({}),
  useStockIssueSavedProductOptions: () => [],
  useCreateStockIssueRequestMutation: () => ({ mutateAsync: fixture.create }),
  useUpdateStockIssueRequestMutation: () => ({ mutateAsync: fixture.update }),
  useNextStockIssueRequestCodeQuery: (enabled: boolean, session: string) => {
    fixture.nextCode(enabled, session)
    return { data: fixture.code, isFetching: fixture.fetching, isError: fixture.error }
  },
}))
vi.mock('../components/StockIssueRequestFormPage', () => ({
  STOCK_ISSUE_MAX_ATTACHMENTS: 5,
  STOCK_ISSUE_ATTACHMENT_EXTENSIONS: [],
  STOCK_ISSUE_MAX_ATTACHMENT_BYTES: 1000,
  StockIssueRequestForm: (props: ComponentProps<typeof StockIssueRequestForm>) => {
    function validValues() {
      props.form.setValue('warehouseId', '10000000-0000-4000-8000-000000000001')
      props.form.setValue('stockRecipientId', '10000000-0000-4000-8000-000000000002')
      props.form.setValue('lines', [
        { productId: '10000000-0000-4000-8000-000000000003', quantity: 1, unitId: '', note: '' },
      ])
    }
    return (
      <>
        <BusinessCodeField
          label="Mã yêu cầu xuất kho"
          suggestionStatus={props.codeSuggestionStatus}
          inputProps={{
            ...props.form.register('stockIssueRequestCode', { onChange: props.onCodeChange }),
            id: 'request-code',
          }}
        />
        <button
          onClick={() => {
            validValues()
            props.onSave()
          }}
        >
          Save
        </button>
        <button
          onClick={() => {
            validValues()
            props.onSaveAndAddAnother()
          }}
        >
          Save another
        </button>
      </>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  fixture.code = 'XK000001'
  fixture.fetching = false
  fixture.error = false
  fixture.editing = false
  fixture.create.mockResolvedValue({ data: 'created-id' })
  fixture.update.mockResolvedValue({})
})
afterEach(cleanup)

describe('outbound request code suggestion', () => {
  it('preserves the saved code on edit and never sends it to the update API', async () => {
    fixture.editing = true
    render(<StockIssueRequestFormPage stockIssueRequestId="saved-id" />)
    expect(screen.getByLabelText('Mã yêu cầu xuất kho')).toHaveValue('SIR-LEGACY')
    expect(fixture.nextCode.mock.lastCall?.[0]).toBe(false)
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(fixture.update).toHaveBeenCalled())
    expect(fixture.update.mock.lastCall?.[0]).not.toHaveProperty('stockIssueRequestCode')
  })
  it('fills a suggested code and sends the edited code to create', async () => {
    render(<StockIssueRequestFormPage />)
    expect(screen.getByLabelText('Mã yêu cầu xuất kho')).toHaveValue('XK000001')
    fireEvent.change(screen.getByLabelText('Mã yêu cầu xuất kho'), { target: { value: 'MY-CODE' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(fixture.create).toHaveBeenCalledWith(
        expect.objectContaining({ stockIssueRequestCode: 'MY-CODE' })
      )
    )
  })

  it.each(['MANUAL', ''])(
    'does not overwrite an edited code with a late suggestion (%s)',
    (code) => {
      fixture.code = undefined
      fixture.fetching = true
      const view = render(<StockIssueRequestFormPage />)
      fireEvent.change(screen.getByLabelText('Mã yêu cầu xuất kho'), {
        target: { value: 'temporary' },
      })
      fireEvent.change(screen.getByLabelText('Mã yêu cầu xuất kho'), { target: { value: code } })
      fixture.code = 'XK000002'
      fixture.fetching = false
      view.rerender(<StockIssueRequestFormPage />)
      expect(screen.getByLabelText('Mã yêu cầu xuất kho')).toHaveValue(code)
    }
  )

  it('allows blank code when suggestions fail, so the backend can assign it', async () => {
    fixture.code = undefined
    fixture.error = true
    render(<StockIssueRequestFormPage />)
    expect(screen.getByLabelText('Mã yêu cầu xuất kho')).toBeEnabled()
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(fixture.create).toHaveBeenCalledWith(
        expect.objectContaining({ stockIssueRequestCode: null })
      )
    )
  })

  it('starts a new suggestion session after save-and-add', async () => {
    fixture.create.mockImplementation(async () => {
      fixture.code = 'XK000002'
      return { data: 'created-id' }
    })
    render(<StockIssueRequestFormPage />)
    const firstSession = fixture.nextCode.mock.calls[0]?.[1]
    fireEvent.click(screen.getByText('Save another'))
    await waitFor(() =>
      expect(screen.getByLabelText('Mã yêu cầu xuất kho')).toHaveValue('XK000002')
    )
    expect(fixture.nextCode.mock.lastCall?.[1]).not.toBe(firstSession)
  })
})
