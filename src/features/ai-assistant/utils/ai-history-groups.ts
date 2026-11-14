import { OPERATIONAL_TIME_ZONE } from '@/lib/operational-date-time'
import type { AiConversation } from '../types/ai-assistant.types'

export const AI_HISTORY_GROUP_LABELS = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  last7Days: '7 ngày qua',
  last30Days: '30 ngày qua',
  older: 'Cũ hơn',
} as const

export type AiHistoryGroupKey = keyof typeof AI_HISTORY_GROUP_LABELS

export interface AiHistoryGroup {
  readonly key: AiHistoryGroupKey
  readonly label: string
  readonly conversations: readonly AiConversation[]
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPERATIONAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DAY_MS = 86_400_000

// Calendar day in the operational time zone as a day number, so "yesterday" means the previous wall date.
function dayNumber(date: Date): number {
  const [year = 0, month = 1, day = 1] = dayFormatter.format(date).split('-').map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

function groupKeyFor(ageInDays: number): AiHistoryGroupKey {
  if (ageInDays <= 0) return 'today'
  if (ageInDays === 1) return 'yesterday'
  if (ageInDays <= 7) return 'last7Days'
  if (ageInDays <= 30) return 'last30Days'
  return 'older'
}

/** Buckets conversations (already newest first) by age; empty groups are dropped. */
export function groupAiConversations(
  conversations: readonly AiConversation[],
  now: Date
): AiHistoryGroup[] {
  const today = dayNumber(now)
  const buckets = new Map<AiHistoryGroupKey, AiConversation[]>()
  for (const conversation of conversations) {
    const key = groupKeyFor(today - dayNumber(new Date(conversation.lastMessageAt)))
    buckets.set(key, [...(buckets.get(key) ?? []), conversation])
  }
  return (Object.keys(AI_HISTORY_GROUP_LABELS) as AiHistoryGroupKey[])
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: AI_HISTORY_GROUP_LABELS[key],
      conversations: buckets.get(key) ?? [],
    }))
}

// "Đơn nhập" must match "don nhap": strip Vietnamese diacritics and case.
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
}

/** Filters only the conversations already loaded; the API has no content search. */
export function filterAiConversations(
  conversations: readonly AiConversation[],
  query: string
): readonly AiConversation[] {
  const needle = normalizeSearchText(query)
  if (!needle) return conversations
  return conversations.filter((conversation) =>
    normalizeSearchText(conversation.title).includes(needle)
  )
}
