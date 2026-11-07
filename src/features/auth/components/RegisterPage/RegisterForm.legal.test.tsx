import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LegalRegistration } from '@/features/legal-documents/types/legal-documents.types'
import { legalDocumentsService } from '@/features/legal-documents/services/legal-documents.service'
import { RegisterForm } from './RegisterForm'

describe('đăng ký với phiên bản điều khoản', () => {
  it('yêu cầu tích lại khi văn bản đổi và giữ phần thông tin đã nhập', async () => {
    const client = new QueryClient()
    const terms = {
      id: 'terms-1',
      kind: 'Terms',
      status: 'Current',
      version: 1,
      revision: 'revision',
      title: 'Điều khoản sử dụng',
      summary: '',
      publishedAt: null,
      updatedAt: '2026-11-07T00:00:00Z',
      updatedBy: null,
    } as const
    const legal: LegalRegistration = {
      requireVersion: true,
      terms,
      privacy: { ...terms, id: 'privacy-1', kind: 'Privacy', title: 'Chính sách dữ liệu' },
    }
    client.setQueryData(['legal-documents', 'detail', false, terms.id], {
      document: terms,
      content: 'Điều khoản',
    })
    client.setQueryData(['legal-documents', 'detail', false, legal.privacy?.id], {
      document: legal.privacy,
      content: 'Chính sách',
    })
    const read = vi.spyOn(legalDocumentsService, 'detail').mockImplementation(async (id) => ({
      document:
        id === 'terms-2'
          ? { ...terms, id, version: 2 }
          : id === 'privacy-1' && legal.privacy
            ? legal.privacy
            : terms,
      content: 'Nội dung kiểm thử',
    }))
    const form = (documents: LegalRegistration) => (
      <QueryClientProvider client={client}>
        <RegisterForm
          onSubmit={vi.fn()}
          legal={documents}
          legalUnavailable={false}
          onRetryLegal={vi.fn()}
          isLoading={false}
          selectedBillingCycle="Monthly"
          isPlanLoading={false}
        />
      </QueryClientProvider>
    )
    const { rerender } = render(form(legal))
    const name = screen.getByRole('textbox', { name: /Tên doanh nghiệp/ })
    fireEvent.change(name, { target: { value: 'Kho Hà Nội' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý/ }))
    expect(screen.getByRole('checkbox', { name: /Tôi đồng ý/ })).toBeChecked()
    rerender(form({ ...legal, terms: { ...terms, id: 'terms-2', version: 2 } }))
    expect(screen.getByRole('checkbox', { name: /phiên bản 2/ })).not.toBeChecked()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /phiên bản 2/ })).toBeEnabled())
    expect(name).toHaveValue('Kho Hà Nội')
    read.mockRestore()
  })

  it('giữ dữ liệu và khóa xác nhận đến khi nội dung lỗi được tải lại', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const terms = {
      id: 'terms',
      kind: 'Terms',
      status: 'Current',
      version: 1,
      revision: 'r',
      title: 'Điều khoản sử dụng',
      summary: '',
      publishedAt: null,
      updatedAt: '2026-11-07T00:00:00Z',
      updatedBy: null,
    } as const
    const privacy = {
      ...terms,
      id: 'privacy',
      kind: 'Privacy' as const,
      title: 'Chính sách dữ liệu',
    }
    let available = false
    const read = vi.spyOn(legalDocumentsService, 'detail').mockImplementation(async (id) => {
      if (!available && id === terms.id) throw new Error('503')
      return { document: id === terms.id ? terms : privacy, content: 'Nội dung đã tải' }
    })
    render(
      <QueryClientProvider client={client}>
        <RegisterForm
          onSubmit={vi.fn()}
          legal={{ requireVersion: true, terms, privacy }}
          legalUnavailable={false}
          onRetryLegal={vi.fn()}
          isLoading={false}
          selectedBillingCycle="Monthly"
          isPlanLoading={false}
        />
      </QueryClientProvider>
    )
    const name = screen.getByRole('textbox', { name: /Tên doanh nghiệp/ })
    fireEvent.change(name, { target: { value: 'Kho đang đăng ký' } })
    const retry = await screen.findByRole('button', { name: 'Thử lại' })
    expect(screen.getByRole('checkbox', { name: /Tôi đồng ý/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled()
    available = true
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Tôi đồng ý/ })).toBeEnabled())
    expect(name).toHaveValue('Kho đang đăng ký')
    read.mockRestore()
  })
})
