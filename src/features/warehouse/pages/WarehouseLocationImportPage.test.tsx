import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WarehouseLocationImportPage from './WarehouseLocationImportPage'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
  WarehouseLocationImportRow,
} from '../types/warehouse-location-import.types'

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  preview: vi.fn(),
  commit: vi.fn(),
  template: vi.fn(),
  permissions: ['warehouses:view', 'warehouses:configure-layout'],
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'u', tenantId: 't', permissions: mocks.permissions } }),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => 'WarehouseManager' }))
vi.mock('../hooks/use-warehouse', () => ({
  useWarehouseQuery: () => ({
    data: { warehouseCode: 'WH', warehouseName: 'Kho', status: 'Active' },
  }),
}))
vi.mock('../hooks/use-warehouse-location-import', () => ({
  useWarehouseLocationImport: () => ({
    inspect: { mutateAsync: mocks.inspect },
    preview: { mutateAsync: mocks.preview },
    commit: { mutateAsync: mocks.commit },
    template: { mutateAsync: mocks.template },
  }),
}))
vi.mock('@/components/operations/use-import-navigation', () => ({
  useImportNavigation: () => ({
    discardOpen: false,
    requestDiscard: (action: () => void) => action(),
    cancelDiscard: vi.fn(),
    confirmDiscard: vi.fn(),
  }),
}))

const inspection: WarehouseLocationImportInspection = {
  schemaVersion: 1,
  mode: 'Zones',
  isCsv: true,
  csvDelimiter: ',',
  fieldsByKind: {
    Zone: [
      {
        field: 'zoneCode',
        displayName: 'Mã khu vực',
        isRequired: true,
        aliases: [],
        description: 'Mã',
      },
    ],
  },
  sheetsByKind: {
    Zone: [
      {
        sheetId: 'csv',
        sheetName: 'Dữ liệu',
        sampleRows: [],
        headerCandidates: [
          {
            rowNumber: 1,
            hasAllRequiredFields: true,
            columns: [{ columnIndex: 0, letter: 'A', header: 'Mã khu vực' }],
            suggestedMapping: [{ field: 'zoneCode', columnIndex: 0 }],
          },
        ],
      },
    ],
  },
}
const row: WarehouseLocationImportRow = {
  rowKey: 'z',
  kind: 'Zone',
  action: 'Create',
  canSelect: true,
  displayPath: 'Z',
  values: { zoneCode: 'Z' },
  sourceValues: { zoneCode: 'Z' },
  source: { sheetId: 'csv', sheetName: 'Dữ liệu', rowNumber: 2 },
  requiredParentRowKeys: [],
  issues: [],
  fieldErrors: {},
}
const preview: WarehouseLocationImportPreview = {
  schemaVersion: 1,
  warehouseId: 'w',
  warehouseCode: 'WH',
  warehouseName: 'Kho',
  fileName: 'zones.csv',
  previewFingerprint: 'sha256:x',
  capabilities: { canImport: true, canViewLayout: true, canEditLayout: false },
  rows: [row],
  ignoredColumns: [],
  ignoredSheets: [],
  fileWarnings: [],
  summary: { totalRows: 1, createRows: 1, referenceRows: 0, invalidRows: 0 },
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.permissions = ['warehouses:view', 'warehouses:configure-layout']
  mocks.inspect.mockResolvedValue(inspection)
  mocks.preview.mockResolvedValue(preview)
  mocks.commit.mockResolvedValue({
    createdCounts: { zones: 1, racks: 0, slots: 0 },
    created: [{ rowKey: 'z', kind: 'Zone', id: 'id', code: 'Z', displayPath: 'Z' }],
    referenceCounts: 0,
    unselectedCounts: 0,
    layoutNeedsArrangement: true,
  })
})

async function upload(expectedSelection = 1) {
  await userEvent.selectOptions(screen.getByLabelText('Bạn muốn nhập gì?'), 'Zones')
  await userEvent.upload(
    screen.getByLabelText('Tệp cấu trúc và vị trí kho'),
    new File(['Z'], 'zones.csv', { type: 'text/csv' })
  )
  await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' })
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' }))
  await screen.findByRole('button', { name: `Nhập ${expectedSelection} mục` })
}

describe('warehouse import workflow', () => {
  it('checks effective permission before offering upload', () => {
    mocks.permissions = ['warehouses:view']
    render(<WarehouseLocationImportPage warehouseId="w" />)
    expect(screen.queryByText('Tải tệp lên')).not.toBeInTheDocument()
  })
  it('commits the source and fingerprint only after explicit confirmation', async () => {
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload()
    expect(mocks.commit).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 mục' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập' }))
    await screen.findByText('Đã hoàn tất nhập cấu trúc kho')
    expect(mocks.commit).toHaveBeenCalledTimes(1)
    expect(mocks.commit.mock.lastCall?.[0].selection).toEqual({
      expectedPreviewFingerprint: 'sha256:x',
      selectedRowKeys: ['z'],
      acknowledgeIgnoredData: false,
    })
  })
  it('does not replay an uncertain save, even after checking again', async () => {
    mocks.commit.mockRejectedValue(new Error('disconnect'))
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 1 mục' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập' }))
    await screen.findByText('Chưa xác định kết quả lưu')
    expect(screen.getByRole('button', { name: 'Nhập 1 mục' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại dữ liệu' }))
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Nhập 1 mục' })).toBeDisabled()
    expect(mocks.commit).toHaveBeenCalledTimes(1)
  })
  it('blocks repeated upload events synchronously while reading', async () => {
    let resolve: (value: WarehouseLocationImportInspection) => void = () => {}
    mocks.inspect.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    render(<WarehouseLocationImportPage warehouseId="w" />)
    const input = screen.getByLabelText('Tệp cấu trúc và vị trí kho')
    const file = new File(['Z'], 'zones.csv')
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [file] } })
    expect(mocks.inspect).toHaveBeenCalledTimes(1)
    await act(async () => resolve(inspection))
  })
  it('requires an explicit choice when a selected child loses its new parent', async () => {
    mocks.preview.mockResolvedValue({
      ...preview,
      rows: [row, { ...row, rowKey: 'r', kind: 'Rack', displayPath: 'Z / R', requiredParentRowKeys: ['z'] }],
      summary: { totalRows: 2, createRows: 2, referenceRows: 0, invalidRows: 0 },
    })
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload(2)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn Z, dòng 2' }))
    expect(screen.getByRole('button', { name: 'Nhập 1 mục' })).toBeDisabled()
    expect(screen.getByText('Cần chọn thêm 1 dòng cha')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chọn lại cha cần thiết' }))
    expect(screen.getByRole('button', { name: 'Nhập 2 mục' })).toBeEnabled()
    expect(mocks.commit).not.toHaveBeenCalled()
  })
  it('does not enable saving ignored data without acknowledgement', async () => {
    mocks.preview.mockResolvedValue({ ...preview, ignoredSheets: ['Ghi chú'] })
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload()
    expect(screen.getByRole('button', { name: 'Nhập 1 mục' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý bỏ qua/ }))
    expect(screen.getByRole('button', { name: 'Nhập 1 mục' })).toBeEnabled()
    expect(mocks.commit).not.toHaveBeenCalled()
  })
})
