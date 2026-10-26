import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { UserProfileResponse } from '@/features/auth/types/auth.types'
import { ProfileView, ProfileViewSkeleton } from './ProfileView'

vi.mock('@/features/settings/components/SecurityPage', () => ({
  SectionIconBadge: () => null,
}))

it('wraps long contact values and keeps edit behavior in a container-responsive card', () => {
  const profile: UserProfileResponse = {
    id: 'profile',
    tenantId: null,
    fullName: 'Người dùng',
    email: 'long.email.address.for.responsive.testing@example.com',
    phone: null,
    role: null,
    status: 'Active',
    lastLoginAt: null,
    emailVerified: true,
    phoneVerified: false,
    isTwoFactorEnabled: false,
    permissions: [],
    assignedWarehouses: [],
  }
  const onEdit = vi.fn()
  const { container } = render(<ProfileView profile={profile} onEdit={onEdit} />)
  expect(container.firstElementChild).toHaveClass('@container', 'min-w-0')
  const email = screen.getByText(profile.email)
  expect(email).toHaveClass('min-w-0', 'wrap-anywhere')
  expect(email.parentElement).toHaveClass('flex-wrap')
  expect(screen.getByText('Đã xác thực')).toHaveClass('shrink-0')
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
  expect(onEdit).toHaveBeenCalledOnce()
})

it('uses the same container breakpoint while loading', () => {
  const { container } = render(<ProfileViewSkeleton />)
  expect(container.firstElementChild).toHaveClass('@container', 'min-w-0')
  expect(container.querySelector('[data-slot="card-content"]')).toHaveClass(
    '@min-[40rem]:grid-cols-2'
  )
})
