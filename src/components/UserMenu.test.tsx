import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { USER_ROLES } from '@/config/roles'
import { APP_ROUTES } from '@/routes/app-routes'
import { UserMenu } from './UserMenu'

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: vi.fn() }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/features/auth', () => ({
  useLogoutMutation: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: { fullName: 'Tenant Owner', email: 'owner@example.test', role: USER_ROLES.TenantOwner },
      clearAuth: vi.fn(),
    }),
}))

afterEach(cleanup)

describe('account menu destinations', () => {
  it('keeps profile and security settings reachable from the avatar', async () => {
    const user = userEvent.setup()
    render(<UserMenu />)
    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản của Tenant Owner' }))
    expect(screen.getByRole('menuitem', { name: 'Hồ sơ cá nhân' })).toHaveAttribute(
      'href',
      APP_ROUTES.profile
    )
    expect(screen.getByRole('menuitem', { name: 'Cài đặt tài khoản' })).toHaveAttribute(
      'href',
      APP_ROUTES.settings.security
    )
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeEnabled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở menu tài khoản của Tenant Owner' })).toHaveFocus()
  })
})
