import { LogLevel } from '@microsoft/signalr'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { realtimeLogger } from './notification-realtime.service'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

afterEach(() => vi.clearAllMocks())

describe('realtimeLogger', () => {
  it('reports a dropped connection (auto-reconnect follows) as a warning, not an error', () => {
    realtimeLogger.log(
      LogLevel.Error,
      "Connection disconnected with error 'WebSocket closed 1006'."
    )
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('keeps critical failures as errors and ignores chatter below warning', () => {
    realtimeLogger.log(LogLevel.Critical, 'Hub unusable')
    realtimeLogger.log(LogLevel.Information, 'Connected')
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
