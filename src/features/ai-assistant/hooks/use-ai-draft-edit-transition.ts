import { useEffect, useRef, useState, type RefObject } from 'react'

interface FocusReturnInput {
  readonly isEditing: boolean
  /** Chỉnh sửa is shown and can take focus. */
  readonly canFocusEdit: boolean
  /** Nothing is in flight any more, so an unavailable Chỉnh sửa will stay so. */
  readonly isSettled: boolean
  readonly editButtonRef: RefObject<HTMLButtonElement | null>
  readonly sectionRef: RefObject<HTMLElement | null>
}

/**
 * Closing the editor puts keyboard focus back on the button that opened it. A save closes the editor
 * while the card is still validating, when that button is disabled: focus waits for it, and goes to
 * the card itself only when the button will not come back. Focus the user moved elsewhere is left alone.
 */
export function useAiDraftFocusReturn({
  isEditing,
  canFocusEdit,
  isSettled,
  editButtonRef,
  sectionRef,
}: FocusReturnInput) {
  const wasEditing = useRef(false)
  const isPending = useRef(false)

  useEffect(() => {
    if (wasEditing.current && !isEditing) isPending.current = true
    wasEditing.current = isEditing
    if (!isPending.current || isEditing) return

    const active = document.activeElement
    if (active && active !== document.body && !sectionRef.current?.contains(active)) {
      isPending.current = false
      return
    }
    if (canFocusEdit && editButtonRef.current) {
      editButtonRef.current.focus()
      isPending.current = false
    } else if (isSettled) {
      sectionRef.current?.focus()
      isPending.current = false
    }
  }, [isEditing, canFocusEdit, isSettled, editButtonRef, sectionRef])
}

/**
 * Open/closed state of a draft card's editor, and what keeps the swap calm: the card keeps its height
 * while the editor loads, and shrinks back with the card's motion token instead of snapping.
 */
export function useAiDraftEditTransition() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [reservedHeight, setReservedHeight] = useState(0)
  // Only the shrink animates; pinning the height at the moment of the swap must not.
  const [isReleasing, setIsReleasing] = useState(false)

  const swapTo = (nextIsEditing: boolean) => {
    setReservedHeight(bodyRef.current?.offsetHeight ?? 0)
    setIsReleasing(false)
    setIsEditing(nextIsEditing)
  }

  useEffect(() => {
    if (isEditing || reservedHeight === 0) return
    // Two frames: the pinned height must be painted before it is released, or there is nothing to animate from.
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsReleasing(true)
        setReservedHeight(0)
      })
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [isEditing, reservedHeight])

  return {
    isEditing,
    openEditor: () => swapTo(true),
    closeEditor: () => swapTo(false),
    bodyRef,
    sectionRef,
    editButtonRef,
    bodyStyle: { minHeight: reservedHeight },
    isReleasing,
  }
}
