import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { ROUTE_CAPABILITIES, getAllowedRolesForPath } from '@/config/route-permissions'
import { APP_ROUTES } from '@/routes/app-routes'
import { USER_ROLES } from '@/config/roles'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { productImportService } from '../services/product-import.service'
import { productService } from '../services/product.service'
import { useProductImportInspect, useProductImportPreview } from '../hooks/use-product-import'
import {
  productImportFileSchema,
  productImportOptionsSchema,
} from '../schemas/product-import.schema'
import type {
  ProductImportInspect,
  ProductImportPreview,
  ProductImportPreviewRow,
} from '../types/product-import.types'
import {
  defaultProductImportOptions,
  importSelectionState,
  productImportPayload,
  productImportSheetLabel,
  productImportReportCsv,
  selectedProductImportRows,
  toggleImportSelection,
} from '../utils/product-import'
import ProductImportPage from './ProductImportPage'

const auth = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  data: { id: 'user', tenantId: 'tenant', permissions: ['products:import'] },
}))
const push = vi.hoisted(() => vi.fn())
vi.mock('@/features/auth/hooks/use-auth', () => ({ useMeQuery: () => auth }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const mapping = ['sku', 'productName', 'unit', 'category'].map((field, columnIndex) => ({
  field,
  columnIndex,
}))
const inspectData: ProductImportInspect = {
  isCsv: false,
  csvDelimiter: null,
  schema: {
    version: 1,
    templateVersion: '1',
    mainFields: mapping.map((item) => ({
      field: item.field,
      displayName: item.field,
      isRequired: true,
      aliases: [],
      description: '',
      defaultValue: null,
    })),
    conversionFields: ['sku', 'unit', 'conversionFactor'].map((field) => ({
      field,
      displayName: field,
      isRequired: true,
      aliases: [],
      description: '',
      defaultValue: null,
    })),
    limits: {
      maxUploadBytes: 5242880,
      maxProducts: 500,
      maxConversions: 2000,
      maxSheets: 16,
      maxColumns: 100,
      maxCellLength: 2000,
      maxPhysicalRows: 10000,
    },
  },
  sheets: [
    {
      sheetId: '1',
      sheetName: 'Hàng hóa',
      dataRowCount: 3,
      mainHeaderCandidates: [
        {
          rowNumber: 1,
          hasAllRequiredFields: true,
          suggestedMapping: mapping,
          columns: mapping.map((item) => ({
            columnIndex: item.columnIndex,
            letter: String(item.columnIndex),
            header: item.field,
          })),
        },
      ],
      conversionHeaderCandidates: [],
      sampleRows: [
        { rowNumber: 2, values: { '0': 'BIA-1', '1': 'Bia', '2': 'Lon', '3': 'Đồ uống' } },
      ],
    },
  ],
}
const row: ProductImportPreviewRow = {
  rowNumber: 2,
  sheetName: 'Hàng hóa',
  sku: 'BIA-1',
  productName: 'Bia',
  description: null,
  unitValue: 'Lon',
  categoryValue: 'Đồ uống',
  unit: { id: 'base-unit', code: 'LON', name: 'Lon' },
  category: { id: 'category', code: 'DU', name: 'Đồ uống' },
  isLotTracked: false,
  shelfLifeDays: null,
  unitConversions: [
    {
      rowNumber: 2,
      sheetName: 'Quy đổi',
      unitValue: 'Thùng',
      unit: { id: 'box-unit', code: 'THUNG', name: 'Thùng' },
      conversionFactor: 24,
      errors: [],
    },
  ],
  errors: [],
  warnings: [],
}
const issue = {
  code: 'Invalid',
  field: 'unit',
  message: 'Không tìm thấy đơn vị.',
  source: { sheetName: 'Hàng hóa', rowNumber: 3, columnIndex: 2 },
}
const invalid: ProductImportPreviewRow = {
  ...row,
  rowNumber: 3,
  sku: 'LOI',
  productName: 'Hàng lỗi',
  errors: [issue],
}
const previewData: ProductImportPreview = {
  schemaVersion: 1,
  summary: { products: 2, validProducts: 1, invalidProducts: 1, conversions: 2 },
  main: {
    ...defaultProductImportOptions(inspectData).main,
    sheetName: 'Hàng hóa',
    ignoredColumns: [],
  },
  conversions: null,
  rows: [row, invalid],
  fileErrors: [],
  warnings: [],
}

function wrapper(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
) {
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}
function renderPage() {
  const { client, Wrapper } = wrapper()
  return { client, ...render(<ProductImportPage />, { wrapper: Wrapper }) }
}
async function openReview() {
  await userEvent.upload(
    screen.getByLabelText('Tệp vật tư hàng hóa'),
    new File(['data'], 'hang.xlsx')
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' }))
  await screen.findByRole('checkbox', { name: 'Chọn dòng 2' })
}
async function save() {
  await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập' }))
}

beforeEach(() => {
  auth.isPending = false
  auth.isError = false
  auth.data.permissions = [P.PRODUCTS_IMPORT]
  auth.data.tenantId = 'tenant'
  auth.data.id = 'user'
  vi.spyOn(productImportService, 'inspect').mockResolvedValue(structuredClone(inspectData))
  vi.spyOn(productImportService, 'preview').mockResolvedValue(structuredClone(previewData))
  vi.spyOn(productImportService, 'template').mockResolvedValue(new Blob(['xlsx']))
  vi.spyOn(productService, 'importProducts').mockResolvedValue({
    isSuccess: true,
    statusCode: 200,
    message: '',
    data: null,
  })
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  push.mockClear()
})

describe('product import contract and selection', () => {
  it.each([
    ['HangHoa', 'Hàng hóa'],
    ['hang_hoa', 'Hàng hóa'],
    ['VatTuHangHoa', 'Vật tư hàng hóa'],
    ['Quydoi', 'Quy đổi'],
    ['QuyDoi', 'Quy đổi'],
    ['DonViQuyDoi', 'Đơn vị quy đổi'],
    ['Đơn vị quy đổi', 'Đơn vị quy đổi'],
    ['Hàng hóa kho Đà Nẵng', 'Hàng hóa kho Đà Nẵng'],
    ['Sheet1', 'Sheet1'],
  ])('displays sheet %s as %s without rewriting custom names', (source, label) => {
    expect(productImportSheetLabel(source)).toBe(label)
  })
  it('requires import capability independently of role-prefix guard', () => {
    expect(getAllowedRolesForPath(APP_ROUTES.productImport)).toContain(USER_ROLES.WarehouseStaff)
    expect(ROUTE_CAPABILITIES[APP_ROUTES.productImport]).toBe(P.PRODUCTS_IMPORT)
  })
  it.each(['bad.xls', 'bad.exe'])('rejects unsupported %s', (name) =>
    expect(productImportFileSchema.safeParse(new File(['x'], name)).success).toBe(false)
  )
  it('rejects empty and oversized files', () => {
    expect(productImportFileSchema.safeParse(new File([], 'empty.csv')).success).toBe(false)
    expect(
      productImportFileSchema.safeParse(new File([new Uint8Array(5242881)], 'big.xlsx')).success
    ).toBe(false)
  })
  it('does not guess ambiguous sheets or header candidates', () => {
    const copy = structuredClone(inspectData)
    copy.sheets.push({ ...copy.sheets[0]!, sheetId: '2' })
    expect(defaultProductImportOptions(copy).main.sheetId).toBe('')
    copy.sheets = [copy.sheets[0]!]
    copy.sheets[0]!.mainHeaderCandidates.push({
      ...copy.sheets[0]!.mainHeaderCandidates[0]!,
      rowNumber: 8,
    })
    expect(defaultProductImportOptions(copy).main.columnMapping).toEqual([])
  })
  it('requires supported schema and unique required mapping', () => {
    const options = defaultProductImportOptions(inspectData)
    expect(productImportOptionsSchema(inspectData).safeParse(options).success).toBe(true)
    expect(
      productImportOptionsSchema({
        ...inspectData,
        schema: { ...inspectData.schema, version: 2 },
      }).safeParse(options).success
    ).toBe(false)
    expect(
      productImportOptionsSchema(inspectData).safeParse({
        ...options,
        main: { ...options.main, columnMapping: [] },
      }).success
    ).toBe(false)
    expect(
      productImportOptionsSchema(inspectData).safeParse({
        ...options,
        main: {
          ...options.main,
          columnMapping: mapping.map((item) => ({ ...item, columnIndex: 0 })),
        },
      }).success
    ).toBe(false)
  })
  it('rejects same-sheet conversions and conversions on CSV', () => {
    const options = defaultProductImportOptions(inspectData)
    expect(
      productImportOptionsSchema(inspectData).safeParse({ ...options, conversions: options.main })
        .success
    ).toBe(false)
    expect(
      productImportOptionsSchema({ ...inspectData, isCsv: true }).safeParse({
        ...options,
        conversions: { ...options.main, sheetId: '2' },
      }).success
    ).toBe(false)
  })
  it('only submits resolved selected parents and all their children', () => {
    expect(productImportPayload(previewData, [2, 3, 999]).items).toEqual([
      {
        rowNumber: 2,
        sku: 'BIA-1',
        productName: 'Bia',
        description: null,
        unitId: 'base-unit',
        categoryId: 'category',
        isLotTracked: false,
        shelfLifeDays: null,
        unitConversions: [
          {
            unitId: 'box-unit',
            conversionFactor: 24,
            sourceRowNumber: 2,
            sourceSheetName: 'Quy đổi',
          },
        ],
      },
    ])
  })
  it('preserves exact decimal text through preview, confirmation payload and report', () => {
    const exact = '999999999999.123456'
    const data = {
      ...previewData,
      rows: [
        {
          ...row,
          unitConversions: [
            {
              ...row.unitConversions[0]!,
              conversionFactor: Number(exact),
              conversionFactorText: exact,
            },
          ],
        },
      ],
    }
    expect(productImportPayload(data, [2]).items[0]?.unitConversions?.[0]?.conversionFactor).toBe(
      exact
    )
    expect(productImportReportCsv(data)).toContain(exact)
  })
  it('blocks orphan file errors, unsupported version, invalid children and empty selection', () => {
    expect(selectedProductImportRows({ ...previewData, fileErrors: [issue] }, [2])).toEqual([])
    expect(selectedProductImportRows({ ...previewData, schemaVersion: 2 }, [2])).toEqual([])
    const childError = {
      ...row,
      unitConversions: [{ ...row.unitConversions[0]!, errors: [issue] }],
    }
    expect(selectedProductImportRows({ ...previewData, rows: [childError] }, [2])).toEqual([])
    expect(() => productImportPayload(previewData, [])).toThrow()
  })
  it('selects visible page without dropping other pages', () => {
    expect(toggleImportSelection([2, 50], [2, 3], false)).toEqual([50])
    expect(toggleImportSelection([50], [2, 3], true)).toEqual([50, 2, 3])
    expect(importSelectionState([2, 50], [2, 3])).toBe('indeterminate')
    expect(importSelectionState([2, 3], [2, 3])).toBe(true)
    expect(importSelectionState([], [])).toBe(false)
  })
  it('exports full source data and sanitizes spreadsheet injection/quotes/newlines', () => {
    const csv = productImportReportCsv({
      ...previewData,
      rows: [{ ...row, sku: '=HYPERLINK("url")', productName: ' +cmd\nquote"' }, invalid],
      warnings: [issue],
    })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain("'=HYPERLINK(")
    expect(csv).toContain("' +cmd")
    expect(csv).toContain('quote""')
    expect(csv).toContain('Hàng lỗi')
    expect(csv).toContain('1 Thùng = 24 Lon')
    expect(csv).toContain('Cảnh báo tệp')
  })
})

describe('product import workflow', () => {
  it('does not repeat catalog creation warnings already summarized in the confirmation', async () => {
    const preview = structuredClone(previewData)
    const warning = {
      code: 'catalogWillCreate',
      field: null,
      message: 'Sẽ tạo danh mục khi xác nhận nhập.',
      source: null,
    }
    preview.rows.forEach((item) => item.warnings.push(warning))
    preview.newCatalogs = [
      {
        id: 'base-unit',
        categories: false,
        item: {
          rowNumber: 2,
          code: 'DVT-LON',
          name: 'Lon',
          quantityPrecision: 0,
          parentCode: null,
          symbol: null,
          description: null,
        },
      },
    ]
    vi.mocked(productImportService.preview).mockResolvedValue(preview)
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('heading')).toHaveTextContent('Tạo 0 nhóm, 1 đơn vị tính.')
    expect(within(dialog).queryByText(warning.message)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/cảnh báo cần lưu ý trước khi nhập/)).not.toBeInTheDocument()
  })
  it('groups selected row warnings with sources and excludes unselected row warnings', async () => {
    const warning = {
      code: 'notice',
      field: 'description',
      message: 'Kiểm tra mô tả.',
      source: null,
    }
    vi.mocked(productImportService.preview).mockResolvedValue({
      ...structuredClone(previewData),
      warnings: [{ ...warning, code: 'file', message: 'Bỏ qua trang thông tin.' }],
      rows: [
        { ...structuredClone(row), warnings: [warning] },
        { ...structuredClone(row), rowNumber: 4, sku: 'BIA-2', warnings: [warning] },
        {
          ...structuredClone(invalid),
          warnings: [{ ...warning, message: 'Cảnh báo dòng không nhập.' }],
        },
      ],
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 sản phẩm' }))
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText('2 cảnh báo cần lưu ý trước khi nhập')).toBeInTheDocument()
    expect(dialog.getAllByText(warning.message)).toHaveLength(1)
    expect(dialog.getByText('Dòng nguồn: Hàng hóa:2, Hàng hóa:4')).toBeInTheDocument()
    expect(dialog.getByText('Bỏ qua trang thông tin.')).toBeInTheDocument()
    expect(dialog.queryByText('Cảnh báo dòng không nhập.')).not.toBeInTheDocument()
  })
  it('uses natural review height and an outlined deselect action', async () => {
    renderPage()
    await openReview()
    const panel = screen.getByRole('region', { name: 'Bản xem trước vật tư hàng hóa' })
    expect(panel).toHaveClass('flex-none', 'shrink-0')
    const deselect = screen.getByRole('button', { name: 'Bỏ chọn cả tệp' })
    expect(deselect).toHaveAttribute('data-variant', 'outline')
    await userEvent.click(deselect)
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).not.toBeChecked()
  })
  it('replaces resolved catalog warnings with selected pending creation counts', async () => {
    const preview = structuredClone(previewData)
    preview.missingReferences = [
      {
        categories: false,
        value: 'Lon',
        id: 'base-unit',
        suggestedCode: 'DVT-LON',
        productRows: [2],
        canCreate: true,
      },
    ]
    preview.newCatalogs = [
      {
        id: 'base-unit',
        categories: false,
        item: {
          rowNumber: 2,
          code: 'DVT-LON',
          name: 'Lon',
          quantityPrecision: 0,
          parentCode: null,
          symbol: null,
          description: null,
        },
      },
    ]
    vi.mocked(productImportService.preview).mockResolvedValue(preview)
    renderPage()
    await openReview()
    expect(screen.queryByText(/Danh mục cần xử lý ·/)).not.toBeInTheDocument()
    expect(screen.getByText('Danh mục đã được xử lý')).toBeInTheDocument()
    expect(
      screen.getByText('Sẽ tạo 0 nhóm và 1 đơn vị khi nhập các dòng đã chọn.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa danh mục' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn cả tệp' }))
    expect(screen.getByText('Các dòng đã chọn không cần tạo danh mục mới.')).toBeInTheDocument()
    expect(productService.importProducts).not.toHaveBeenCalled()
  })
  it('keeps the catalog warning when a reference has not resolved', async () => {
    vi.mocked(productImportService.preview).mockResolvedValue({
      ...structuredClone(previewData),
      missingReferences: [
        {
          categories: false,
          value: 'Lon',
          id: 'unresolved',
          suggestedCode: 'DVT-LON',
          productRows: [2],
          canCreate: true,
        },
      ],
    })
    renderPage()
    await openReview()
    expect(screen.getByText('Danh mục cần xử lý · 0 nhóm · 1 đơn vị')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem và xử lý' })).toBeEnabled()
  })
  it('announces the current step and focuses its heading after navigation', async () => {
    renderPage()
    await openReview()
    const heading = screen.getByRole('heading', { name: 'Bước 3: Kiểm tra' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      screen
        .getByRole('list', { name: 'Các bước nhập dữ liệu' })
        .querySelector('[aria-current=step]')
    ).toHaveTextContent('Kiểm tra')
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại kiểm tra' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' })).toHaveFocus()
    )
  })
  it('explains conversion mapping in Vietnamese without changing source names or mappings', async () => {
    const data = structuredClone(inspectData)
    data.sheets[0]!.sheetName = 'HangHoa'
    data.schema.mainFields.push({
      field: 'isLotTracked',
      displayName: 'Quản lý theo lô',
      isRequired: false,
      aliases: [],
      description: 'Có/Không, true/false hoặc 1/0.',
      defaultValue: 'false',
    })
    data.schema.conversionFields = data.schema.conversionFields.map((field, index) => ({
      ...field,
      displayName: ['Mã hàng', 'Đơn vị quy đổi', 'Hệ số quy đổi'][index]!,
    }))
    const conversionMapping = data.schema.conversionFields.map((field, columnIndex) => ({
      field: field.field,
      columnIndex,
    }))
    data.sheets.push({
      sheetId: '2',
      sheetName: 'DonViQuyDoi',
      dataRowCount: 1,
      mainHeaderCandidates: [],
      conversionHeaderCandidates: [
        {
          rowNumber: 1,
          hasAllRequiredFields: true,
          suggestedMapping: conversionMapping,
          columns: conversionMapping.map((item, index) => ({
            columnIndex: index,
            letter: String.fromCharCode(65 + index),
            header: item.field,
          })),
        },
      ],
      sampleRows: [{ rowNumber: 2, values: { '0': 'BIA-1', '1': 'Thùng', '2': '24' } }],
    })
    vi.mocked(productImportService.inspect).mockResolvedValueOnce(data)
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.xlsx')
    )
    expect(await screen.findByText('Chưa chọn trang tính quy đổi')).toBeVisible()
    expect(screen.getByText(/Mặc định: Không/)).toBeVisible()
    expect(screen.getByText('Mã dạng văn bản, tối đa 100 ký tự; không tự sinh mã.')).toBeVisible()
    expect(screen.getByLabelText('Dòng tiêu đề — HangHoa')).toHaveValue(1)
    expect(
      within(screen.getByLabelText('Trang tính hàng hóa')).getByRole('option', {
        name: 'Hàng hóa',
      })
    ).toHaveValue('1')
    expect(
      within(screen.getByLabelText('Trang tính quy đổi (tùy chọn)')).getByRole('option', {
        name: 'Đơn vị quy đổi',
      })
    ).toHaveValue('2')
    await userEvent.selectOptions(screen.getByLabelText('Trang tính quy đổi (tùy chọn)'), '2')
    expect(screen.queryByText('Chưa chọn trang tính quy đổi')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ghép cột đơn vị quy đổi' })).toBeVisible()
    expect(screen.getByText(/1 Thùng = 24 Lon/)).toBeVisible()
    expect(screen.getByLabelText('Hệ số quy đổi *')).toHaveValue('2')
    expect(screen.getByText(/1 đơn vị quy đổi = hệ số × đơn vị tính chính/)).toBeVisible()
    expect(screen.getByLabelText('sku *')).toHaveValue('0')
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' }))
    await waitFor(() => expect(productImportService.preview).toHaveBeenCalled())
    expect(vi.mocked(productImportService.preview).mock.calls[0]![1]).toMatchObject({
      main: { sheetId: '1', columnMapping: mapping },
      conversions: { sheetId: '2', columnMapping: conversionMapping },
    })
  })
  it('filters mapping without changing selected columns and blocks ambiguous mapping', async () => {
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.xlsx')
    )
    await screen.findByLabelText('sku *')
    await userEvent.selectOptions(screen.getByLabelText('Lọc cột hàng hóa'), 'mapped')
    await userEvent.type(screen.getByLabelText('Tìm trường hàng hóa'), 'productName')
    expect(screen.getByLabelText('productName *')).toHaveValue('1')
    expect(screen.queryByLabelText('sku *')).not.toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Tìm trường hàng hóa'))
    await userEvent.selectOptions(screen.getByLabelText('unit *'), '0')
    expect(await screen.findAllByText('Mơ hồ: trùng cột')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' })).toBeDisabled()
    expect(productImportService.preview).not.toHaveBeenCalled()
  })
  it('focuses and describes the first invalid field on form submission', async () => {
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.xlsx')
    )
    await userEvent.selectOptions(await screen.findByLabelText('sku *'), '')
    fireEvent.submit(document.getElementById('product-import-mapping')!)
    await waitFor(() => expect(screen.getByLabelText('sku *')).toHaveFocus())
    expect(screen.getByLabelText('sku *')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('sku *')).toHaveAccessibleDescription(/Ghép đủ các cột bắt buộc/)
  })
  it('uses a single CSV table even when its header cannot be suggested', async () => {
    const csv = structuredClone(inspectData)
    csv.isCsv = true
    csv.sheets[0]!.mainHeaderCandidates = []
    vi.mocked(productImportService.inspect).mockResolvedValueOnce(csv)
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.csv')
    )
    await screen.findByLabelText('sku *')
    expect(screen.getByLabelText('Trang tính hàng hóa')).toHaveValue('1')
    expect(screen.getByLabelText('Trang tính hàng hóa')).toBeDisabled()
    expect(screen.getByText(/Tệp CSV chỉ có bảng hàng hóa/)).toBeVisible()
    expect(screen.queryByLabelText('Trang tính quy đổi (tùy chọn)')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Dòng tiêu đề — Hàng hóa')).toHaveValue(1)
    expect(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' })).toBeDisabled()
  })
  it('maps custom late headers and populated columns with blank headings', async () => {
    const data = structuredClone(inspectData)
    data.isCsv = true
    const sheet = data.sheets[0]!
    sheet.mainHeaderCandidates = []
    sheet.sampleRows = [{ rowNumber: 1, values: { '0': 'Instructions' } }]
    sheet.columns = ['A', 'B', 'C', 'D', 'E'].map((letter, columnIndex) => ({
      columnIndex,
      letter,
      header: '',
    }))
    sheet.mappingRows = [
      {
        rowNumber: 8,
        values: { '0': 'Custom SKU', '1': 'Custom Name', '2': 'Custom Unit', '3': 'Custom Group' },
      },
      {
        rowNumber: 9,
        values: { '0': '001', '1': 'Beer', '2': 'LON', '3': 'BEER', '4': 'Description' },
      },
    ]
    vi.mocked(productImportService.inspect).mockResolvedValueOnce(data)
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.csv')
    )
    fireEvent.change(await screen.findByLabelText('Dòng tiêu đề — Hàng hóa'), {
      target: { value: '8' },
    })
    const select = screen.getByLabelText('productName *')
    expect(within(select).getByRole('option', { name: 'B — Custom Name' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'E — Không có tên' })).toBeInTheDocument()
    await userEvent.selectOptions(select, '1')
    expect(screen.getAllByText('Beer')[0]).toBeVisible()
  })
  it('links invalid checkbox to its reason and exposes conversion details', async () => {
    renderPage()
    await openReview()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 3' })).toHaveAccessibleDescription(
      /Không tìm thấy đơn vị/
    )
    expect(screen.queryByText(/0 cảnh báo/)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 lưu ý/)).not.toBeInTheDocument()
    expect(screen.getByText('Trang “Hàng hóa”, dòng 3: Không tìm thấy đơn vị.')).toBeVisible()
    await userEvent.click(screen.getAllByText('1 đơn vị quy đổi')[0]!)
    expect(screen.getAllByText('1 THUNG — Thùng = 24 LON — Lon')[0]).toBeVisible()
    expect(screen.getAllByText('LON — Lon')[0]).toBeVisible()
    expect(screen.getAllByText('DU — Đồ uống')[0]).toBeVisible()
  })
  it('marks product cells and keeps hidden-field and conversion errors available in the common result', async () => {
    const conversionIssue = {
      ...issue,
      field: 'conversionFactor',
      message: 'Hệ số phải lớn hơn 0.',
      source: { sheetName: 'Quy đổi', rowNumber: 8, columnIndex: 2 },
    }
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      rows: [
        {
          ...invalid,
          errors: [issue, { ...issue, field: 'description', message: 'Mô tả quá dài.' }],
          unitConversions: [{ ...row.unitConversions[0]!, errors: [conversionIssue] }],
        },
      ],
    })
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['data'], 'hang.xlsx')
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' }))
    await screen.findByRole('checkbox', { name: 'Chọn dòng 3' })
    expect(
      screen
        .getAllByRole('columnheader')
        .slice(1, 5)
        .map((header) => header.textContent)
    ).toEqual(['Dòng nguồn', 'Kết quả', 'Mã hàng', 'Tên hàng'])
    expect(screen.getByText('Không tìm thấy đơn vị.').closest('td')).toHaveClass('bg-destructive/5')
    expect(screen.queryByRole('columnheader', { name: 'Mô tả' })).not.toBeInTheDocument()
    // Lỗi của cột đang ẩn và của dòng quy đổi không có ô nào hiển thị nên luôn hiện đủ ở cột Kết quả.
    expect(screen.getByText('Trang “Hàng hóa”, dòng 3: Mô tả quá dài.')).toBeVisible()
    expect(screen.getByText('Trang “Quy đổi”, dòng 8: Hệ số phải lớn hơn 0.')).toBeVisible()
    expect(screen.getByText('Xem chi tiết (1 thông báo khác)')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung · 1 lỗi' }))
    expect(screen.getByText('Mô tả quá dài.').closest('td')).toHaveClass('bg-destructive/5')
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 3' })).toBeDisabled()
  })
  it('resets result pagination and retains the shared table footer', async () => {
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      rows: Array.from({ length: 22 }, (_, index) => ({
        ...row,
        rowNumber: index + 2,
        sku: `BIA-${index}`,
      })),
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 22 sản phẩm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập' }))
    const result = await screen.findByRole('region', { name: 'Kết quả từng sản phẩm' })
    expect(within(result).getByText('BIA-0')).toBeInTheDocument()
    expect(within(result).queryByText('BIA-20')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bước 4: Kết quả' })).toHaveFocus()
    )
    await userEvent.click(within(result).getByRole('button', { name: 'Trang sau' }))
    expect(within(result).getByText('BIA-20')).toBeInTheDocument()
  })
  it.each(['pending', 'denied', 'error'])(
    'does not call import APIs when permission is %s',
    (state) => {
      auth.isPending = state === 'pending'
      auth.isError = state === 'error'
      auth.data.permissions = []
      renderPage()
      expect(productImportService.inspect).not.toHaveBeenCalled()
      expect(productImportService.template).not.toHaveBeenCalled()
      expect(productImportService.preview).not.toHaveBeenCalled()
      expect(productService.importProducts).not.toHaveBeenCalled()
    }
  )
  it('invalid rows cannot be selected and partial header is indeterminate', async () => {
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      rows: [row, invalid, { ...row, rowNumber: 4 }],
    })
    renderPage()
    await openReview()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 3' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn dòng 2' }))
    expect(
      screen.getByRole('checkbox', { name: 'Chọn dòng hợp lệ trên trang này' })
    ).toBePartiallyChecked()
  })
  it('preserves selection through search and page changes', async () => {
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      rows: Array.from({ length: 22 }, (_, index) => ({
        ...row,
        rowNumber: index + 2,
        sku: `BIA-${index}`,
      })),
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn dòng 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn dòng hợp lệ trên trang này' }))
    await userEvent.type(screen.getByLabelText('Tìm trong bản xem trước'), 'BIA-0')
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).not.toBeChecked()
    expect(screen.getByText(/đã chọn 19\/22 dòng hợp lệ/)).toBeInTheDocument()
  })
  it('changing mapping invalidates old preview and selected rows', async () => {
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại ghép cột' }))
    await userEvent.selectOptions(screen.getByLabelText('sku *'), '')
    expect(screen.queryByRole('button', { name: 'Nhập 1 sản phẩm' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' })).toBeDisabled()
    expect(await screen.findByText('Ghép đủ các cột bắt buộc.')).toBeInTheDocument()
    expect(productImportService.preview).toHaveBeenCalledTimes(1)
  })
  it('no selection or blocking file error cannot commit', async () => {
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      fileErrors: [issue],
    })
    renderPage()
    await openReview()
    expect(screen.getByRole('button', { name: 'Nhập 0 sản phẩm' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeDisabled()
  })
  it('confirms only selected payload, counts children and invalidates without reload', async () => {
    const { client } = renderPage()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    await openReview()
    await save()
    expect(productService.importProducts).toHaveBeenCalledWith(
      productImportPayload(previewData, [2])
    )
    expect(await screen.findByText('Đã hoàn tất nhập sản phẩm')).toBeInTheDocument()
    expect(screen.getByText('Đã nhập 1 sản phẩm và 1 đơn vị quy đổi.')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })
  it.each([400, 409])(
    'retains preview on %s and does not retry automatically',
    async (statusCode) => {
      vi.mocked(productService.importProducts).mockRejectedValueOnce({
        statusCode,
        message: 'Mã đã tồn tại.',
      })
      renderPage()
      await openReview()
      await save()
      expect(await screen.findByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toHaveFocus()
      )
      expect(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' })).toBeDisabled()
      expect(productService.importProducts).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Đã hoàn tất nhập sản phẩm')).not.toBeInTheDocument()
    }
  )
  it('marks disconnected/server error as unknown, not definitely failed', async () => {
    vi.mocked(productService.importProducts).mockRejectedValueOnce({
      statusCode: 500,
      message: 'Network Error',
    })
    renderPage()
    await openReview()
    await save()
    expect(await screen.findByText(/Chưa xác định kết quả lưu do kết nối/)).toBeInTheDocument()
    expect(productService.importProducts).toHaveBeenCalledTimes(1)
  })
  it.each(['inspect', 'preview', 'commit'])('blocks the workspace on 403 at %s', async (stage) => {
    const error = { statusCode: 403, message: 'Không có quyền.' }
    if (stage === 'inspect') vi.mocked(productImportService.inspect).mockRejectedValueOnce(error)
    else if (stage === 'preview')
      vi.mocked(productImportService.preview).mockRejectedValueOnce(error)
    else vi.mocked(productService.importProducts).mockRejectedValueOnce(error)
    renderPage()
    if (stage === 'inspect')
      await userEvent.upload(
        screen.getByLabelText('Tệp vật tư hàng hóa'),
        new File(['x'], 'a.xlsx')
      )
    else if (stage === 'preview') {
      await userEvent.upload(
        screen.getByLabelText('Tệp vật tư hàng hóa'),
        new File(['x'], 'a.xlsx')
      )
      await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' }))
    } else {
      await openReview()
      await save()
    }
    expect(await screen.findByText(/Quyền nhập tệp đã bị thu hồi/)).toBeInTheDocument()
    const link = document.createElement('a')
    link.href = '/products'
    document.body.append(link)
    fireEvent.click(link)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bỏ các thay đổi chưa lưu?')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }))
    link.remove()
  })
  it('locks duplicate submit and file changes while pending', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof productService.importProducts>>) => void
    vi.mocked(productService.importProducts).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    renderPage()
    await openReview()
    await save()
    const confirm = screen.getByRole('button', { name: 'Đang nhập dữ liệu…' })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(screen.getByRole('button', { name: 'Chọn tệp khác', hidden: true })).toBeDisabled()
    expect(productService.importProducts).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ isSuccess: true, statusCode: 200, message: '', data: null }))
  })
  it('protects reload and navigation without persisting the file', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    renderPage()
    await openReview()
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    fireEvent.click(screen.getByRole('link', { name: 'Về danh sách vật tư hàng hóa' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bỏ các thay đổi chưa lưu?')
    expect(window.confirm).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }))
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeInTheDocument()
    expect(storage).not.toHaveBeenCalled()
  })
  it('retains preview during a failed recheck and blocks importing stale rows', async () => {
    vi.mocked(productService.importProducts).mockRejectedValueOnce({
      statusCode: 400,
      message: 'Kiểm tra lại dữ liệu.',
    })
    renderPage()
    await openReview()
    await save()
    let reject!: (reason: unknown) => void
    vi.mocked(productImportService.preview).mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail
      })
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra lại' }))
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeDisabled()
    expect(screen.getByText('Bia')).toBeInTheDocument()
    await act(async () => reject({ statusCode: 400, message: 'Không thể kiểm tra lại.' }))
    expect(await screen.findByText('Không thể kiểm tra lại.')).toBeInTheDocument()
    expect(screen.getByText('Bia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nhập 0 sản phẩm' })).toBeDisabled()
    expect(productService.importProducts).toHaveBeenCalledTimes(1)
  })

  it('preserves selected rows when supplementary columns are toggled', async () => {
    renderPage()
    await openReview()
    expect(screen.queryByRole('columnheader', { name: 'Mô tả' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung' }))
    expect(screen.getByRole('columnheader', { name: 'Mô tả' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn thông tin bổ sung' }))
    expect(screen.queryByRole('columnheader', { name: 'Mô tả' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeChecked()
  })

  it('locks both template buttons until the download fails, then allows retry', async () => {
    let reject!: (reason: unknown) => void
    vi.mocked(productImportService.template).mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail
      })
    )
    renderPage()
    const basic = screen.getByRole('button', { name: 'Mẫu cơ bản' })
    fireEvent.click(basic)
    fireEvent.click(basic)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mẫu có quy đổi' })).toBeDisabled()
    )
    expect(productImportService.template).toHaveBeenCalledTimes(1)
    await act(async () => reject({ statusCode: 500, message: 'Không thể tải mẫu.' }))
    await waitFor(() => expect(basic).toBeEnabled())
  })

  it('handles template failure without losing the file selection screen', async () => {
    vi.mocked(productImportService.template).mockRejectedValueOnce({
      statusCode: 500,
      message: 'Không thể tải mẫu.',
    })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Mẫu cơ bản' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mẫu cơ bản' })).toBeEnabled())
    expect(screen.getByLabelText('Tệp vật tư hàng hóa')).toBeInTheDocument()
  })
  it('includes ignored columns and sheets in explicit confirmation', async () => {
    vi.mocked(productImportService.preview).mockResolvedValueOnce({
      ...previewData,
      warnings: [{ ...issue, message: 'Bỏ qua cột Ghi chú và trang Thông tin.' }],
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 sản phẩm' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Bỏ qua cột Ghi chú và trang Thông tin.'
    )
    expect(productService.importProducts).not.toHaveBeenCalled()
  })
  it('CSV tab selector passes an actual tab and changing delimiter invalidates inspection', async () => {
    vi.mocked(productImportService.inspect).mockResolvedValue({
      ...inspectData,
      isCsv: true,
      csvDelimiter: ',',
    })
    renderPage()
    await userEvent.upload(
      screen.getByLabelText('Tệp vật tư hàng hóa'),
      new File(['x'], 'hang.csv')
    )
    await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' })
    await userEvent.selectOptions(screen.getByLabelText('Dấu phân cách CSV'), '\t')
    await waitFor(() => expect(productImportService.inspect).toHaveBeenCalledTimes(2))
    expect(productImportService.inspect).toHaveBeenCalledWith(
      expect.any(File),
      '\t',
      expect.any(AbortSignal)
    )
    await userEvent.selectOptions(screen.getByLabelText('Dấu phân cách CSV'), ';')
    await waitFor(() => expect(productImportService.inspect).toHaveBeenCalledTimes(3))
  })
  it('ignores late preview of an old mapping revision', async () => {
    let resolveOld!: (value: ProductImportPreview) => void
    let oldSignal!: AbortSignal
    vi.mocked(productImportService.preview).mockImplementationOnce((_file, _options, signal) => {
      oldSignal = signal
      return new Promise((done) => {
        resolveOld = done
      })
    })
    const { Wrapper } = wrapper()
    const options = defaultProductImportOptions(inspectData)
    const file = new File(['x'], 'hang.xlsx')
    const hook = renderHook(
      ({ revision }) => useProductImportPreview('session', revision, file, options),
      { initialProps: { revision: 1 }, wrapper: Wrapper }
    )
    await waitFor(() => expect(productImportService.preview).toHaveBeenCalled())
    hook.rerender({ revision: 2 })
    await waitFor(() => expect(hook.result.current.data?.rows[0]?.sku).toBe('BIA-1'))
    await act(async () => resolveOld({ ...previewData, rows: [{ ...row, sku: 'OLD' }] }))
    expect(oldSignal.aborted).toBe(true)
    expect(hook.result.current.data?.rows[0]?.sku).toBe('BIA-1')
  })
  it('revoked effective permission unmounts the file workflow', async () => {
    const page = renderPage()
    await openReview()
    auth.data.permissions = []
    page.rerender(<ProductImportPage />)
    expect(screen.getByText(/Bạn không có quyền nhập vật tư/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
  it('discards the file workspace when the tenant changes', async () => {
    const page = renderPage()
    await openReview()
    auth.data.tenantId = 'another-tenant'
    page.rerender(<ProductImportPage />)
    expect(screen.getByLabelText('Tệp vật tư hàng hóa')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(productService.importProducts).not.toHaveBeenCalled()
  })
  it('isolates late file A response and aborts it when switching to B', async () => {
    let resolveA!: (value: ProductImportInspect) => void
    let signalA!: AbortSignal
    vi.mocked(productImportService.inspect).mockImplementationOnce((_file, _delimiter, signal) => {
      signalA = signal
      return new Promise((done) => {
        resolveA = done
      })
    })
    const { Wrapper } = wrapper()
    const hook = renderHook(({ id, file }) => useProductImportInspect(id, file, 'auto'), {
      initialProps: { id: 'A', file: new File(['A'], 'a.xlsx') },
      wrapper: Wrapper,
    })
    await waitFor(() => expect(productImportService.inspect).toHaveBeenCalled())
    hook.rerender({ id: 'B', file: new File(['B'], 'b.xlsx') })
    await waitFor(() => expect(hook.result.current.data?.sheets[0]?.sheetName).toBe('Hàng hóa'))
    await act(async () =>
      resolveA({ ...inspectData, sheets: [{ ...inspectData.sheets[0]!, sheetName: 'Tệp A cũ' }] })
    )
    expect(signalA.aborted).toBe(true)
    expect(hook.result.current.data?.sheets[0]?.sheetName).toBe('Hàng hóa')
  })
  it('prepares missing catalogs only through a confirmed read-only preview', async () => {
    const id = '84ec110f-ff70-489e-a407-ce1493899522'
    const missing = {
      categories: false,
      value: 'Lon',
      id,
      suggestedCode: 'DVT-LON',
      productRows: [2],
      canCreate: true,
    }
    vi.mocked(productImportService.preview).mockResolvedValue({
      ...structuredClone(previewData),
      missingReferences: [missing],
      availableUnits: [],
      availableCategories: [],
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Xem và xử lý' }))
    expect(screen.getByRole('dialog', { name: 'Danh mục cần xử lý' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' }))
    expect(screen.getByText(/Tick xác nhận để áp dụng phương án tạo mới/)).toBeInTheDocument()
    expect(productImportService.preview).toHaveBeenCalledTimes(1)
    await userEvent.click(
      screen.getByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    )
    expect(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' })).toBeEnabled()
    await userEvent.click(
      screen.getByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    )
    expect(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' })).toBeDisabled()
    await userEvent.click(
      screen.getByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    )
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' }))
    await waitFor(() => expect(productImportService.preview).toHaveBeenCalledTimes(2))
    const options = vi.mocked(productImportService.preview).mock.calls[1]![1]
    expect(options.confirmCreateCatalogs).toBe(true)
    expect(options.newCatalogs?.[0]?.item).toMatchObject({
      code: 'DVT-LON',
      name: 'Lon',
      quantityPrecision: 0,
    })
    expect(productService.importProducts).not.toHaveBeenCalled()
  })
  it('sends only new catalogs required by the selected product rows', () => {
    const preview = structuredClone(previewData)
    preview.newCatalogs = [
      {
        id: 'base-unit',
        categories: false,
        item: {
          rowNumber: 2,
          code: 'DVT-LON',
          name: 'Lon',
          quantityPrecision: 0,
          parentCode: null,
          symbol: null,
          description: null,
        },
      },
      {
        id: 'unused',
        categories: false,
        item: {
          rowNumber: 3,
          code: 'DVT-KHAC',
          name: 'Khác',
          quantityPrecision: 0,
          parentCode: null,
          symbol: null,
          description: null,
        },
      },
      {
        id: 'box-unit',
        categories: false,
        item: {
          rowNumber: 2,
          code: 'DVT-THUNG',
          name: 'Thùng',
          quantityPrecision: 0,
          parentCode: null,
          symbol: null,
          description: null,
        },
      },
    ]
    const payload = productImportPayload(preview, [2])
    expect(payload.newCatalogs?.map((item) => item.id)).toEqual(['base-unit', 'box-unit'])
    expect(payload.confirmCreateCatalogs).toBe(true)
  })

  it('preserves catalog edits when recheck fails and the panel is reopened', async () => {
    vi.mocked(productImportService.preview)
      .mockResolvedValueOnce({
        ...structuredClone(previewData),
        missingReferences: [
          {
            categories: false,
            value: 'Lon',
            id: '84ec110f-ff70-489e-a407-ce1493899522',
            suggestedCode: 'DVT-LON',
            productRows: [2],
            canCreate: true,
          },
        ],
        availableUnits: [],
        availableCategories: [],
      })
      .mockRejectedValueOnce({
        statusCode: 409,
        message: 'Mã đã tồn tại. Kiểm tra lại.',
        isSuccess: false,
      })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Xem và xử lý' }))
    const code = screen.getByLabelText(/^Mã/)
    await userEvent.clear(code)
    await userEvent.type(code, 'DVT-LON-MOI')
    await userEvent.click(
      screen.getByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    )
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' }))
    await waitFor(() => expect(productImportService.preview).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Danh mục cần xử lý' })).not.toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Xem và xử lý' }))
    expect(screen.getByLabelText(/^Mã/)).toHaveValue('DVT-LON-MOI')
    expect(
      screen.getByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    ).toBeChecked()
    expect(productService.importProducts).not.toHaveBeenCalled()
  })

  it('shows category paths in existing and parent selectors without changing their IDs', async () => {
    const id = 'eb8a68bb-8528-43cb-991a-6c046f5ea7ba'
    vi.mocked(productImportService.preview).mockResolvedValue({
      ...structuredClone(previewData),
      missingReferences: [
        {
          categories: true,
          value: 'Khác',
          id,
          suggestedCode: 'NHOM-KHAC',
          productRows: [2],
          canCreate: true,
        },
      ],
      availableCategories: [
        { id: 'existing', code: 'CHILD', name: 'Khác', path: 'Đồ uống / Khác' },
      ],
    })
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Xem và xử lý' }))
    expect(screen.getByRole('option', { name: 'CHILD — Đồ uống / Khác' })).toHaveValue('CHILD')
    await userEvent.selectOptions(screen.getByLabelText('Cách xử lý'), 'existing')
    expect(
      screen.queryByLabelText('Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.')
    ).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CHILD — Đồ uống / Khác' })).toHaveValue('existing')
    await userEvent.selectOptions(screen.getByLabelText('Danh mục đang hoạt động'), 'existing')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng và kiểm tra lại' }))
    await waitFor(() => expect(productImportService.preview).toHaveBeenCalledTimes(2))
    expect(vi.mocked(productImportService.preview).mock.calls[1]![1].referenceChoices).toEqual([
      { categories: true, value: 'Khác', id: 'existing' },
    ])
    expect(productService.importProducts).not.toHaveBeenCalled()
  })
})
