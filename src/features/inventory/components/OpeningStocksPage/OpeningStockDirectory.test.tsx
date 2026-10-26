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

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

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
    onConfirm: ComponentProps<
      typeof import('@/features/transfer/components/TransferFormPage/TransferSlotMapDialog').TransferSlotMapDialog
    >['onConfirm']
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
              capacity: {
                capacity: 100,
                capacityUnitName: 'Thùng',
                remainingCapacity: 8,
                requiresCapacityConfiguration: false,
              },
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
const convertedUnit = '77777777-7777-4777-8777-777777777777'
const products = [productA, productB].map((value, index) => ({
  value,
  label: `Hàng ${index ? 'B' : 'A'}`,
  unitId: unit,
  unitName: 'Cái',
  isLotTracked: false,
  units: [
    { unitId: unit, unitName: 'Cái', conversionFactor: 1, quantityPrecision: 2 },
    { unitId: convertedUnit, unitName: 'Thùng', conversionFactor: 12, quantityPrecision: 0 },
  ],
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
  const onRetry = vi.fn()
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
    capacityDescription,
    recordId,
  }: {
    loading?: boolean
    filtered?: boolean
    dateFrom?: string
    capacityDescription?: string
    recordId?: string
  }) {
    form = useForm<CreateOpeningStockFormValues>({
      resolver: zodResolver(createOpeningStockSchema),
    })
    const noop = vi.fn()
    const props: Props = {
      recordId,
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
      slotOptions:
        loading || filtered
          ? []
          : [{ value: slot, label: 'A-01', description: capacityDescription }],
      lotOptions: [],
      areOptionsLoading: loading,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPending: false,
      canCreate: true,
      canApprove: false,
      canSelfApprove: false,
      onRetry,
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
    fireEvent.change(screen.getByLabelText('Mã chứng từ *'), { target: { value: 'TDK-0001' } })
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
    onRetry,
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
  it('does not silently reinterpret a stale unit or allow fractional whole-unit quantities', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    act(() => test.getForm().setValue('enteredUnitId', warehouse))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng và nhập tiếp' }))
    await screen.findByText('Chọn lại đơn vị tính đang hoạt động.')
    expect(screen.queryByText('Dòng đã thêm (1)')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Đơn vị tính'), { target: { value: convertedUnit } })
    fireEvent.change(screen.getByLabelText(/^Số lượng \(/), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng và nhập tiếp' }))
    await screen.findByText('Số lượng chỉ được có tối đa 0 chữ số thập phân theo đơn vị đã chọn.')
    expect(screen.queryByText('Dòng đã thêm (1)')).not.toBeInTheDocument()
    expect(test.onCreate).not.toHaveBeenCalled()
  })
  it('requires a user-entered document code instead of generating one', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    fireEvent.change(screen.getByLabelText('Mã chứng từ *'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await screen.findByText('Nhập mã chứng từ.')
    expect(test.onCreate).not.toHaveBeenCalled()
  })
  it('keeps the draft dialog when Escape is used from a native unit selector', () => {
    const test = mount()
    test.open()
    test.fill(productA)
    fireEvent.keyDown(screen.getByLabelText('Đơn vị tính'), { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Tạo chứng từ tồn đầu' })).toBeInTheDocument()
  })
  it('shows location capacity in the dropdown and keeps it visible after selection', () => {
    const test = mount()
    test.open()
    const description = 'Sức chứa tối đa: 100 Cái'
    test.rendered.rerender(<test.Harness capacityDescription={description} />)
    openLocationMenu()
    expect(screen.getByRole('option', { name: /A-01.*Sức chứa tối đa/ })).toHaveTextContent(
      description
    )
    fireEvent.click(screen.getByRole('option', { name: /A-01.*Sức chứa tối đa/ }))
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(test.getForm().getValues('slotId')).toBe(slot)
  })
  it('keeps the draft and shows a rejected create message next to the save action', async () => {
    const test = mount()
    test.open()
    test.fill(productA)
    const message = 'Kệ A01 đang dùng cấu hình sức chứa cũ. Vui lòng chọn đơn vị sức chứa.'
    test.onCreate.mockImplementationOnce(async () => {
      test.getForm().setError('root.server', { type: 'server', message })
      throw new Error(message)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('dialog', { name: 'Tạo chứng từ tồn đầu' })).toBeInTheDocument()
    expect(test.getForm().getValues('productId')).toBe(productA)
    expect(test.getForm().getValues('slotId')).toBe(slot)
    expect(test.getForm().getValues('quantity')).toBe(2)
  })
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
    const test = mount()
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
    const reload = screen.getByRole('button', { name: 'Làm mới tồn đầu kỳ' })
    expect(toolbar).not.toContainElement(reload)
    fireEvent.click(reload)
    expect(test.onRetry).toHaveBeenCalledOnce()
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
      expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-hidden')
      const body = dialog.querySelector('form')
      expect(body).toHaveAttribute('data-scrollbar', 'slim')
      expect(body).toHaveClass('min-h-0', 'overflow-y-auto')
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
    expect(screen.getByText('Còn trống: 8 Thùng · Tối đa: 100 Thùng')).toBeInTheDocument()
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
  it('opens the detail route from a row without hijacking edit actions', () => {
    router.push.mockClear()
    mount([record])
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toHaveClass(
      'w-px',
      'text-center'
    )
    const editButton = screen.getByRole('button', { name: 'Sửa' })
    expect(editButton.closest('td')).toHaveClass('w-px')
    expect(editButton.parentElement?.parentElement).toHaveClass('w-max', 'ml-auto')
    fireEvent.click(screen.getByText('Kho QA', { selector: 'td' }))
    expect(router.push).toHaveBeenCalledWith('/inventory/opening-stocks/record')
    expect(screen.getByRole('link', { name: record.code })).toHaveAttribute(
      'href',
      '/inventory/opening-stocks/record'
    )
    expect(screen.queryByRole('button', { name: 'Chi tiết' })).not.toBeInTheDocument()
    router.push.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(router.push).not.toHaveBeenCalled()
  })
  it('renders a 200-row detail page with the shared scrollable table instead of a dialog', () => {
    const test = mount([
      {
        ...record,
        lines: Array.from({ length: 200 }, (_, index) => ({ ...recordLine, id: `line-${index}` })),
      },
    ])
    test.rendered.rerender(<test.Harness recordId="record" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const panel = screen.getByLabelText('Dòng hàng chứng từ tồn đầu kỳ')
    expect(panel).toHaveAttribute('data-slot', 'operational-list-panel')
    expect(within(panel).getAllByRole('row')).toHaveLength(201)
    expect(screen.getByRole('link', { name: 'Danh sách tồn đầu kỳ' })).toHaveAttribute(
      'href',
      '/inventory/opening-stocks'
    )
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeEnabled()
  })
  it('uses entered quantity when editing converted lines, not their base quantity', async () => {
    const test = mount([
      {
        ...record,
        lines: [
          {
            ...recordLine,
            enteredUnitId: convertedUnit,
            enteredUnitName: 'Thùng',
            enteredQuantity: 2,
            quantity: 24,
            baseQuantity: 24,
            conversionFactorSnapshot: 12,
          },
        ],
      },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(screen.getByLabelText('Số lượng dòng 1')).toHaveValue(2)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu 1 dòng' }))
    await waitFor(() => expect(test.onUpdate).toHaveBeenCalledTimes(1))
    expect(test.onUpdate.mock.calls[0]?.[1][0]).toMatchObject({
      quantity: 2,
      conversionFactor: 12,
      enteredUnitId: convertedUnit,
    })
  })
  it('submits a selected conversion and keeps document code manual', async () => {
    const test = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo chứng từ' }))
    expect(screen.getByLabelText('Mã chứng từ *')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Mã chứng từ *'), { target: { value: 'TDK-MANUAL' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Kho' }), {
      target: { value: warehouse },
    })
    test.fill(productA)
    fireEvent.change(screen.getByLabelText('Đơn vị tính'), { target: { value: convertedUnit } })
    expect(screen.getByText('Quy về đơn vị chính: 24 Cái')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nháp (1 dòng)' }))
    await waitFor(() => expect(test.onCreate).toHaveBeenCalledTimes(1))
    expect(test.onCreate.mock.calls[0]?.[0].code).toBe('TDK-MANUAL')
    expect(test.onCreate.mock.calls[0]?.[1][0]).toMatchObject({
      quantity: 2,
      enteredUnitId: convertedUnit,
      conversionFactor: 12,
    })
  })
})
