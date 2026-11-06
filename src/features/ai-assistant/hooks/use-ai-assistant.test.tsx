import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { aiAssistantService } from '../services/ai-assistant.service'
import { useSendAiChatMessageMutation } from './use-ai-assistant'

vi.mock('next/navigation', () => ({ usePathname: () => '/tasks' }))
vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('../services/ai-assistant.service', () => ({
  aiAssistantService: { sendMessage: vi.fn() },
}))

afterEach(() => vi.clearAllMocks())

describe('AI chat service errors', () => {
  it.each([429, 502])(
    'reports %s without confusing rate limits with unexpected errors',
    async (statusCode) => {
      const message =
        statusCode === 429
          ? 'Dịch vụ AI đang giới hạn lượt gọi.'
          : 'Trợ lý AI tạm thời không khả dụng.'
      vi.mocked(aiAssistantService.sendMessage).mockRejectedValueOnce({ statusCode, message })
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      function Wrapper({ children }: { readonly children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>
      }
      const { result, unmount } = renderHook(() => useSendAiChatMessageMutation(), {
        wrapper: Wrapper,
      })
      act(() => result.current.mutate({ conversationId: null, message: 'Tồn kho là bao nhiêu?' }))
      await waitFor(() => expect(result.current.isError).toBe(true))
      if (statusCode === 429) {
        expect(logger.warn).toHaveBeenCalledWith(`[429] ${message}`)
        expect(toast.warning).toHaveBeenCalledWith(message)
        expect(logger.error).not.toHaveBeenCalled()
        expect(toast.error).not.toHaveBeenCalled()
      } else {
        expect(logger.error).toHaveBeenCalledWith(`[502] ${message}`)
        expect(toast.error).toHaveBeenCalledWith(message)
        expect(toast.warning).not.toHaveBeenCalled()
      }
      expect(aiAssistantService.sendMessage).toHaveBeenCalledTimes(1)
      unmount()
      client.clear()
    }
  )
})
