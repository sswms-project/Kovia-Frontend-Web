import { FileText, ListFilter, type LucideIcon } from 'lucide-react'
import { AI_NAVIGATION_TARGETS, type AiCard } from '../types/ai-assistant.types'
import { AI_NAVIGATION_ICONS, DefaultAiNavigationIcon } from './ai-assistant-icons'

export interface AiNavigationView {
  readonly label: string
  readonly description: string | null
  readonly icon: LucideIcon
  /** A single record: worth opening beside the conversation (new tab). */
  readonly isRecord: boolean
}

const RECORD_PREFIX = 'Xem chi tiết'
/** Titles that already name their action ("Mở phiếu…", "Cất hàng phiếu…") keep it instead of a second verb. */
const ACTION_TITLE = /^(Xem|Mở|Cất|Duyệt|Lập|Tạo)\s/u

/** Label and icon by navigation level (contract v2 `target`; missing or unknown = module). */
export function getAiNavigationView(card: AiCard): AiNavigationView {
  const title = card.title?.trim() ?? ''
  const mappedIcon = AI_NAVIGATION_ICONS[card.icon ?? '']

  if (card.target === AI_NAVIGATION_TARGETS.record) {
    return {
      label: ACTION_TITLE.test(title) ? title : `${RECORD_PREFIX} ${title}`.trim(),
      description: card.description ?? null,
      icon: mappedIcon ?? FileText,
      isRecord: true,
    }
  }
  if (card.target === AI_NAVIGATION_TARGETS.filteredList) {
    return {
      label: title,
      description: card.description ?? 'Danh sách đã lọc sẵn theo câu hỏi',
      icon: ListFilter,
      isRecord: false,
    }
  }
  return {
    label: title,
    description: card.description ?? null,
    icon: mappedIcon ?? DefaultAiNavigationIcon,
    isRecord: false,
  }
}
