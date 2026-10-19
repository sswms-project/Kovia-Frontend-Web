import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { inventoryExportService } from '../services/inventory-export.service'
import { downloadInventoryExport } from '../utils/inventory-export'
import { useInventoryExport } from './use-inventory-export'

vi.mock('../services/inventory-export.service', () => ({
  inventoryExportService: { exportExcel: vi.fn() },
}))
vi.mock('../utils/inventory-export', () => ({ downloadInventoryExport: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api-error', () => ({
  getApiErrorMessage: () => 'Không thể xuất',
  logApiError: vi.fn(),
}))

const user = {
  id: 'user-1',
  tenantId: 'tenant-1',
  fullName: 'Kiểm thử',
  email: 'test@example.test',
  role: 'Tenant Owner',
  isActive: true,
} as const
const file = { blob: new Blob(['test']), fileName: 'kovia.xlsx' }
function wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
function deferredFile() {
  let resolve!: (value: typeof file) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<typeof file>((resolveValue, rejectValue) => {
    resolve = resolveValue
    reject = rejectValue
  })
  vi.mocked(inventoryExportService.exportExcel).mockReturnValueOnce(promise)
  return { resolve, reject }
}
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user })
})
afterEach(() => useAuthStore.setState({ user: null }))

describe('useInventoryExport', () => {
  it('captures filters, prevents duplicate requests and downloads the completed file', async () => {
    const pending = deferredFile()
    const { result } = renderHook(() => useInventoryExport(true), { wrapper })
    const filters = { searchTerm: 'SKU-001' }
    act(() => {
      result.current.mutate(filters)
      result.current.mutate(filters)
    })
    await waitFor(() => expect(inventoryExportService.exportExcel).toHaveBeenCalledOnce())
    expect(result.current.isPending).toBe(true)
    filters.searchTerm = 'changed'
    expect(vi.mocked(inventoryExportService.exportExcel).mock.calls[0]?.[0]).toEqual({
      searchTerm: 'SKU-001',
    })
    await act(async () => pending.resolve(file))
    await waitFor(() =>
      expect(downloadInventoryExport).toHaveBeenCalledExactlyOnceWith(file.blob, file.fileName)
    )
    expect(toast.success).toHaveBeenCalledOnce()
  })

  it.each(['logout', 'tenant', 'same-user-login', 'unmount', 'permission'] as const)(
    'discards old results on %s',
    async (change) => {
      const pending = deferredFile()
      const { result, unmount, rerender } = renderHook(
        ({ enabled }) => useInventoryExport(enabled),
        { wrapper, initialProps: { enabled: true } }
      )
      act(() => result.current.mutate({}))
      await waitFor(() => expect(inventoryExportService.exportExcel).toHaveBeenCalledOnce())
      const signal = vi.mocked(inventoryExportService.exportExcel).mock.calls[0]![1]
      act(() => {
        if (change === 'unmount') unmount()
        else if (change === 'permission') rerender({ enabled: false })
        else if (change === 'tenant')
          useAuthStore.setState({ user: { ...user, tenantId: 'tenant-2' } })
        else {
          useAuthStore.setState({ user: null })
          if (change === 'same-user-login') useAuthStore.setState({ user })
        }
      })
      expect(signal.aborted).toBe(true)
      await act(async () => pending.resolve(file))
      expect(downloadInventoryExport).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    }
  )

  it('surfaces API errors, clears pending and permits retry', async () => {
    vi.mocked(inventoryExportService.exportExcel)
      .mockRejectedValueOnce({ statusCode: 400, message: 'Vượt giới hạn' })
      .mockResolvedValueOnce(file)
    const { result } = renderHook(() => useInventoryExport(true), { wrapper })
    act(() => result.current.mutate({}))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledOnce()
    expect(downloadInventoryExport).not.toHaveBeenCalled()
    act(() => result.current.mutate({}))
    await waitFor(() => expect(downloadInventoryExport).toHaveBeenCalledOnce())
  })

  it('does not issue requests without capability or a session', async () => {
    const { result } = renderHook(() => useInventoryExport(false), { wrapper })
    act(() => result.current.mutate({}))
    expect(inventoryExportService.exportExcel).not.toHaveBeenCalled()
  })
})
