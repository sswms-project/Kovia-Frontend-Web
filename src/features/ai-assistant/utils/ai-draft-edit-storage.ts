import { logger } from '@/lib/logger'
import { aiDraftEditStoredSchema, type AiDraftEditStored } from '../schemas/ai-draft-edit.schema'

const STORAGE_KEY_PREFIX = 'kovia.ai-draft-edit.'

// sessionStorage can be missing or throw (private window, blocked site data): the editor then works
// without remembered values.

export function clearAiDraftEditValues(draftId: string): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + draftId)
  } catch (error) {
    logger.warn(`Không xóa được thay đổi chưa lưu của bản nháp: ${String(error)}`)
  }
}

/** Only values edited from `revision` come back; any other revision means the draft moved on, so they are dropped. */
export function loadAiDraftEditValues(draftId: string, revision: string): AiDraftEditStored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + draftId)
    if (!raw) return null
    const result = aiDraftEditStoredSchema.safeParse(JSON.parse(raw))
    if (result.success && result.data.revision === revision) return result.data
    clearAiDraftEditValues(draftId)
    return null
  } catch (error) {
    logger.warn(`Không đọc được thay đổi chưa lưu của bản nháp: ${String(error)}`)
    return null
  }
}

export function saveAiDraftEditValues(draftId: string, stored: AiDraftEditStored): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + draftId, JSON.stringify(stored))
  } catch (error) {
    logger.warn(`Không lưu được thay đổi chưa lưu của bản nháp: ${String(error)}`)
  }
}
