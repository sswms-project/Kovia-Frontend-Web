import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('summarizes valid, existing and invalid rows per kind and updates selected counts', async () => {
    mocks.inspect.mockResolvedValue({ ...inspection, mode: 'Structure' })
    mocks.preview.mockResolvedValue({
      ...preview,
      rows: [
        row,
        { ...row, rowKey: 'r', kind: 'Rack', displayPath: 'R' },
        { ...row, rowKey: 's', kind: 'Slot', displayPath: 'S' },
        { ...row, rowKey: 'existing', action: 'Reference', canSelect: false },
        {
          ...row,
          rowKey: 'invalid',
          kind: 'Rack',
          action: 'Invalid',
          canSelect: false,
          issues: ['first', 'second'].map((message) => ({
            code: 'invalid',
            severity: 'Error',
            field: 'rackCode',
            message,
            source: row.source,
          })),
        },
      ],
      summary: { totalRows: 5, createRows: 3, referenceRows: 1, invalidRows: 1 },
    })
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload(3)
    const zones = within(screen.getByRole('group', { name: 'Thống kê khu vực' }))
    const racks = within(screen.getByRole('group', { name: 'Thống kê kệ' }))
    const slots = within(screen.getByRole('group', { name: 'Thống kê vị trí' }))
    expect(zones.getByText('Tổng 2 dòng')).toBeInTheDocument()
    expect(zones.getByText('Đã chọn 1/1 dòng hợp lệ')).toBeInTheDocument()
    expect(zones.getByText('Đã có').nextElementSibling).toHaveTextContent('1')
    expect(racks.getByText('Tổng 2 dòng')).toBeInTheDocument()
    expect(racks.getByText('Cần sửa').nextElementSibling).toHaveTextContent('1')
    expect(slots.getByText('Tổng 1 dòng')).toBeInTheDocument()
    expect(screen.queryByText(/^Đã chọn tạo/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn cả tệp' }))
    expect(zones.getByText('Đã chọn 0/1 dòng hợp lệ')).toBeInTheDocument()
    expect(racks.getByText('Đã chọn 0/1 dòng hợp lệ')).toBeInTheDocument()
    expect(slots.getByText('Đã chọn 0/1 dòng hợp lệ')).toBeInTheDocument()
    expect(screen.queryByText(/^Đã chọn tạo/)).not.toBeInTheDocument()
    expect(mocks.commit).not.toHaveBeenCalled()
  })
  it('shows only the applicable summary for a single-kind CSV', async () => {
    render(<WarehouseLocationImportPage warehouseId="w" />)
    await upload()
    expect(screen.getByRole('group', { name: 'Thống kê khu vực' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Thống kê kệ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Thống kê vị trí' })).not.toBeInTheDocument()
  })
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
      rows: [
        row,
        { ...row, rowKey: 'r', kind: 'Rack', displayPath: 'Z / R', requiredParentRowKeys: ['z'] },
      ],
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
