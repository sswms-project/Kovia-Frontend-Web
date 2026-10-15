import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { warehouseTaskService } from '../services/warehouse-task.service'
import { useManageMyWarehouseTaskMutation } from './use-warehouse-task'

vi.mock('../services/warehouse-task.service', () => ({ warehouseTaskService: { action: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())

describe('warehouse task mutation failures', () => {
  it.each([409, 404])(
    'reports %s as a rejection, refreshes task lists and does not retry the write',
    async (statusCode) => {
      const error = { statusCode, message: 'Công việc đã thay đổi. Hãy kiểm tra lại.' }
      vi.mocked(warehouseTaskService.action).mockRejectedValue(error)
      const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
      const unexpectedError = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
      const client = new QueryClient()
      const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
      const { result, unmount } = renderHook(useManageMyWarehouseTaskMutation, {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      })
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            taskType: 'TransferPutAway',
            taskId: 'task',
            action: 'Start',
          })
        ).rejects.toEqual(error)
      })
      expect(warning).toHaveBeenCalledWith(expect.stringContaining(error.message))
      expect(unexpectedError).not.toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['warehouse-tasks'] })
      expect(warehouseTaskService.action).toHaveBeenCalledOnce()
      unmount()
      client.clear()
      vi.mocked(warehouseTaskService.action).mockClear()
    }
  )

  it('keeps unexpected server failures visible at error level', async () => {
    const error = { statusCode: 500, message: 'Không thể lưu công việc.' }
    vi.mocked(warehouseTaskService.action).mockRejectedValue(error)
    const unexpectedError = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 1, retryDelay: 0 } } })
    const { result, unmount } = renderHook(useManageMyWarehouseTaskMutation, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await expect(
        result.current.mutateAsync({ taskType: 'TransferPutAway', taskId: 'task', action: 'Start' })
      ).rejects.toEqual(error)
    })
    expect(unexpectedError).toHaveBeenCalledWith(error)
    unmount()
    client.clear()
  })
})
