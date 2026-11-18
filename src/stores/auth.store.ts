import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/features/auth/types/auth.types'

interface AuthState {
  user: AuthUser | null
  /** True after the user chose "Đăng xuất": the next login must not resume the page they left (in memory only). */
  signedOut: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: (options?: { signedOut?: boolean }) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signedOut: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        document.cookie = `access_token=${accessToken}; path=/; SameSite=Strict`
        set({ user, signedOut: false })
      },
      clearAuth: (options) => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        document.cookie = 'access_token=; path=/; max-age=0'
        set(options?.signedOut ? { user: null, signedOut: true } : { user: null })
      },
    }),
    { name: 'auth', partialize: (state) => ({ user: state.user }) }
  )
)
