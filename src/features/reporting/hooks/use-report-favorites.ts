import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth.store'

const changedEvent = 'kovia-report-favorites'
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(changedEvent, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(changedEvent, callback)
  }
}
export function useReportFavorites() {
  const user = useAuthStore((state) => state.user)
  const key = `kovia:reports:favorites:${user?.tenantId ?? ''}:${user?.id ?? ''}`
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? '[]'
      } catch {
        return '[]'
      }
    },
    () => '[]'
  )
  let favorites: string[] = []
  try {
    const parsed = z.array(z.string()).safeParse(JSON.parse(raw) as unknown)
    if (parsed.success) favorites = parsed.data
  } catch {
    /* Invalid storage starts empty. */
  }
  function toggle(type: string) {
    if (!user?.tenantId) return
    try {
      localStorage.setItem(
        key,
        JSON.stringify(
          favorites.includes(type)
            ? favorites.filter((value) => value !== type)
            : [...favorites, type]
        )
      )
      window.dispatchEvent(new Event(changedEvent))
    } catch (error) {
      logger.warn('Không lưu được báo cáo yêu thích', error)
      toast.error('Không thể lưu yêu thích trên trình duyệt này.')
    }
  }
  return { favorites, toggle }
}
