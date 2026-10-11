import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Route } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpreadsheetImportInspection } from './spreadsheet-import.types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

const inspection: SpreadsheetImportInspection = {
  schemaVersion: 1,
  isCsv: false,
  csvDelimiter: null,
  fields: [
    {
      field: 'name',
      displayName: 'Tên',
      isRequired: true,
      aliases: [],
      description: 'Tên khách hàng',
    },
  ],
  sheets: [
    {
      sheetId: '1',
      sheetName: 'Dữ liệu',
      sampleRows: [],
      headerCandidates: [
        {
          rowNumber: 1,
          hasAllRequiredFields: true,
          suggestedMapping: [{ field: 'name', columnIndex: 0 }],
          columns: [{ columnIndex: 0, letter: 'A', header: 'Tên' }],
        },
      ],
    },
  ],
}
import {
  BulkImportPage,
  type BulkImportColumn,
  type BulkImportCommitOutcome,
  type BulkImportRow,
} from './BulkImportPage'

interface TestRow extends BulkImportRow {
  readonly name: string
  readonly contactName?: string
  readonly contactMobile?: string
}

const columns: readonly BulkImportColumn<TestRow>[] = [
  { key: 'name', header: 'Tên', render: (row) => row.name },
]

const previewRows: TestRow[] = [
  { rowNumber: 2, name: 'Khách hợp lệ A', errors: [] },
  { rowNumber: 3, name: 'Khách lỗi một', errors: ['Email không hợp lệ.'] },
  { rowNumber: 4, name: 'Khách hợp lệ B', errors: [] },
]

type ImportHandler = (rows: readonly TestRow[]) => Promise<BulkImportCommitOutcome>

function renderPage(
  overrides: {
    rows?: TestRow[]
    onImport?: ImportHandler
    inspection?: SpreadsheetImportInspection
    columns?: readonly BulkImportColumn<TestRow>[]
    onDownloadTemplate?: () => Promise<void>
    onInspect?: (
      file: File,
      delimiter: string
    ) => Promise<{ isSucceeded: true; inspection: SpreadsheetImportInspection }>
  } = {}
) {
  const onImport = vi.fn<ImportHandler>(
    overrides.onImport ?? (() => Promise.resolve({ isSucceeded: true }))
  )
  render(
    <BulkImportPage<TestRow>
      eyebrow="Danh mục"
      title="Nhập danh sách khách hàng"
      description="Mô tả"
      entityLabel="khách hàng"
      maxRows={500}
      backHref={'/stock-recipients' as Route}
      backLabel="Quay lại"
      listLabel="Xem danh sách khách hàng"
      resultFileName="ket-qua.csv"
      columns={overrides.columns ?? columns}
      getRowLabel={(row) => row.name}
      getRowSearchText={(row) => row.name}
      isPreviewing={false}
      isImporting={false}
      isDownloadingTemplate={false}
      onDownloadTemplate={overrides.onDownloadTemplate ?? (() => undefined)}
      onInspect={
        overrides.onInspect ??
        (() =>
          Promise.resolve({ isSucceeded: true, inspection: overrides.inspection ?? inspection }))
      }
      onPreview={() => Promise.resolve({ isSucceeded: true, rows: overrides.rows ?? previewRows })}
      onImport={onImport}
    />
  )
  return { onImport }
}

async function chooseFile() {
  const input = screen.getByLabelText(/Tệp khách hàng/)
  await userEvent.upload(input, new File(['x'], 'khach-hang.xlsx'))
  expect(await screen.findByRole('button', { name: 'Kiểm tra dữ liệu' })).toBeEnabled()
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' }))
}

