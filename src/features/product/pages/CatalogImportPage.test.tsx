import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosHeaders } from 'axios'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type { SpreadsheetImportInspection } from '@/components/operations/spreadsheet-import.types'
import { logger } from '@/lib/logger'
import { catalogImportService } from '../services/catalog-import.service'
import type { CatalogImportKind, CatalogImportRow } from '../types/catalog-import.types'
import CatalogImportPage from './CatalogImportPage'

const auth = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  data: { id: 'user', tenantId: 'tenant', permissions: ['units:manage', 'categories:manage'] },
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({ useMeQuery: () => auth }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const inspection: SpreadsheetImportInspection = {
  schemaVersion: 1,
  isCsv: true,
  csvDelimiter: ',',
  fields: [
    { field: 'name', displayName: 'Tên ĐVT', isRequired: true, aliases: [], description: '' },
  ],
  sheets: [
    {
      sheetId: 'csv',
      sheetName: 'Đơn vị tính',
      sampleRows: [],
      headerCandidates: [
        {
          rowNumber: 1,
          hasAllRequiredFields: true,
          suggestedMapping: [{ field: 'name', columnIndex: 0 }],
          columns: [{ columnIndex: 0, letter: 'A', header: 'Tên ĐVT' }],
        },
      ],
    },
  ],
}
const row: CatalogImportRow = {
  rowNumber: 2,
  code: 'DVT-LON',
  name: 'Lon',
  parentCode: null,
  parentPath: null,
  symbol: null,
  quantityPrecision: 0,
  description: null,
  errors: [],
  fieldErrors: {},
}

function renderPage(kind: CatalogImportKind = 'units') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <CatalogImportPage kind={kind} />
    </QueryClientProvider>
  )
}
async function openReview(kind: CatalogImportKind = 'units') {
  await userEvent.upload(
    screen.getByLabelText(`Tệp ${kind === 'units' ? 'đơn vị tính' : 'nhóm vật tư hàng hóa'}`),
    new File(['Tên\nLon'], 'catalog.csv', { type: 'text/csv' })
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' }))
  await screen.findByText('Bản xem trước')
}
beforeEach(() => {
  auth.data.permissions = [P.UNITS_MANAGE, P.CATEGORIES_MANAGE]
  auth.data.tenantId = 'tenant'
  vi.spyOn(catalogImportService, 'inspect').mockResolvedValue(structuredClone(inspection))
  vi.spyOn(catalogImportService, 'preview').mockResolvedValue({ rows: [structuredClone(row)] })
  vi.spyOn(catalogImportService, 'commit').mockResolvedValue({
    data: { isSuccess: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
  vi.spyOn(catalogImportService, 'template').mockResolvedValue(new Blob(['template']))
  vi.spyOn(logger, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('catalog import', () => {
  it('blocks repeated upload while reading and allows retry after failure', async () => {
    let rejectRead!: (error: Error) => void
    vi.mocked(catalogImportService.inspect).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRead = reject
        })
    )
    renderPage()
    const file = new File(['Tên\nLon'], 'catalog.csv', { type: 'text/csv' })
    const input = screen.getByLabelText('Tệp đơn vị tính')
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(catalogImportService.inspect).toHaveBeenCalledTimes(1))
    await act(async () => rejectRead(new Error('Không thể đọc tệp.')))
    await userEvent.click(await screen.findByRole('button', { name: 'Đọc lại tệp' }))
    await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' })
    expect(catalogImportService.inspect).toHaveBeenCalledTimes(2)
  })

  it('does not retry an uncertain commit or permit a second write', async () => {
    vi.mocked(catalogImportService.commit).mockRejectedValueOnce(new Error('Mất kết nối'))
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: /Nhập 1 đơn vị tính/ }))
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
    await waitFor(() => expect(catalogImportService.commit).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Nhập 1 đơn vị tính/ })).toBeDisabled()
    )
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại dữ liệu' })).not.toBeInTheDocument()
    expect(screen.getByText('DVT-LON')).toBeInTheDocument()
  })

  it.each(['units', 'categories'] as const)(
    'uses the shared four-step workflow for %s',
    async (kind) => {
      renderPage(kind)
      await openReview(kind)
      expect(screen.getByText('Bản xem trước')).toBeInTheDocument()
      expect(screen.getByText('Tổng số:')).toBeInTheDocument()
      const previewRow = screen.getByRole('row', { name: /DVT-LON/ })
      expect(within(previewRow).getByText('DVT-LON')).toBeInTheDocument()
      expect(within(previewRow).queryByRole('textbox')).not.toBeInTheDocument()
      expect(catalogImportService.preview).toHaveBeenCalledWith(
        kind,
        expect.any(File),
        expect.any(Object),
        undefined
      )
      expect(catalogImportService.commit).not.toHaveBeenCalled()
    }
  )
  it.each(['units', 'categories'] as const)(
    'keeps invalid %s codes fully visible and read-only',
    async (kind) => {
      const longCode = 'N'.repeat(51)
      const message = 'Mã danh mục bắt buộc, tối đa 50 ký tự.'
      vi.mocked(catalogImportService.preview).mockResolvedValueOnce({
        rows: [{ ...row, code: longCode, errors: [message], fieldErrors: { code: [message] } }],
      })
      renderPage(kind)
      await openReview(kind)
      const previewRow = screen.getByRole('row', { name: new RegExp(longCode) })
      expect(within(previewRow).getByText(longCode)).toBeInTheDocument()
      expect(within(previewRow).getAllByText(message).length).toBeGreaterThan(0)
      expect(within(previewRow).queryByRole('textbox')).not.toBeInTheDocument()
      expect(within(previewRow).getByRole('checkbox')).toBeDisabled()
    }
  )
  it.each(['units', 'categories'] as const)(
    'imports the validated read-only %s code unchanged',
    async (kind) => {
      renderPage(kind)
      await openReview(kind)
      await userEvent.click(screen.getByRole('button', { name: 'Quay lại ghép cột' }))
      await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' }))
      await waitFor(() => expect(catalogImportService.preview).toHaveBeenCalledTimes(2))
      expect(vi.mocked(catalogImportService.preview).mock.calls[1]?.[3]).toBeUndefined()
      await userEvent.click(screen.getByRole('button', { name: /Nhập 1/ }))
      await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
      await waitFor(() =>
        expect(catalogImportService.commit).toHaveBeenCalledWith(kind, [
          expect.objectContaining({ code: row.code }),
        ])
      )
    }
  )
  it('revalidates from the source file after changing the mapping', async () => {
    renderPage()
    await openReview()
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại ghép cột' }))
    await userEvent.selectOptions(screen.getByLabelText('Dấu phân cách CSV'), ';')
    await waitFor(() => expect(catalogImportService.inspect).toHaveBeenCalledTimes(2))
    await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' }))
    await waitFor(() => expect(catalogImportService.preview).toHaveBeenCalledTimes(2))
    expect(vi.mocked(catalogImportService.preview).mock.calls[1]?.[3]).toBeUndefined()
  })
  it('denies users without manage permission before calling import APIs', () => {
    auth.data.permissions = []
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Bạn không có quyền nhập đơn vị tính.')
    expect(catalogImportService.inspect).not.toHaveBeenCalled()
    expect(catalogImportService.commit).not.toHaveBeenCalled()
  })
})
