import { logger } from '@/lib/logger'
import { aiFormDraftSchema, type AiFormDraft } from '../schemas/ai-form-card.schema'

const STORAGE_KEY_PREFIX = 'kovia.ai-form.'

// sessionStorage can be missing or throw (private window, blocked site data): the form then works
// without a remembered draft.

export function loadAiFormDraft(flowId: string): AiFormDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + flowId)
    if (!raw) return null
    const result = aiFormDraftSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch (error) {
    logger.warn(`Không đọc được bản nháp biểu mẫu đã lưu: ${String(error)}`)
    return null
  }
}

export function saveAiFormDraft(flowId: string, draft: AiFormDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + flowId, JSON.stringify(draft))
  } catch (error) {
    logger.warn(`Không lưu được bản nháp biểu mẫu: ${String(error)}`)
  }
}