async function confirmImport(buttonName: RegExp) {
  await userEvent.click(await screen.findByRole('button', { name: buttonName }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
}

describe('BulkImportPage', () => {
  it('uses natural preview height and retains row selection when changing page size', async () => {
    renderPage({
      rows: Array.from({ length: 25 }, (_, index) => ({
        rowNumber: index + 2,
        name: `Khách hàng ${index + 1}`,
        errors: [],
      })),
    })
    await chooseFile()
    const panel = screen.getByRole('region', { name: 'Bản xem trước nhập dữ liệu' })
    expect(panel).toHaveClass('flex-none', 'shrink-0')
    expect(panel).toHaveClass('[&>[data-slot=table-container]]:flex-none')
    expect(panel).toHaveClass('[&>[data-slot=table-container]]:overflow-x-auto')
    expect(panel).toHaveClass('[&>[data-slot=table-container]]:overflow-y-hidden')
    expect(panel.querySelectorAll('tbody tr')).toHaveLength(25)
    const scrollDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView'
    )
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    try {
      for (const pageSize of [10, 20]) {
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), {
          key: 'ArrowDown',
        })
        fireEvent.keyDown(await screen.findByRole('option', { name: String(pageSize) }), {
          key: 'Enter',
        })
        expect(panel.querySelectorAll('tbody tr')).toHaveLength(pageSize)
        expect(within(panel).getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeChecked()
        expect(screen.getByText(/đã chọn 25\/25 dòng hợp lệ/)).toBeVisible()
      }
    } finally {
      if (scrollDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor)
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
      }
    }
  })

  it('keeps results next to the source row and exposes multiple hidden-field errors', async () => {
    renderPage({
      rows: [
        { rowNumber: 2, name: 'Khách sai', errors: ['Thiếu email.', 'Liên hệ không hợp lệ.'] },
      ],
    })
    await chooseFile()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '',
      'Dòng',
      'Kết quả',
      'Tên',
    ])
    // Không cột nào đang hiển thị nhận hai lỗi này nên cả hai phải hiện đủ, không bị gấp lại.
    expect(screen.getByText('Thiếu email.')).toBeVisible()
    expect(screen.getByText('Liên hệ không hợp lệ.')).toBeVisible()
    expect(screen.queryByText(/Xem chi tiết/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeDisabled()
  })
  it('rereads CSV with the newly selected delimiter at the mapping step', async () => {
    const onInspect = vi.fn(async () => ({
      isSucceeded: true as const,
      inspection: { ...inspection, isCsv: true },
    }))
    renderPage({ onInspect })
    const file = new File(['Tên;Email'], 'data.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByLabelText('Tệp khách hàng'), file)
    await userEvent.selectOptions(await screen.findByLabelText('Dấu phân cách CSV'), ';')
    await waitFor(() => expect(onInspect).toHaveBeenLastCalledWith(file, ';'))
    expect(onInspect).toHaveBeenCalledTimes(2)
  })

  it('blocks repeated templates and conflicting upload before pending props update', async () => {
    let finish!: () => void
    const onDownloadTemplate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const onInspect = vi.fn(async () => ({ isSucceeded: true as const, inspection }))
    renderPage({ onDownloadTemplate, onInspect })
    const button = screen.getByRole('button', { name: 'Mẫu XLSX' })
    fireEvent.click(button)
    fireEvent.click(button)
    await userEvent.upload(screen.getByLabelText('Tệp khách hàng'), new File(['x'], 'data.xlsx'))
    expect(onDownloadTemplate).toHaveBeenCalledTimes(1)
    expect(onInspect).not.toHaveBeenCalled()
    await act(async () => finish())
  })

  const supplementaryColumns: readonly BulkImportColumn<TestRow>[] = [
    ...columns,
    {
      key: 'contactName',
      header: 'Người liên hệ',
      isSupplementary: true,
      render: (row) => row.contactName ?? '—',
    },
    {
      key: 'contactMobile',
      header: 'Điện thoại người liên hệ',
      isSupplementary: true,
      render: (row) => row.contactMobile ?? '—',
    },
  ]

  it('toggles the entire supplementary column group without changing selections or import data', async () => {
    const row: TestRow = {
      rowNumber: 2,
      name: 'Khách có liên hệ',
      contactName: 'Nguyễn An',
      contactMobile: '0901234567',
      errors: [],
    }
    const { onImport } = renderPage({ columns: supplementaryColumns, rows: [row] })
    await chooseFile()
    const toggle = screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('table')).toHaveAttribute('id', toggle.getAttribute('aria-controls'))
    expect(screen.queryByRole('columnheader', { name: 'Người liên hệ' })).not.toBeInTheDocument()
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tên' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Kết quả' })).toBeVisible()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Thu gọn thông tin bổ sung')
    expect(screen.getByRole('columnheader', { name: 'Người liên hệ' })).toBeVisible()
    expect(screen.getByText('Nguyễn An')).toBeVisible()
    expect(screen.getByText('0901234567')).toBeVisible()
    await userEvent.click(toggle)
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 2' })).toBeChecked()
    await confirmImport(/Nhập 1 khách hàng/)
    await waitFor(() => expect(onImport).toHaveBeenCalledWith([row]))
  })

  it('keeps hidden field errors visible in the result and counts errors outside the current page and filter', async () => {
    const validRows = Array.from({ length: 50 }, (_, index) => ({
      rowNumber: index + 2,
      name: `Khách hợp lệ ${index}`,
      errors: [],
    }))
    renderPage({
      columns: supplementaryColumns,
      rows: [
        ...validRows,
        {
          rowNumber: 52,
          name: 'Khách liên hệ sai',
          contactName: 'An',
          contactMobile: 'sai',
          errors: ['Liên hệ không hợp lệ.'],
          fieldErrors: {
            contactName: ['Liên hệ không hợp lệ.'],
            contactMobile: ['Liên hệ không hợp lệ.'],
          },
        },
      ],
    })
    await chooseFile()
    const toggle = screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung · 1 lỗi' })
    expect(screen.queryByText('Khách liên hệ sai')).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Lọc trạng thái'), 'Invalid')
    expect(screen.getByText('Khách liên hệ sai')).toBeVisible()
    expect(screen.getByText('Liên hệ không hợp lệ.')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 52' })).toBeDisabled()
    await userEvent.click(toggle)
    const contactCell = screen.getByText('sai').closest('td')
    expect(contactCell).toHaveTextContent('Liên hệ không hợp lệ.')
    await userEvent.selectOptions(screen.getByLabelText('Lọc trạng thái'), 'Valid')
    expect(toggle).toHaveTextContent('1 lỗi')
  })

  it('updates the empty table colspan for grouped columns and resets disclosure for a new session', async () => {
    renderPage({ columns: supplementaryColumns })
    await chooseFile()
    await userEvent.type(screen.getByLabelText('Tìm trong bản xem trước'), 'Không tồn tại')
    const emptyCell = screen.getByText('Không có dòng nào phù hợp bộ lọc.')
    expect(emptyCell).toHaveAttribute('colspan', '4')
    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung' }))
    expect(emptyCell).toHaveAttribute('colspan', '6')
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên nhập' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    await chooseFile()
    expect(screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('does not show a disclosure control when no column belongs to the supplementary group', async () => {
    renderPage()
    await chooseFile()
    expect(screen.queryByRole('button', { name: /thông tin bổ sung/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tên' })).toBeVisible()
  })

  it('shows field errors in the corresponding data cell and keeps old preview responses compatible', async () => {
    renderPage({
      rows: [
        {
          rowNumber: 2,
          name: 'Dữ liệu lỗi',
          errors: ['Tên không hợp lệ.'],
          fieldErrors: { name: ['Tên không hợp lệ.'] },
        },
      ],
    })
    await chooseFile()
    const cell = screen.getByText('Dữ liệu lỗi').closest('td')
    expect(cell).not.toBeNull()
    expect(cell).toHaveTextContent('Tên không hợp lệ.')
    expect(await screen.findByRole('checkbox', { name: 'Chọn dòng 2' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toBeVisible()
  })
  it('shows samples below the manually selected late header', async () => {
    renderPage({
      inspection: {
        ...inspection,
        sheets: [
          {
            ...inspection.sheets[0]!,
            sampleRows: [{ rowNumber: 1, values: { 0: 'Instructions' } }],
            mappingRows: [{ rowNumber: 9, values: { 0: 'Customer after header' } }],
            headerCandidates: [{ ...inspection.sheets[0]!.headerCandidates[0]!, rowNumber: 8 }],
          },
        ],
      },
    })
    await userEvent.upload(
      screen.getByLabelText(/Tệp khách hàng/),
      new File(['x'], 'customers.xlsx')
    )
    expect((await screen.findAllByText('Customer after header'))[0]).toBeVisible()
    expect(screen.getByLabelText('Dòng tiêu đề')).toHaveValue('8')
    expect(screen.queryByText('Instructions')).not.toBeInTheDocument()
    expect(screen.getByText('Ví dụ trong tệp')).toBeVisible()
    expect(screen.queryByText('Xem đầy đủ')).not.toBeInTheDocument()
  })
  it('distinguishes selecting a visible page from selecting the whole file', async () => {
    renderPage({
      rows: Array.from({ length: 100 }, (_, index) => ({
        rowNumber: index + 2,
        name: `Customer ${index}`,
        errors: [],
      })),
    })
    await chooseFile()
    const checkbox = await screen.findByRole('checkbox', {
      name: 'Chọn tất cả dòng hợp lệ trên trang này',
    })
    await userEvent.click(checkbox)
    expect(screen.getByText(/đã chọn 50\/100 dòng hợp lệ/)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Chọn toàn bộ 100 dòng hợp lệ của tệp' })
    )
    expect(screen.getByText(/đã chọn 100\/100 dòng hợp lệ/)).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn toàn bộ tệp' }))
    expect(screen.getByText(/đã chọn 0\/100 dòng hợp lệ/)).toBeInTheDocument()
  })
  it('keeps accessible descriptions linked when a field key contains Vietnamese and spaces', async () => {
    const field = 'Tên khách hàng'
    renderPage({
      inspection: {
        ...inspection,
        fields: [{ ...inspection.fields[0]!, field }],
        sheets: inspection.sheets.map((sheet) => ({
          ...sheet,
          headerCandidates: sheet.headerCandidates.map((header) => ({
            ...header,
            suggestedMapping: [{ field, columnIndex: 0 }],
          })),
        })),
      },
    })
    await userEvent.upload(screen.getByLabelText(/Tệp khách hàng/), new File(['a'], 'a.csv'))
    const select = await screen.findByRole('combobox', { name: 'Tên *' })
    expect(select.id).not.toMatch(/\s/)
    expect(select).toHaveAccessibleDescription('Tên khách hàng')
  })

  it('requires explicit confirmation before discarding unmapped columns', async () => {
    renderPage({
      inspection: {
        ...inspection,
        sheets: inspection.sheets.map((sheet) => ({
          ...sheet,
          headerCandidates: sheet.headerCandidates.map((header) => ({
            ...header,
            columns: [
              ...header.columns,
              { columnIndex: 1, letter: 'B', header: 'Ghi chú ngoài phạm vi' },
            ],
          })),
        })),
      },
    })
    await chooseFile()
    expect(await screen.findByRole('button', { name: /Nhập 2 khách hàng/ })).toBeDisabled()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Tôi đồng ý bỏ qua các trang tính/cột trên.' })
    )
    expect(screen.getByRole('button', { name: /Nhập 2 khách hàng/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại ghép cột' }))
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra dữ liệu' }))
    expect(await screen.findByRole('button', { name: /Nhập 2 khách hàng/ })).toBeEnabled()
  })

  it('keeps the select-all checkbox in the mixed state for a partial selection', async () => {
    renderPage()
    await chooseFile()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn dòng 4' }))
    expect(
      screen.getByRole('checkbox', { name: 'Chọn tất cả dòng hợp lệ trên trang này' })
    ).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Chọn tất cả dòng hợp lệ trên trang này' })
    )
    expect(screen.getByRole('button', { name: /Nhập 2 khách hàng/ })).toBeEnabled()
  })

  it('summarises the preview and preselects every valid row', async () => {
    renderPage()
    await chooseFile()

    expect(await screen.findByText('Bản xem trước')).toBeInTheDocument()
    expect(screen.getByText(/đã chọn 2\/2 dòng hợp lệ/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn dòng 3' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Nhập 2 khách hàng/ })).toBeEnabled()
  })

  it('imports only the selected valid rows and reports skipped ones', async () => {
    const { onImport } = renderPage()
    await chooseFile()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn dòng 4' }))
    await confirmImport(/Nhập 1 khách hàng/)

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
    expect(onImport.mock.calls[0]?.[0]).toEqual([previewRows[0]])
    expect(await screen.findByText('Đã hoàn tất nhập khách hàng')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đã nhập 1 khách hàng; bỏ qua 2 dòng.')
    const table = screen.getByRole('table')
    expect(within(table).getByText('Bỏ qua: Email không hợp lệ.')).toBeInTheDocument()
    expect(within(table).getByText('Bỏ qua: không được chọn')).toBeInTheDocument()
  })

  it('filters the preview by status', async () => {
    renderPage()
    await chooseFile()

    await userEvent.selectOptions(await screen.findByLabelText('Lọc trạng thái'), 'Invalid')

    expect(screen.getByText('Khách lỗi một')).toBeInTheDocument()
    expect(screen.queryByText('Khách hợp lệ A')).not.toBeInTheDocument()
  })

  it('disables importing when no row is valid', async () => {
    renderPage({ rows: [previewRows[1]!] })
    await chooseFile()

    expect(await screen.findByRole('button', { name: /Nhập 0 khách hàng/ })).toBeDisabled()
  })

  it('keeps the preview and shows the server message when the import fails', async () => {
    renderPage({
      onImport: () => Promise.resolve({ isSucceeded: false, message: 'Dòng 2: trùng mã.' }),
    })
    await chooseFile()

    await confirmImport(/Nhập 2 khách hàng/)

    expect(await screen.findByText('Dòng 2: trùng mã.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nhập 2 khách hàng/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại dữ liệu' }))
    expect(await screen.findByRole('button', { name: /Nhập 2 khách hàng/ })).toBeEnabled()
    expect(screen.getByText('Khách hợp lệ A')).toBeInTheDocument()
    expect(screen.queryByText('Đã hoàn tất nhập khách hàng')).not.toBeInTheDocument()
  })

  it('lets the user discard the preview and start over', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    renderPage()
    await chooseFile()

    await userEvent.click(await screen.findByRole('button', { name: 'Hủy phiên nhập' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bỏ các thay đổi chưa lưu?')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }))
    expect(screen.getByText('Khách hợp lệ A')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên nhập' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(await screen.findByText('Chọn tệp khách hàng')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('blocks another import when the previous save outcome is unknown', async () => {
    const { onImport } = renderPage({
      onImport: () =>
        Promise.resolve({
          isSucceeded: false,
          message: 'Mất kết nối.',
          requiresReconciliation: true,
        }),
    })
    await chooseFile()
    await confirmImport(/Nhập 2 khách hàng/)

    expect(await screen.findByText(/Chưa xác định kết quả lưu/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại dữ liệu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nhập 2 khách hàng/ })).toBeDisabled()
    expect(onImport).toHaveBeenCalledTimes(1)
  })
})
