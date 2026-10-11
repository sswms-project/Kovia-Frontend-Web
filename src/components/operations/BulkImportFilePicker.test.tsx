import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BulkImportFilePicker } from './BulkImportFilePicker'

afterEach(cleanup)
const defaults = { entityLabel: 'hàng hóa', maxRows: 500, pending: false, error: null }
function dropZone() {
  return screen.getByRole('heading', { name: 'Chọn tệp hàng hóa' }).closest('[data-slot=card]')!
}

describe('shared file picker interactions', () => {
  it('accepts a dropped file without changing caller validation', () => {
    const onFileChange = vi.fn()
    render(<BulkImportFilePicker {...defaults} onFileChange={onFileChange} />)
    const file = new File(['x'], 'data.csv')
    fireEvent.drop(dropZone(), { dataTransfer: { files: [file], types: ['Files'] } })
    expect(onFileChange).toHaveBeenCalledWith(file)
  })
  it('rejects multiple dropped files instead of silently choosing the first', () => {
    const onFileChange = vi.fn()
    render(<BulkImportFilePicker {...defaults} onFileChange={onFileChange} />)
    fireEvent.drop(dropZone(), {
      dataTransfer: {
        files: [new File(['x'], 'a.csv'), new File(['y'], 'b.csv')],
        types: ['Files'],
      },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ chọn một tệp')
    expect(screen.getByLabelText('Tệp hàng hóa')).toHaveAccessibleDescription(/Chỉ chọn một tệp/)
    expect(onFileChange).not.toHaveBeenCalled()
  })
  it('does not allow dropping or choosing files while pending', () => {
    const onFileChange = vi.fn()
    render(<BulkImportFilePicker {...defaults} pending onFileChange={onFileChange} />)
    fireEvent.drop(dropZone(), {
      dataTransfer: { files: [new File(['x'], 'a.csv')], types: ['Files'] },
    })
    expect(onFileChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Đang tải và đọc tệp…' })).toBeDisabled()
  })
  it('retains the native picker and can choose the same file twice', async () => {
    const onFileChange = vi.fn()
    render(<BulkImportFilePicker {...defaults} onFileChange={onFileChange} />)
    const file = new File(['x'], 'data.xlsx')
    await userEvent.upload(screen.getByLabelText('Tệp hàng hóa'), file)
    await userEvent.upload(screen.getByLabelText('Tệp hàng hóa'), file)
    expect(onFileChange).toHaveBeenCalledTimes(2)
  })
})
