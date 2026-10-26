import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReturnDocumentEditing } from './use-return-document-editing'

const state = vi.hoisted(() => ({ execute: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }))
vi.mock('@/services/return-document.service', () => ({
  returnDocumentService: { execute: state.execute },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
)

describe('return document editing intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.execute.mockResolvedValue({})
  })
  it('uses the version shown when confirmation opened, even after a background refresh', async () => {
    const document = { id: 'document', version: 'AQ==', allowedActions: ['Withdraw'] }
    const { result, rerender } = renderHook(
      ({ value }) => useReturnDocumentEditing('supplierReturns', value, '/supplier-returns?page=3'),
      { initialProps: { value: document }, wrapper }
    )
    act(() => result.current.open('Withdraw'))
    rerender({ value: { ...document, version: 'Ag==' } })
    await act(async () => result.current.dialog.onSubmit({ reason: 'Sửa số lượng' }))
    expect(state.execute).toHaveBeenCalledWith(
      'supplierReturns',
      'document',
      'Withdraw',
      expect.objectContaining({
        expectedVersion: 'AQ==',
        reason: 'Sửa số lượng',
        commandId: expect.any(String),
      })
    )
  })
  it('does not execute hidden actions or withdraw without a reason', async () => {
    const { result } = renderHook(
      () =>
        useReturnDocumentEditing(
          'goodsReturnRequests',
          { id: 'document', version: 'AQ==', allowedActions: ['Withdraw'] },
          '/goods-return-requests'
        ),
      { wrapper }
    )
    act(() => result.current.open('DeleteDraft'))
    expect(result.current.dialog.action).toBeNull()
    act(() => result.current.open('Withdraw'))
    await act(async () => result.current.dialog.onSubmit({ reason: '' }))
    expect(state.execute).not.toHaveBeenCalled()
    expect(result.current.dialog.form.formState.errors.reason).toBeDefined()
  })
  it('keeps a failed confirmation and returns to the filtered list only after deletion succeeds', async () => {
    state.execute.mockRejectedValueOnce(new Error('conflict'))
    const { result } = renderHook(
      () =>
        useReturnDocumentEditing(
          'goodsReturnRequests',
          { id: 'document', version: 'AQ==', allowedActions: ['DeleteDraft'] },
          '/goods-return-requests?page=4&status=Draft'
        ),
      { wrapper }
    )
    act(() => result.current.open('DeleteDraft'))
    await act(async () => result.current.dialog.onSubmit({ reason: '' }))
    expect(state.replace).not.toHaveBeenCalled()
    expect(result.current.dialog.action).toBe('DeleteDraft')
    await act(async () => result.current.dialog.onSubmit({ reason: '' }))
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith('/goods-return-requests?page=4&status=Draft')
    )
  })
})
