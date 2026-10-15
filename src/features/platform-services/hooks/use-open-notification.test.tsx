import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NotificationItem } from '../types/platform-services.types'
import { useOpenNotification } from './use-open-notification'

const { push, invalidate, markRead } = vi.hoisted(() => ({
  push: vi.fn(),
  invalidate: vi.fn(),
  markRead: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/transfers/transfer',
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}))
vi.mock('./use-platform-services', () => ({
  useMarkNotificationReadMutation: () => ({ mutate: markRead }),
}))
afterEach(() => vi.clearAllMocks())

describe('opening transfer notifications', () => {
  it.each([
    ['ViewStockTransferPick', 'pick'],
    ['ViewStockTransferReceive', 'receive'],
    ['ViewStockTransferPutAway', 'putaway'],
  ])('refreshes an already open transfer and navigates to %s', (action, tab) => {
    const notification: NotificationItem = {
      id: 'notification',
      type: 'TaskAssigned',
      title: 'Công việc điều chuyển',
      message: '',
      isRead: true,
      referenceType: 'StockTransfer',
      referenceId: 'transfer',
      action,
      createdAt: '',
    }
    const { result } = renderHook(useOpenNotification)
    result.current.open(notification)
    expect(push).toHaveBeenCalledWith(`/transfers/transfer?tab=${tab}`)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['transfers'] })
    expect(markRead).not.toHaveBeenCalled()
  })
})
