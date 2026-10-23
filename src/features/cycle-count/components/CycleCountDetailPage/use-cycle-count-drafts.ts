import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { CycleCountDamageDraft } from './types'

interface CycleCountDraftState {
  readonly quantities: Record<string, string>
  readonly damaged: Record<string, string>
  readonly notes: Record<string, string>
  readonly damage: Record<string, CycleCountDamageDraft>
}

type DraftField = keyof CycleCountDraftState
type DraftAction<T> = Record<string, T> | ((current: Record<string, T>) => Record<string, T>)

const EMPTY_DRAFTS: CycleCountDraftState = { quantities: {}, damaged: {}, notes: {}, damage: {} }
const STORAGE_PREFIX = 'cycle-count-drafts:'

// Khoá theo phiếu, vòng đếm và người đếm: nháp của vòng trước hoặc của người khác trên cùng máy không bị áp nhầm.
export function getCycleCountDraftKey(cycleCountId: string, recountRound: number, userId: string) {
  return `${STORAGE_PREFIX}${cycleCountId}:${recountRound}:${userId}`
}

function readDrafts(storageKey: string | null): CycleCountDraftState {
  if (!storageKey) return EMPTY_DRAFTS
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw
      ? { ...EMPTY_DRAFTS, ...(JSON.parse(raw) as Partial<CycleCountDraftState>) }
      : EMPTY_DRAFTS
  } catch (error) {
    // Nháp hỏng chỉ là tiện ích phía máy; bỏ đi để nhân viên nhập lại thay vì chặn cả bảng.
    logger.error(error)
    window.localStorage.removeItem(storageKey)
    return EMPTY_DRAFTS
  }
}

function isEmpty(drafts: CycleCountDraftState) {
  return Object.values(drafts).every((field) => Object.keys(field).length === 0)
}

/**
 * Nháp số đếm của phiếu, lưu tạm trên máy để tải lại trang hay mất sóng không làm mất số đã nhập.
 * storageKey null khi phiếu không mở để ghi nhận: nháp chỉ nằm trong bộ nhớ.
 */
export function useCycleCountDrafts(storageKey: string | null) {
  const [state, setState] = useState(() => ({ key: storageKey, drafts: readDrafts(storageKey) }))
  const hasWarnedRef = useRef(false)
  let current = state
  if (state.key !== storageKey) {
    current = { key: storageKey, drafts: readDrafts(storageKey) }
    setState(current)
  }

  useEffect(() => {
    if (!state.key) return
    try {
      if (isEmpty(state.drafts)) window.localStorage.removeItem(state.key)
      else window.localStorage.setItem(state.key, JSON.stringify(state.drafts))
    } catch (error) {
      logger.error(error)
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true
        toast.error('Không thể lưu nháp trên thiết bị này. Hãy lưu kết quả thường xuyên.')
      }
    }
  }, [state])

  function setField<T>(field: DraftField) {
    return (action: DraftAction<T>) =>
      setState((previous) => {
        const value = previous.drafts[field] as Record<string, T>
        const next = typeof action === 'function' ? action(value) : action
        return { ...previous, drafts: { ...previous.drafts, [field]: next } }
      })
  }

  return {
    drafts: current.drafts.quantities,
    damagedDrafts: current.drafts.damaged,
    noteDrafts: current.drafts.notes,
    damageDrafts: current.drafts.damage,
    setDrafts: setField<string>('quantities'),
    setDamagedDrafts: setField<string>('damaged'),
    setNoteDrafts: setField<string>('notes'),
    setDamageDrafts: setField<CycleCountDamageDraft>('damage'),
    discardDrafts: () => setState((previous) => ({ ...previous, drafts: EMPTY_DRAFTS })),
  }
}
