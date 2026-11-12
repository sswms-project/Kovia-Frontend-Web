import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { USER_ROLES } from '@/config/roles'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { LoginSessionsPage } from './LoginSessionsPage'

vi.mock('../services/auth.service', () => ({
  authService: { listSessions: vi.fn(), revokeSession: vi.fn() },
}))

afterEach(() => {
  useAuthStore.getState().clearAuth()
  vi.resetAllMocks()
})

it('keeps both sessions on cancel and revokes only the confirmed remote session', async () => {
  const user = {
    id: 'fixture-user',
    tenantId: 'fixture-tenant',
    loginSessionId: 'current',
    fullName: 'Fixture Staff',
    email: 'staff@example.test',
    role: USER_ROLES.WarehouseStaff,
    isActive: true,
  } as const
  useAuthStore.setState({ user })
  const lastSeenAt = '2026-11-11T07:00:00Z'
  const current = { id: 'current', clientLabel: 'Chrome', isCurrent: true, lastSeenAt }
  const remote = { id: 'remote', clientLabel: 'Kovia Android', isCurrent: false, lastSeenAt }
  vi.mocked(authService.listSessions)
    .mockResolvedValueOnce([current, remote])
    .mockResolvedValue([current])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <LoginSessionsPage />
    </QueryClientProvider>
  )

  expect(await screen.findByText('2/2 phiên đang hoạt động')).toBeVisible()
  const revoke = screen.getByRole('button', { name: 'Đăng xuất thiết bị này' })
  fireEvent.click(revoke)
  const dialog = within(screen.getByRole('alertdialog'))
  expect(dialog.getByText('Kovia Android sẽ cần đăng nhập lại.')).toBeVisible()
  fireEvent.click(dialog.getByRole('button', { name: 'Quay lại' }))
  expect(authService.revokeSession).not.toHaveBeenCalled()
  expect(screen.getByText('Kovia Android')).toBeVisible()

  fireEvent.click(revoke)
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận đăng xuất' })
  )
  expect(await screen.findByText('1/2 phiên đang hoạt động')).toBeVisible()
  expect(authService.revokeSession).toHaveBeenCalledExactlyOnceWith('remote', expect.any(Object))
  expect(screen.queryByText('Kovia Android')).not.toBeInTheDocument()
  expect(screen.getByText('Phiên hiện tại')).toBeVisible()
  expect(useAuthStore.getState().user?.loginSessionId).toBe('current')
  unmount()
  client.clear()
})
