import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { APP_ROUTES } from '@/routes/app-routes'

const CLOSE_DELAY_MS = 180

export function useLayoutCloseTransition(onClose?: () => void) {
  const router = useRouter()
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    []
  )

  function closeLayout() {
    if (isClosing) return
    setIsClosing(true)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimerRef.current = setTimeout(
      () => {
        if (onClose) onClose()
        else router.replace(APP_ROUTES.warehouseLayouts)
      },
      reduceMotion ? 0 : CLOSE_DELAY_MS
    )
  }

  return { isClosing, closeLayout }
}
