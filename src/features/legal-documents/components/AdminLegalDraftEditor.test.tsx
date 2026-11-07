import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Link from 'next/link'
import { describe, expect, it, vi } from 'vitest'
import { legalDocumentsService } from '../services/legal-documents.service'
import type { LegalDetail } from '../types/legal-documents.types'
import { AdminLegalDraftEditor } from './AdminLegalDraftEditor'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('nextjs-toploader', () => ({ useTopLoader: () => ({ start: vi.fn(), done: vi.fn() }) }))

const draft: LegalDetail = {
  document: {
    id: 'draft',
    kind: 'Terms',
    status: 'Draft',
    version: null,
    revision: 'revision-1',
    title: 'Điều khoản sử dụng',
    summary: 'Bản đầu',
    publishedAt: null,
    updatedAt: '2026-11-07T00:00:00Z',
    updatedBy: null,
  },
  content: 'Nội dung cũ',
}

function mount(reload = vi.fn().mockResolvedValue(draft)) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Link href="/admin/legal-documents">Liên kết đầu trang</Link>
      <AdminLegalDraftEditor
        detail={draft}
        canEdit
        canPublish
        loadCurrent={async () => null}
        reload={reload}
      />
    </QueryClientProvider>
  )
  return screen.getByRole('textbox', { name: 'Nội dung' })
}

describe('bảo vệ bản nháp điều khoản', () => {
  it('khóa nhập trong lúc lưu để lần tải lại không làm mất chữ vừa gõ', async () => {
    let finish = () => {}
    const update = vi.spyOn(legalDocumentsService, 'update').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({} as Awaited<ReturnType<typeof legalDocumentsService.update>>)
        })
    )
    const field = mount(
      vi.fn().mockResolvedValue({
        document: { ...draft.document, revision: 'revision-2' },
        content: 'Nội dung đã gửi',
      })
    )
    fireEvent.change(field, { target: { value: 'Nội dung đã gửi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(field).toHaveAttribute('readonly')
    await userEvent.type(field, ' Không ghi đè')
    expect(field).toHaveValue('Nội dung đã gửi')
    finish()
    await waitFor(() => expect(field).not.toHaveAttribute('readonly'))
    expect(field).toHaveValue('Nội dung đã gửi')
    update.mockRestore()
  })

  it('giữ nội dung khi người dùng hủy điều hướng bằng liên kết', async () => {
    const field = mount()
    fireEvent.change(field, { target: { value: 'Bản nháp đang soạn' } })
    fireEvent.click(screen.getByRole('link', { name: 'Liên kết đầu trang' }))
    expect(
      await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi chưa lưu?' })
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }))
    expect(field).toHaveValue('Bản nháp đang soạn')
  })
})
