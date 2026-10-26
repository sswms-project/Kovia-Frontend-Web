'use client'

import { useCallback, useRef, useState } from 'react'

interface UseLayoutDesignerEditGateOptions {
  readonly canConfigure: boolean
  readonly operationsPending: boolean
}

export function useLayoutDesignerEditGate({
  canConfigure,
  operationsPending,
}: UseLayoutDesignerEditGateOptions) {
  const [gestureActive, setGestureActive] = useState(false)
  const gestureActiveRef = useRef(false)
  const handleGestureChange = useCallback((active: boolean) => {
    gestureActiveRef.current = active
    setGestureActive(active)
  }, [])
  const editLocked = !canConfigure || operationsPending
  const mutationBlocked = editLocked || gestureActive
  const canMutate = () => !editLocked && !gestureActiveRef.current

  return {
    gestureActive,
    gestureActiveRef,
    handleGestureChange,
    editLocked,
    mutationBlocked,
    canMutate,
  }
}
