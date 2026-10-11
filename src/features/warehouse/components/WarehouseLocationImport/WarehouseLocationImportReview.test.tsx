import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import type { WarehouseLocationImportKind } from '../../schemas/warehouse-location-import.schema'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
} from '../../types/warehouse-location-import.types'
import { WarehouseLocationImportReview } from './WarehouseLocationImportReview'

const kinds: WarehouseLocationImportKind[] = ['Zone', 'Rack', 'Slot']
const preview: WarehouseLocationImportPreview = {
  schemaVersion: 1,
  warehouseId: 'w',
  warehouseCode: 'WH',
  warehouseName: 'Kho',
  fileName: 'locations.xlsx',
  previewFingerprint: 'hash',
  capabilities: { canImport: true, canViewLayout: true, canEditLayout: true },
  ignoredSheets: [],
  ignoredColumns: [],
  fileWarnings: [],
  summary: { totalRows: 75, createRows: 72, referenceRows: 3, invalidRows: 0 },
  rows: kinds.flatMap((kind) =>
    Array.from({ length: 25 }, (_, index) => ({
      kind,
      rowKey: `${kind}-${index}`,
      displayPath: `${kind}-${index}`,
      action: index === 0 ? ('Reference' as const) : ('Create' as const),
      canSelect: index > 0,
      values: {},
      sourceValues: {},
      fieldErrors: {},
      issues: [],
      requiredParentRowKeys: [],
      source: { sheetId: kind, sheetName: kind, rowNumber: index + 2 },
    }))
  ),
}
const inspection: WarehouseLocationImportInspection = {
  schemaVersion: 1,
  mode: 'Structure',
  isCsv: false,
  csvDelimiter: null,
  fieldsByKind: {},
  sheetsByKind: {},
}
function Review() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  return (
    <WarehouseLocationImportReview
      preview={preview}
      inspection={inspection}
      selected={selected}
      busy={false}
      onSelect={setSelected}
      onExport={vi.fn()}
    />
  )
}
const browserMethods = [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
  'scrollIntoView',
] as const
const originalBrowserMethods = browserMethods.map((method) =>
  Object.getOwnPropertyDescriptor(HTMLElement.prototype, method)
)
afterEach(() => {
  browserMethods.forEach((method, index) => {
    const original = originalBrowserMethods[index]
    if (original) Object.defineProperty(HTMLElement.prototype, method, original)
    else Reflect.deleteProperty(HTMLElement.prototype, method)
  })
})

it('restores each tab search, action, expansion, page and page size without losing global selection', async () => {
  for (const method of browserMethods) {
    Object.defineProperty(HTMLElement.prototype, method, {
      configurable: true,
      writable: true,
      value: vi.fn(() => false),
    })
  }
  const user = userEvent.setup()
  render(<Review />)
  await user.click(screen.getByRole('checkbox', { name: 'Chọn Zone-1, dòng 3' }))
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Kệ' }))
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Tìm mã, tên hoặc lỗi cấu trúc' }), 'Rack-1')
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Lọc hành động của dòng' }),
    'Create'
  )
  await user.click(screen.getByRole('button', { name: /Mở rộng thông tin bổ sung/ }))
  await user.click(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }))
  await user.click(screen.getByRole('option', { name: /^10$/ }))
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  await user.click(screen.getByRole('tab', { name: 'Vị trí' }))
  expect(screen.getByRole('textbox')).toHaveValue('')
  expect(screen.getByRole('combobox', { name: 'Lọc hành động của dòng' })).toHaveValue('all')
  expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveTextContent('20')
  await user.click(screen.getByRole('tab', { name: 'Kệ' }))
  expect(screen.getByRole('textbox')).toHaveValue('Rack-1')
  expect(screen.getByRole('combobox', { name: 'Lọc hành động của dòng' })).toHaveValue('Create')
  expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveTextContent('10')
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Thu gọn thông tin bổ sung/ })).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Khu vực' }))
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Trang đầu' }))
  expect(screen.getByRole('checkbox', { name: 'Chọn Zone-1, dòng 3' })).toBeChecked()
})

it('shows row counts and counts invalid rows rather than individual issues on each tab', async () => {
  const broken = preview.rows.map((row) =>
    row.rowKey === 'Rack-1'
      ? {
          ...row,
          action: 'Invalid' as const,
          canSelect: false,
          issues: ['Thiếu tên kệ', 'Thiếu kiểu quản lý'].map((message) => ({
            code: 'REQUIRED',
            severity: 'Error',
            field: 'rackName',
            message,
            source: row.source,
          })),
        }
      : row
  )
  const user = userEvent.setup()
  render(
    <WarehouseLocationImportReview
      preview={{ ...preview, rows: broken }}
      inspection={inspection}
      selected={new Set(['Zone-1', 'Slot-1'])}
      busy={false}
      onSelect={vi.fn()}
      onExport={vi.fn()}
    />
  )
  const rack = screen.getByRole('tab', { name: 'Kệ' })
  expect(within(rack).getByText('25 dòng')).toBeInTheDocument()
  expect(within(rack).getByText('1 cần sửa')).toBeInTheDocument()
  expect(screen.getByText('Đã chọn 1 dòng')).toBeInTheDocument()
  await user.click(rack)
  expect(screen.getByText('Đã chọn 0 dòng')).toBeInTheDocument()
  expect(screen.getByText('1 dòng cần sửa')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Kệ', selected: true })).toBeInTheDocument()
})

it('supports arrow-key tab navigation and displays actual imported counts in the result', async () => {
  const user = userEvent.setup()
  render(
    <WarehouseLocationImportReview
      preview={preview}
      inspection={inspection}
      selected={new Set(['Zone-1', 'Zone-2'])}
      imported={new Set(['Zone-1'])}
      busy={false}
      onSelect={vi.fn()}
      onExport={vi.fn()}
    />
  )
  expect(screen.getByText('Đã nhập 1 dòng')).toBeInTheDocument()
  screen.getByRole('tab', { name: 'Khu vực' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'Kệ', selected: true })).toHaveFocus()
  expect(screen.getByText('Đã nhập 0 dòng')).toBeInTheDocument()
  expect(
    screen.queryByText('Chọn cả tệp áp dụng cho cả khu vực, kệ và vị trí.')
  ).not.toBeInTheDocument()
})
