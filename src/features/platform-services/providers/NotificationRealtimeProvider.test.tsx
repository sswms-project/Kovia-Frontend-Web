import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationRealtimeProvider } from './NotificationRealtimeProvider'

const fixture = vi.hoisted(() => ({
  user: { id: 'fixture-user' },
  handlers: new Map<string, (payload: unknown) => void>(),
  start: vi.fn(),
  stop: vi.fn(),
  state: 'Disconnected',
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (select: (state: { user: { id: string } }) => unknown) =>
    select({ user: fixture.user }),
}))
vi.mock('@/lib/axios', () => ({ getStoredAccessToken: () => 'fixture-token' }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
const router = { push: vi.fn() }
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), warning: vi.fn() } }))
vi.mock('../services/notification-realtime.service', () => ({
  createNotificationHubConnection: () => ({
    get state() {
      return fixture.state
    },
    start: fixture.start,
    stop: fixture.stop,
    on: (name: string, callback: (payload: unknown) => void) =>
      fixture.handlers.set(name, callback),
    off: (name: string) => fixture.handlers.delete(name),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  }),
}))
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  fixture.state = 'Disconnected'
  fixture.handlers.clear()
  fixture.stop.mockResolvedValue(undefined)
  fixture.start.mockImplementation(async () => {
    fixture.state = 'Connected'
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
async function setup() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  const view = render(
    <QueryClientProvider client={client}>
      <NotificationRealtimeProvider>Child</NotificationRealtimeProvider>
    </QueryClientProvider>
  )
  await act(async () => {})
  return { view, invalidate }
}
describe('notification connection recovery', () => {
  it('can recover on returning to the browser after the retry budget was exhausted', async () => {
    fixture.start.mockRejectedValue(new Error('offline'))
    const { view } = await setup()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(18_000)
    })
    expect(fixture.start).toHaveBeenCalledTimes(4)
    fixture.start.mockImplementation(async () => {
      fixture.state = 'Connected'
    })
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(fixture.start).toHaveBeenCalledTimes(5)
    view.unmount()
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    expect(fixture.start).toHaveBeenCalledTimes(5)
  })
  it('refreshes notices on foreground recovery without starting a second connected hub', async () => {
    const { invalidate } = await setup()
    invalidate.mockClear()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(fixture.start).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith(
      { queryKey: ['notifications'] },
      { cancelRefetch: false }
    )
  })
  it('handles an inbound event by refreshing both notices and affected request data', async () => {
    const { invalidate } = await setup()
    invalidate.mockClear()
    await act(async () =>
      fixture.handlers.get('NotificationCreated')?.({
        notificationId: '10000000-0000-4000-8000-000000000001',
        type: 'InboundRequestUpdate',
        createdAt: '2026-10-23T03:39:00+00:00',
        referenceType: 'InboundRequest',
        referenceId: '10000000-0000-4000-c000-000000000002',
      })
    )
    expect(invalidate).toHaveBeenCalledWith(
      { queryKey: ['notifications'] },
      { cancelRefetch: false }
    )
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: expect.arrayContaining(['inbound-requests']),
    })
  })
})
