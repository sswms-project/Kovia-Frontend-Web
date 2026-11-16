import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { warehouseTaskService } from '../services/warehouse-task.service'
import { useCancelWarehouseTaskMutation } from './use-warehouse-task'

vi.mock('../services/warehouse-task.service', () => ({ warehouseTaskService: { cancel: vi.fn() } }))
vi.mock('@/lib/api-error', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-error')>()),
  logApiError: vi.fn(),
}))

describe('useCancelWarehouseTaskMutation', () => {
  it.each([404, 409, 400])(
    'refreshes stale tasks for HTTP %s only when needed',
    async (statusCode) => {
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      const error = { statusCode, message: 'Công việc đã thay đổi.' }
      vi.mocked(warehouseTaskService.cancel).mockRejectedValueOnce(error)
      function Wrapper({ children }: PropsWithChildren) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>
      }
      const { result } = renderHook(() => useCancelWarehouseTaskMutation('task-1'), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await expect(
          result.current.mutateAsync({ reason: 'Đổi kế hoạch', expectedVersion: 'AQ==' })
        ).rejects.toEqual(error)
      })

      expect(warehouseTaskService.cancel).toHaveBeenLastCalledWith('task-1', {
        reason: 'Đổi kế hoạch',
        expectedVersion: 'AQ==',
      })
      if (statusCode === 400) expect(invalidate).not.toHaveBeenCalled()
      else expect(invalidate).toHaveBeenCalledWith({ queryKey: ['warehouse-tasks'] })
      client.clear()
    }
  )
})
