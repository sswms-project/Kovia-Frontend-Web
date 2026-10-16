import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ComponentProps } from 'react'
import { OpeningStockDirectory } from './OpeningStockDirectory'
import {
  createOpeningStockSchema,
  type CreateOpeningStockFormValues,
} from '../../schemas/create-opening-stock.schema'
import type { OpeningStockRecord } from '../../types/inventory.types'

vi.mock('@/components/operations/use-import-navigation', () => ({
  useImportNavigation: () => ({ discardOpen: false }),
}))
vi.mock('@/components/forms/DatePickerField', () => ({ DatePickerField: () => null }))
vi.mock('@/features/transfer/components/TransferFormPage/TransferSlotMapDialog', () => ({
  TransferSlotMapDialog: ({
    open,
    warehouseId,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean
    warehouseId: string
    onConfirm: (pick: { slotId: string; label: string }) => void
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <div role="dialog" aria-label="Sơ đồ kho thử nghiệm">
        <span>{warehouseId}</span>
        <button onClick={() => onOpenChange(false)}>Đóng sơ đồ</button>
        <button
          onClick={() => {
            onConfirm({
              slotId: '66666666-6666-4666-8666-666666666666',
              label: 'Khu A / Kệ B / Ô 99',
            })
            onOpenChange(false)
          }}
        >
          Dùng vị trí sơ đồ
        </button>
      </div>
    ) : null,
}))
afterEach(cleanup)
const warehouse = '757b5d63-38a8-4d3c-363d-08df1fc89199'
const productA = '22222222-2222-4222-8222-222222222222'
const productB = '33333333-3333-4333-8333-333333333333'
const slot = '44444444-4444-4444-8444-444444444444'
const unit = '55555555-5555-4555-8555-555555555555'
const products = [productA, productB].map((value, index) => ({
  value,
  label: `Hàng ${index ? 'B' : 'A'}`,
  unitId: unit,
  unitName: 'Cái',
  isLotTracked: false,
}))
type Props = ComponentProps<typeof OpeningStockDirectory>
const recordLine: OpeningStockRecord['lines'][number] = {
  id: 'line',
  productId: productA,
  sku: 'SP-A',
  productName: 'Hàng A',
  slotId: slot,
  slotCode: 'A-01',
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
  quantity: 2,
  enteredUnitId: unit,
  enteredUnitName: 'Cái',
  enteredQuantity: 2,
  conversionFactorSnapshot: 1,
  baseQuantity: 2,
}
const record: OpeningStockRecord = {
  id: 'record',
  code: 'OPEN-QA',
  warehouseId: warehouse,
  warehouseName: 'Kho QA',
  effectiveDate: '2026-01-01',
  isLegacyDate: false,
  requiresV1Client: true,
  status: 'Draft',
  revision: 1,
  createdByUserId: 'user',
  createdByName: 'Người lập',
  submittedByUserId: null,
  submittedAt: null,
  approvedByUserId: null,
  approvedAt: null,
  decisionReason: null,
  createdAt: '2026-01-01T01:00:00Z',
  version: 'v1',
  evidence: [],
  lines: [recordLine],
}
function mount(items: OpeningStockRecord[] = []) {
  const onCreate = vi.fn().mockResolvedValue(undefined)
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onLookupSearch = vi.fn()
  const filters = {
    onSearchChange: vi.fn(),
    onFilterWarehouseChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onDateFromChange: vi.fn(),
    onDateToChange: vi.fn(),
  }
  let form: ReturnType<typeof useForm<CreateOpeningStockFormValues>>
  function Harness({
    loading = false,
    filtered = false,
    dateFrom = '',
  }: {
    loading?: boolean
    filtered?: boolean
    dateFrom?: string
  }) {
    form = useForm<CreateOpeningStockFormValues>({
      resolver: zodResolver(createOpeningStockSchema),
    })
    const noop = vi.fn()
    const props: Props = {
      isCreateUncertain: false,
      search: '',
      lookupSearch: { product: '', location: '', lot: '' },
      onLookupSearch,
      lookupError: false,
      onLookupRetry: noop,
      ...filters,
      permissions: [],
      currentUserId: 'user',
      items,
      page: 1,
      pageSize: 20,
      totalCount: items.length,
      filterWarehouseId: '',
      statusFilter: '',
      dateFrom,
      dateTo: '',
      form,
      warehouseOptions: [{ value: warehouse, label: 'Kho QA' }],
      managedWarehouseOptions: [{ value: warehouse, label: 'Kho QA' }],
      productOptions: loading
        ? []
        : filtered
          ? products.filter((product) => product.value === productB)
          : products,
      slotOptions: loading || filtered ? [] : [{ value: slot, label: 'A-01' }],
      lotOptions: [],
      areOptionsLoading: loading,
      isLoading: false,
      isError: false,
      isPending: false,
      canCreate: true,
      canApprove: false,
      canSelfApprove: false,
      onRetry: noop,
      onPageChange: noop,
      onCreate,
      onUpdate,
      onAction: vi.fn(),
    }
    return <OpeningStockDirectory {...props} />
  }
  const rendered = render(<Harness />)
  const fill = (product: string) => {
    const productInput = screen.getByRole('combobox', { name: 'Sản phẩm' })
    fireEvent.focus(productInput)
    fireEvent.keyDown(productInput, { key: 'ArrowDown' })
    fireEvent.click(
      screen.getByRole('option', { name: product === productA ? 'Hàng A' : 'Hàng B' })
    )
    openLocationMenu()
    fireEvent.click(screen.getByRole('option', { name: 'A-01' }))
    fireEvent.change(screen.getByLabelText(/^Số lượng \(/), { target: { value: '2' } })
  }
  const open = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Tạo chứng từ' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Kho' }), {
      target: { value: warehouse },
    })
  }
  const attach = () => act(() => form!.setValue('evidenceFile', new File(['QA'], 'qa.csv')))
  return {
    rendered,
    Harness,
    fill,
    open,
    attach,
    onCreate,
    onUpdate,
    onLookupSearch,
    filters,
    getForm: () => form!,
  }
}
function openLocationMenu() {
  const input = screen.getByRole('combobox', { name: 'Vị trí' })
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
}
describe('opening stock directory filters', () => {
  it('saves a manually entered draft without an attachment', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    expect(screen.getByLabelText('Tài liệu đính kèm (không bắt buộc)')).not.toBeRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await waitFor(() => expect(test.onCreate).toHaveBeenCalledTimes(1))
    expect(test.getForm().getValues('evidenceFile')).toBeUndefined()
  })
  it('groups labeled filters in one responsive toolbar with full-width dropdowns', () => {
    mount()
    const toolbar = screen.getByRole('search', { name: 'Tìm kiếm và lọc chứng từ tồn đầu' })
    for (const label of [
      'Tìm kiếm',
      'Kho',
      'Trạng thái',
      'Ngày ghi nhận từ',
      'Ngày ghi nhận đến',
    ]) {
      expect(toolbar).toContainElement(screen.getByLabelText(label, { exact: true }))
    }
    expect(toolbar).toHaveClass('grid-cols-2', 'shrink-0')
    for (const dropdown of within(toolbar).getAllByRole('combobox')) {
      expect(dropdown.parentElement).toHaveClass('w-full', 'min-w-0')
    }
  })
  it('preserves all filter callbacks and the lower date bound', () => {
    const test = mount()
    test.rendered.rerender(<test.Harness dateFrom="2026-10-01" />)
    fireEvent.change(screen.getByLabelText('Tìm mã chứng từ'), { target: { value: 'OPEN-QA' } })
    fireEvent.change(screen.getByLabelText('Lọc theo kho'), { target: { value: warehouse } })
    fireEvent.change(screen.getByLabelText('Lọc theo trạng thái'), { target: { value: 'Posted' } })
    fireEvent.change(screen.getByLabelText('Ngày ghi nhận từ'), { target: { value: '2026-10-02' } })
    fireEvent.change(screen.getByLabelText('Ngày ghi nhận đến'), {
      target: { value: '2026-10-16' },
    })
    expect(test.filters.onSearchChange).toHaveBeenCalledWith('OPEN-QA')
    expect(test.filters.onFilterWarehouseChange).toHaveBeenCalledWith(warehouse)
    expect(test.filters.onStatusFilterChange).toHaveBeenCalledWith('Posted')
    expect(test.filters.onDateFromChange).toHaveBeenCalledWith('2026-10-02')
    expect(test.filters.onDateToChange).toHaveBeenCalledWith('2026-10-16')
    expect(screen.getByLabelText('Ngày ghi nhận đến')).toHaveAttribute('min', '2026-10-01')
  })
})
describe('opening stock draft rows and lookups', () => {
  it.each([
    ['Sản phẩm', 'product'],
    ['Vị trí', 'location'],
    ['Lô có sẵn (hàng theo lô phải chọn hoặc khai báo lô mới)', 'lot'],
  ])('removes separate search fields and searches through %s', (label, kind) => {
    const test = mount()
    test.open()
    for (const label of ['Tìm hàng hóa', 'Tìm vị trí/kệ', 'Tìm lô có sẵn']) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/Hiển thị tối đa 50 kết quả/)).not.toBeInTheDocument()
    act(() => test.getForm().setValue('productId', productA))
    const input = screen.getByRole('combobox', { name: label })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Từ khóa QA' } })
    expect(test.onLookupSearch).toHaveBeenCalledWith(kind, 'Từ khóa QA')
  })
  it('clears previous lot dates when another product is selected', () => {
    const test = mount()
    test.open()
    test.fill(productA)
    act(() => {
      test.getForm().setValue('lotId', slot)
      test.getForm().setValue('newLotNumber', 'OLD-LOT')
      test.getForm().setValue('manufacturedDate', '2026-01-01')
      test.getForm().setValue('expiryDate', '2027-01-01')
    })
    test.fill(productB)
    expect(test.getForm().getValues()).toMatchObject({
      productId: productB,
      lotId: '',
      newLotNumber: '',
      manufacturedDate: '',
      expiryDate: '',
    })
  })
  it('Escape closes an open lookup without discarding the draft dialog', () => {
    mount().open()
    const input = screen.getByRole('combobox', { name: 'Sản phẩm' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Tạo chứng từ tồn đầu' })).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([false, true])(
    'uses the shared slim scrollbar in the draft form (editing=%s)',
    (editing) => {
      const test = mount(editing ? [record] : [])
      if (editing) fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
      else test.open()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('data-scrollbar', 'slim')
      expect(dialog).toHaveClass('max-h-[90dvh]', 'overflow-y-auto')
    }
  )
  it('requires a warehouse before opening the map and preserves an unconfirmed row on cancel', async () => {
    const test = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo chứng từ' }))
    expect(screen.getByRole('combobox', { name: 'Vị trí' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Chọn trên sơ đồ' })).not.toBeInTheDocument()
    act(() => test.getForm().setValue('warehouseId', warehouse))
    test.fill(productA)
    openLocationMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trên sơ đồ' }))
    expect(await screen.findByRole('dialog', { name: 'Sơ đồ kho thử nghiệm' })).toHaveTextContent(
      warehouse
    )
    expect(screen.queryByRole('dialog', { name: 'Tạo chứng từ tồn đầu' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng sơ đồ' }))
    expect(await screen.findByLabelText('Vị trí')).toHaveValue('A-01')
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng A')
    expect(screen.getByLabelText(/^Số lượng \(/)).toHaveValue(2)
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Vị trí' })).toHaveFocus())
    expect(test.onCreate).not.toHaveBeenCalled()
  })
  it('pins a map selection outside lookup results and saves its identity and label', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    openLocationMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trên sơ đồ' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Dùng vị trí sơ đồ' }))
    expect(await screen.findByLabelText('Vị trí')).toHaveValue('Khu A / Kệ B / Ô 99')
    expect(test.getForm().getValues('slotId')).toBe('66666666-6666-4666-8666-666666666666')
    test.attach()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await waitFor(() => expect(test.onCreate).toHaveBeenCalledTimes(1))
    expect(test.onCreate.mock.calls[0]?.[1]?.[0]).toMatchObject({
      slotId: '66666666-6666-4666-8666-666666666666',
      slotLabel: 'Khu A / Kệ B / Ô 99',
    })
  })
  it('rejects a stale map selection if the warehouse changes while the map is open', async () => {
    const test = mount()
    test.open()
    openLocationMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trên sơ đồ' }))
    await screen.findByRole('dialog', { name: 'Sơ đồ kho thử nghiệm' })
    act(() => test.getForm().setValue('warehouseId', '77777777-7777-4777-8777-777777777777'))
    fireEvent.click(screen.getByRole('button', { name: 'Dùng vị trí sơ đồ' }))
    await screen.findByLabelText('Vị trí')
    expect(test.getForm().getValues('slotId')).not.toBe('66666666-6666-4666-8666-666666666666')
    expect(test.onCreate).not.toHaveBeenCalled()
  })
  it('keeps existing draft rows when picking another location while editing', async () => {
    const test = mount([record])
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    test.fill(productB)
    openLocationMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trên sơ đồ' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Dùng vị trí sơ đồ' }))
    await screen.findByLabelText('Vị trí')
    expect(screen.getByText('Dòng đã thêm (1)')).toBeInTheDocument()
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng B')
    expect(test.onUpdate).not.toHaveBeenCalled()
  })
  it('keeps DOM selection consistent with RHF while lookup data is replaced', () => {
    const test = mount()
    test.open()
    test.fill(productB)
    test.rendered.rerender(<test.Harness loading />)
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng B')
    expect(screen.getByLabelText('Vị trí')).toHaveValue('A-01')
    test.rendered.rerender(<test.Harness />)
    expect(test.getForm().getValues('productId')).toBe(productB)
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng B')
  })
  it('pins selected metadata when a server search returns other products and locations', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    test.rendered.rerender(<test.Harness filtered />)
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng A')
    expect(screen.getByLabelText('Vị trí')).toHaveValue('A-01')
    test.attach()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await waitFor(() => expect(test.onCreate).toHaveBeenCalledTimes(1))
    expect(test.onCreate.mock.calls[0]?.[1]?.[0]).toMatchObject({
      productId: productA,
      enteredUnitId: unit,
      slotLabel: 'A-01',
    })
  })
  it('does not discard a completed second row; it must be added before saving', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng và nhập tiếp' }))
    await screen.findByText('Dòng đã thêm (1)')
    test.fill(productB)
    test.attach()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await screen.findByText(/Còn một dòng chưa được thêm/)
    expect(test.onCreate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('Hàng B')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng và nhập tiếp' }))
    await screen.findByText('Dòng đã thêm (2)')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (2 dòng)' }))
    await waitFor(() => expect(test.onCreate).toHaveBeenCalledTimes(1))
    expect(test.onCreate.mock.calls[0]?.[1]).toHaveLength(2)
  })
  it('also protects an unfinished row while editing an existing draft', async () => {
    const test = mount([record])
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    test.fill(productB)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu 1 dòng' }))
    await screen.findByText(/Còn một dòng chưa được thêm/)
    expect(test.onUpdate).not.toHaveBeenCalled()
  })
  it('bounds a 200-row detail dialog and keeps the close action outside its scrolling content', () => {
    mount([
      {
        ...record,
        lines: Array.from({ length: 200 }, (_, index) => ({ ...recordLine, id: `line-${index}` })),
      },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }))
    const dialog = screen.getByRole('dialog')
    const body = within(dialog).getByLabelText('Nội dung phiếu tồn đầu')
    expect(dialog).toHaveClass('max-h-[90dvh]', 'overflow-hidden')
    expect(body).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(body).not.toContainElement(within(dialog).getByRole('button', { name: 'Đóng' }))
  })
})
