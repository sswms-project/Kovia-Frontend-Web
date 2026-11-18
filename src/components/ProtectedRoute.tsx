'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { loginUrlFor } from '@/features/auth/utils/auth-return-url'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { AppRouteSkeleton } from './AppRouteSkeleton'

function subscribeToHydration(onStoreChange: () => void) {
  if (useAuthStore.persist.hasHydrated()) return () => undefined
  return useAuthStore.persist.onFinishHydration(onStoreChange)
}

function getHydrationSnapshot() {
  return useAuthStore.persist.hasHydrated()
}

function getServerHydrationSnapshot() {
  return false
}

export function ProtectedRoute({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const signedOut = useAuthStore((state) => state.signedOut)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot
  )

  useEffect(() => {
    if (hasHydrated && !user) {
      clearAuth()
      // An explicit sign-out must not hand the next account (often another role) the page the last one left.
      router.replace(
        signedOut
          ? APP_ROUTES.auth.login
          : loginUrlFor(window.location.pathname + window.location.search)
      )
    }
  }, [clearAuth, hasHydrated, signedOut, user, router])

  if (!hasHydrated) {
    return <AppRouteSkeleton />
  }

  if (!user) return null
  return <>{children}</>
}
