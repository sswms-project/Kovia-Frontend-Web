'use client'

import { useEffect, useRef, useState } from 'react'

/** Keep the complete original request until a lost acknowledgement has been reconciled. */
export function useReturnCommand<T>() {
  const pending = useRef<{ request: T } | null>(null)
  const lock = useRef(false)
  const [isPending, setPending] = useState(false)
  const [isUncertain, setUncertain] = useState(false)

  useEffect(() => {
    if (!isPending && !isUncertain) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isPending, isUncertain])

  async function run(build: () => T, send: (request: T) => Promise<unknown>) {
    if (lock.current) throw new Error('Thao tác đang được xử lý.')
    // Build/validate only a new intent. A retry must bypass current versions and form values.
    const previous = pending.current
    const request = previous?.request ?? structuredClone(build())
    lock.current = true
    setPending(true)
    try {
      await send(request)
      pending.current = null
      setUncertain(false)
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : undefined
      if (previous || typeof status !== 'number' || status >= 500 || status === 408) {
        pending.current = { request }
        setUncertain(true)
      }
      throw error
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  return { run, isPending, isUncertain, isLocked: isPending || isUncertain }
}
