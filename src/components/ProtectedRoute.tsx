'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { loginUrlFor } from '@/features/auth/utils/auth-return-url'
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
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot
  )

  useEffect(() => {
    if (hasHydrated && !user) {
      clearAuth()
      router.replace(loginUrlFor(window.location.pathname + window.location.search))
    }
  }, [clearAuth, hasHydrated, user, router])

  if (!hasHydrated) {
    return <AppRouteSkeleton />
  }

  if (!user) return null
  return <>{children}</>
}
