import { AI_DRAFT_STATUSES, type AiDraftStatus } from '../types/ai-assistant.types'
import { AI_DRAFT_VIEW_STATES, type AiDraftViewState } from '../types/ai-draft-edit.types'

export interface AiDraftViewInput {
  /** Server status of the draft. */
  readonly status: AiDraftStatus
  readonly expiresAt: string | null | undefined
  readonly nowMs: number
  readonly isEditing: boolean
  /** The update (PUT) is in flight. */
  readonly isValidating: boolean
  readonly isConfirming: boolean
  /** A 409 revision mismatch was reported and not yet reloaded. */
  readonly hasConflict: boolean
  /** An edit was saved for the revision the card shows. */
  readonly hasSavedEdit: boolean
}

function hasElapsed(expiresAt: string | null | undefined, nowMs: number): boolean {
  const expiresMs = expiresAt ? Date.parse(expiresAt) : Number.NaN
  return !Number.isNaN(expiresMs) && expiresMs <= nowMs
}

/**
 * One place that decides what a draft card is. Order matters: a settled server status wins over
 * local activity, a request in flight over a stale conflict, and an editor that is open is never
 * closed by the clock alone (a late Save is answered by the BE with DRAFT_EXPIRED instead).
 */
export function getAiDraftViewState(input: AiDraftViewInput): AiDraftViewState {
  if (input.status === AI_DRAFT_STATUSES.executed) return AI_DRAFT_VIEW_STATES.CONFIRMED
  if (input.status === AI_DRAFT_STATUSES.cancelled) return AI_DRAFT_VIEW_STATES.CANCELLED
  if (input.status === AI_DRAFT_STATUSES.expired) return AI_DRAFT_VIEW_STATES.EXPIRED
  if (input.isConfirming) return AI_DRAFT_VIEW_STATES.CONFIRMING
  if (input.hasConflict) return AI_DRAFT_VIEW_STATES.CONFLICT
  if (input.isValidating) return AI_DRAFT_VIEW_STATES.VALIDATING
  if (input.isEditing) return AI_DRAFT_VIEW_STATES.EDITING
  if (hasElapsed(input.expiresAt, input.nowMs)) return AI_DRAFT_VIEW_STATES.EXPIRED
  return input.hasSavedEdit ? AI_DRAFT_VIEW_STATES.READY_TO_CONFIRM : AI_DRAFT_VIEW_STATES.PREVIEW
}

// Records keyed by every state: adding a state fails to compile until each map says what it means.

export const AI_DRAFT_VIEW_STATE_LABELS: Record<AiDraftViewState, string> = {
  PREVIEW: 'Chờ xác nhận',
  EDITING: 'Đang chỉnh sửa',
  VALIDATING: 'Đang kiểm tra',
  // The badge says only that the server accepted the saved content; the note under the card says what is next.
  READY_TO_CONFIRM: 'Bản nháp hợp lệ',
  CONFIRMING: 'Đang xác nhận',
  CONFIRMED: 'Đã thực hiện',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  CONFLICT: 'Có bản mới hơn',
}

export type AiDraftViewTone = 'pending' | 'active' | 'done' | 'inactive' | 'attention'

export const AI_DRAFT_VIEW_STATE_TONES: Record<AiDraftViewState, AiDraftViewTone> = {
  PREVIEW: 'pending',
  EDITING: 'active',
  VALIDATING: 'active',
  READY_TO_CONFIRM: 'pending',
  CONFIRMING: 'active',
  CONFIRMED: 'done',
  CANCELLED: 'inactive',
  EXPIRED: 'inactive',
  CONFLICT: 'attention',
}

/** Xác nhận is offered only while the card shows content the BE has validated and still holds. */
export const AI_DRAFT_VIEW_STATE_CAN_CONFIRM: Record<AiDraftViewState, boolean> = {
  PREVIEW: true,
  EDITING: false,
  VALIDATING: false,
  READY_TO_CONFIRM: true,
  CONFIRMING: false,
  CONFIRMED: false,
  CANCELLED: false,
  EXPIRED: false,
  CONFLICT: false,
}

/** Chỉnh sửa starts from content the BE holds as is: the same states that may be confirmed. */
export const AI_DRAFT_VIEW_STATE_CAN_EDIT: Record<AiDraftViewState, boolean> = {
  PREVIEW: true,
  EDITING: false,
  VALIDATING: false,
  READY_TO_CONFIRM: true,
  CONFIRMING: false,
  CONFIRMED: false,
  CANCELLED: false,
  EXPIRED: false,
  CONFLICT: false,
}

/** The card is still waiting for the user: it keeps its pending look and its actions. */
export function isAiDraftViewStateOpen(state: AiDraftViewState): boolean {
  return (
    state !== AI_DRAFT_VIEW_STATES.CONFIRMED &&
    state !== AI_DRAFT_VIEW_STATES.CANCELLED &&
    state !== AI_DRAFT_VIEW_STATES.EXPIRED
  )
}
