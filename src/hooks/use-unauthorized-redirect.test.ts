import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import { useUnauthorizedRedirect } from './use-unauthorized-redirect'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

describe('useUnauthorizedRedirect', () => {
  beforeEach(() => replace.mockReset())

  it('redirects once permissions are resolved and access is missing', () => {
    renderHook(() => useUnauthorizedRedirect(true, false))
    expect(replace).toHaveBeenCalledWith(APP_ROUTES.unauthorized)
  })

  it('waits while permissions are still loading', () => {
    renderHook(() => useUnauthorizedRedirect(false, false))
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not redirect when access is granted', () => {
    renderHook(() => useUnauthorizedRedirect(true, true))
    expect(replace).not.toHaveBeenCalled()
  })
})
