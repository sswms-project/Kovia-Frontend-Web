import { aiOutcomeReportSchema } from '../schemas/ai-outcome-report.schema'
import { AI_CARD_TYPES, type AiCard } from '../types/ai-assistant.types'
import {
  AI_OUTCOME_ACTION_KINDS,
  type AiOutcomeAction,
  type AiOutcomeFactBar,
  type AiOutcomeFinding,
  type AiOutcomeRelatedGroup,
  type AiOutcomeReport,
  type AiOutcomeValue,
} from '../types/ai-outcome-report.types'
import { formatAiAsOf } from './ai-assistant-format'
import { isAiAppPath } from './ai-assistant-links'

/** `null` when the card is another type or its nested report has no headline: it is then not drawn at all. */
export function readAiOutcomeReport(card: AiCard): AiOutcomeReport | null {
  if (card.type !== AI_CARD_TYPES.outcomeReport) return null
  // The BE sends the report nested: { type: 'outcome_report', outcomeReport: { ... } }.
  const result = aiOutcomeReportSchema.safeParse(card.outcomeReport)
  return result.success ? result.data : null
}

/** Share of the limit already used, clamped to 0-100; `null` when no honest bar can be drawn (limit <= 0). */
export function getAiBarPercent({ current, limit }: AiOutcomeFactBar): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(limit) || limit <= 0) return null
  return Math.min(100, Math.max(0, (current / limit) * 100))
}

export function formatAiOutcomeValue(value: AiOutcomeValue, unit?: string | null): string {
  const shown =
    typeof value === 'number' ? value.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : value
  return unit ? `${shown} ${unit}` : shown
}

/** "2026-11-15T..." becomes "15/11/2026" without a timezone shift; any other text is shown as sent. */
export function formatAiOutcomeDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

/** "Có 6 yêu cầu nhập liên quan": one line that says what is there before the rows are opened. */
export function getOutcomeRelatedSummary({ title, count, items }: AiOutcomeRelatedGroup): string {
  const name = title.charAt(0).toLocaleLowerCase('vi') + title.slice(1)
  return `Có ${count ?? items.length} ${name}`
}

/** "Số liệu lúc HH:mm dd/MM/yyyy"; `null` for a missing or unreadable timestamp (Intl throws on those). */
export function formatAiOutcomeTimestamp(value?: string | null): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? `Số liệu lúc ${formatAiAsOf(value)}` : null
}

export interface AiOutcomeActionContext {
  /** Only the latest message may send a chat message: older turns are no longer the context. */
  readonly canSend: boolean
  readonly canRetry: boolean
}

export function isRenderableOutcomeAction(
  action: AiOutcomeAction,
  { canSend, canRetry }: AiOutcomeActionContext
): boolean {
  switch (action.kind) {
    case AI_OUTCOME_ACTION_KINDS.navigate:
      return isAiAppPath(action.url)
    case AI_OUTCOME_ACTION_KINDS.reply:
    case AI_OUTCOME_ACTION_KINDS.draft:
      return canSend && action.label.trim().length > 0
    case AI_OUTCOME_ACTION_KINDS.retry:
      return canRetry
    // select_entity (Wave 4) and anything unknown: no dead buttons.
    default:
      return false
  }
}

/** The chat message a reply/draft action sends; the draft itself is then made and confirmed by the existing flow. */
export function getOutcomeActionMessage(action: AiOutcomeAction): string {
  return action.prompt?.trim() || action.label
}

export interface AiOutcomeFindingView {
  readonly finding: AiOutcomeFinding
  readonly actions: readonly AiOutcomeAction[]
  readonly related: readonly AiOutcomeRelatedGroup[]
}

export interface AiOutcomeLayout {
  readonly findings: readonly AiOutcomeFindingView[]
  /** Related groups no finding points to. */
  readonly relatedGroups: readonly AiOutcomeRelatedGroup[]
  /** Actions that belong to no finding: the card's "next steps". */
  readonly actions: readonly AiOutcomeAction[]
}

/** Puts each action and related group under the finding that names it; the rest stay at card level. */
export function layoutAiOutcomeReport(
  report: AiOutcomeReport,
  context: AiOutcomeActionContext
): AiOutcomeLayout {
  const actions = report.recommendedActions.filter((action) =>
    isRenderableOutcomeAction(action, context)
  )
  const groups = report.related.filter((group) => (group.count ?? group.items.length) > 0)
  const claimedActions = new Set<string>()
  const claimedGroups = new Set<string>()

  const findings = report.findings.map((finding) => {
    const own = actions.filter(
      (action) =>
        !claimedActions.has(action.key) &&
        (action.findingKey === finding.key || finding.actionKeys.includes(action.key))
    )
    own.forEach((action) => claimedActions.add(action.key))
    const related = groups.filter(
      (group) => !claimedGroups.has(group.key) && finding.relatedGroupKeys.includes(group.key)
    )
    related.forEach((group) => claimedGroups.add(group.key))
    return { finding, actions: own, related }
  })

  return {
    findings,
    relatedGroups: groups.filter((group) => !claimedGroups.has(group.key)),
    actions: actions.filter((action) => !claimedActions.has(action.key)),
  }
}
