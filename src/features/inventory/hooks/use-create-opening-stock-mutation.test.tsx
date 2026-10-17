import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { inventoryService } from '../services/inventory.service'
import { useCreateOpeningStockMutation } from './use-inventory'
import type { CreateOpeningStockRequest } from '../types/inventory.types'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('../services/inventory.service', () => ({
  inventoryService: { createOpeningStock: vi.fn() },
}))

const request: CreateOpeningStockRequest = {
  warehouseId: 'warehouse',
  evidenceIds: [],
  commandId: 'command',
  lines: [],
}

beforeEach(() => vi.clearAllMocks())

describe('opening-stock create API errors', () => {
  it.each([400, 500])(
    'keeps HTTP %s failure visible without retrying the write',
    async (statusCode) => {
      const error = { statusCode, message: 'Kệ A01 chưa cấu hình đơn vị sức chứa.' }
      vi.mocked(inventoryService.createOpeningStock).mockRejectedValue(error)
      const client = new QueryClient()
      const hook = renderHook(() => useCreateOpeningStockMutation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      })
      await act(async () => {
        await expect(hook.result.current.mutateAsync(request)).rejects.toEqual(error)
      })
      expect(inventoryService.createOpeningStock).toHaveBeenCalledTimes(1)
      if (statusCode === 400) {
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(error.message))
        expect(logger.error).not.toHaveBeenCalled()
      } else {
        expect(logger.error).toHaveBeenCalledWith(error)
      }
    }
  )
})
