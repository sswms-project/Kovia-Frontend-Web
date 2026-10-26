import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BusinessCodeField } from '@/components/forms/BusinessCodeField'
import { DatePickerField } from '@/components/forms/DatePickerField'
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
  quantity: 1,
  factor: 1,
  issueDate: '2026-10-25' as string | null,
  issueTime: null as string | null,
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
            issueDate: fixture.issueDate,
            issueTime: fixture.issueTime,
          },
        }
      : {},
  useStockRecipientOptionsQuery: () => ({}),
  useStockIssueProductOptionsQuery: () => ({
    data: [
      {
        id: '10000000-0000-4000-8000-000000000003',
        sku: 'SKU',
        productName: 'Product',
        barcode: null,
        unitId: 'base',
        unitName: 'Base',
        availableQuantity: 100,
        firstExpiringLotNumber: null,
        firstExpiringLotDate: null,
        units: [
          { unitId: 'base', unitName: 'Base', conversionFactor: 1, quantityPrecision: 6 },
          {
            unitId: 'alternate',
            unitName: 'Alternate',
            conversionFactor: fixture.factor,
            quantityPrecision: 6,
          },
        ],
      },
    ],
  }),
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
        {
          productId: '10000000-0000-4000-8000-000000000003',
          quantity: fixture.quantity,
          unitId: fixture.factor === 1 ? '' : 'alternate',
          note: '',
        },
      ])
    }
    return (
      <>
        <button
          onClick={() =>
            props.onProductSelect({
              value: '10000000-0000-4000-8000-000000000003',
              label: 'Product',
            })
          }
        >
          Select product
        </button>
        <span>{props.form.formState.errors.lines?.[0]?.quantity?.message}</span>
        <BusinessCodeField
          label="Mã yêu cầu xuất kho"
          suggestionStatus={props.codeSuggestionStatus}
          inputProps={{
            ...props.form.register('stockIssueRequestCode', { onChange: props.onCodeChange }),
            id: 'request-code',
          }}
        />
        <DatePickerField
          id="issue-date"
          label="Ngày xuất"
          withTime
          value={props.form.watch('issueDate')}
          onChange={(value) => props.form.setValue('issueDate', value)}
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
  fixture.quantity = 1
  fixture.factor = 1
  fixture.issueDate = '2026-10-25'
  fixture.issueTime = null
  fixture.create.mockResolvedValue({ data: 'created-id' })
  fixture.update.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('outbound request code suggestion', () => {
  it('defaults to the current Vietnam minute and saves a manually selected midnight without shifting the day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T18:15:00Z'))
    render(<StockIssueRequestFormPage />)
    expect(screen.getByRole('button', { name: 'Ngày xuất' })).toHaveTextContent('25/10/2026 01:15')
    fireEvent.click(screen.getByRole('button', { name: 'Ngày xuất' }))
    fireEvent.change(screen.getByLabelText('Thời gian (không bắt buộc)'), {
      target: { value: '00:00' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(fixture.create).toHaveBeenCalledWith(
        expect.objectContaining({ issueDate: '2026-10-25', issueTime: '00:00:00' })
      )
    )
  })

  it.each([null, '08:45:30.1234567'])(
    'hydrates existing date/time and preserves untouched server precision (%s)',
    async (issueTime) => {
      fixture.editing = true
      fixture.issueTime = issueTime
      render(<StockIssueRequestFormPage stockIssueRequestId="saved-id" />)
      const picker = screen.getByRole('button', { name: 'Ngày xuất' })
      expect(picker).toHaveTextContent(issueTime ? '25/10/2026 08:45' : '25/10/2026')
      fireEvent.click(screen.getByText('Save'))
      await waitFor(() =>
        expect(fixture.update).toHaveBeenCalledWith(
          expect.objectContaining({ issueDate: '2026-10-25', issueTime })
        )
      )
    }
  )

  it.each([false, true])(
    'clears an optional time or the entire date without restoring it on save (date=%s)',
    async (clearDate) => {
      fixture.editing = true
      fixture.issueTime = '08:45:00'
      render(<StockIssueRequestFormPage stockIssueRequestId="saved-id" />)
      fireEvent.click(screen.getByRole('button', { name: 'Ngày xuất' }))
      if (clearDate) fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
      else
        fireEvent.change(screen.getByLabelText('Thời gian (không bắt buộc)'), {
          target: { value: '' },
        })
      fireEvent.click(screen.getByText('Save'))
      await waitFor(() =>
        expect(fixture.update).toHaveBeenCalledWith(
          expect.objectContaining({ issueDate: clearDate ? null : '2026-10-25', issueTime: null })
        )
      )
    }
  )
  it.each([
    [0.001, 1, false],
    [0.1, 3, true],
  ])(
    'checks exact converted storage quantity for factor %s',
    async (factor, quantity, accepted) => {
      fixture.factor = factor
      fixture.quantity = quantity
      render(<StockIssueRequestFormPage />)
      fireEvent.click(screen.getByText('Select product'))
      fireEvent.click(screen.getByText('Save'))
      if (accepted) await waitFor(() => expect(fixture.create).toHaveBeenCalled())
      else {
        await screen.findByText(/Số lượng quy đổi phải lưu chính xác/)
        expect(fixture.create).not.toHaveBeenCalled()
      }
    }
  )
  it.each([false, true])(
    'blocks unrepresentable quantities before %s create/update HTTP calls',
    async (editing) => {
      fixture.editing = editing
      fixture.quantity = 0.001
      render(<StockIssueRequestFormPage stockIssueRequestId={editing ? 'saved-id' : undefined} />)
      fireEvent.click(screen.getByText('Save'))
      await screen.findByText(/Số lượng quy đổi phải lưu chính xác/)
      expect(fixture.create).not.toHaveBeenCalled()
      expect(fixture.update).not.toHaveBeenCalled()
    }
  )
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
