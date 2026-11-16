import {
  AI_OUTCOME_ACTION_KINDS,
  type AiOutcomeAction,
  type AiOutcomeFactBar,
} from '../types/ai-outcome-report.types'
import { formatAiOutcomeValue, type AiOutcomeFindingView } from './ai-outcome-report'

/** Findings that need a look keep their incoming order; the ones that are fine go to one quiet group. */
export function splitOutcomeFindings(views: readonly AiOutcomeFindingView[]) {
  return {
    attention: views.filter(({ finding }) => finding.tone !== 'ok'),
    ok: views.filter(({ finding }) => finding.tone === 'ok'),
  }
}

const normalize = (text: string) => text.trim().toLocaleLowerCase('vi')

/** True when `text` adds nothing: it equals, or is contained in, one of the other texts already on screen. */
export function isOutcomeTextCovered(text: string, others: readonly (string | null | undefined)[]) {
  const wanted = normalize(text)
  return wanted.length === 0 || others.some((other) => other && normalize(other).includes(wanted))
}

/** "43 / 80 Lon" and, for screen readers, "43 trên 80 Lon": one text for the row, the bar and its name. */
export function getAiBarText({ current, limit }: AiOutcomeFactBar, unit?: string | null) {
  const now = formatAiOutcomeValue(current)
  const max = formatAiOutcomeValue(limit, unit)
  return { visible: `${now} / ${max}`, spoken: `${now} trên ${max}` }
}

export interface PlannedOutcomeAction {
  readonly action: AiOutcomeAction
  readonly variant: 'default' | 'outline' | 'ghost'
}

interface PlanOptions {
  /** Most actions drawn; the rest are dropped from view, never an error. */
  readonly max?: number
  /** Card level: a navigate/draft action beats a reply as the primary. Finding level: the first one wins. */
  readonly preferIntent?: boolean
}

/** One solid primary at most, never a retry; the others are outline, retry is ghost. Primary comes first. */
export function planOutcomeActions(
  actions: readonly AiOutcomeAction[],
  { max = Infinity, preferIntent = false }: PlanOptions = {}
): PlannedOutcomeAction[] {
  const { navigate, draft, reply, retry } = AI_OUTCOME_ACTION_KINDS
  const intent = (action: AiOutcomeAction) => action.kind === navigate || action.kind === draft
  const primary = preferIntent
    ? (actions.find(intent) ?? actions.find((action) => action.kind === reply))
    : actions.find((action) => action.kind !== retry)
  const ordered = primary ? [primary, ...actions.filter((action) => action !== primary)] : actions
  return ordered.slice(0, max).map((action) => ({
    action,
    variant: action === primary ? 'default' : action.kind === retry ? 'ghost' : 'outline',
  }))
}
