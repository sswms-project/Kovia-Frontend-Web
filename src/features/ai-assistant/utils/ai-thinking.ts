import type { AiStreamStep, AiStreamStepKind, AiStreamStepState } from '../types/ai-assistant.types'

/** How a turn's processing ended (or that it is still running). */
export type AiThinkingOutcome = 'running' | 'done' | 'failed' | 'stopped'

/** The real steps of one turn plus the client-measured time from send to its end. */
export interface AiThinkingSummary {
  readonly steps: readonly AiStreamStep[]
  readonly outcome: AiThinkingOutcome
  readonly elapsedMs: number
}

const STEP_KINDS: ReadonlySet<string> = new Set<AiStreamStepKind>([
  'understand',
  'lookup',
  'draft',
  'combine',
  'verify',
])
const STEP_STATES: ReadonlySet<string> = new Set<AiStreamStepState>([
  'running',
  'done',
  'empty',
  'failed',
])

/** Validates a `step` event payload (trust boundary); a malformed step is dropped, not guessed. */
export function toAiStreamStep(payload: Record<string, unknown>): AiStreamStep | null {
  const { id, kind, label, state, durationMs } = payload
  if (typeof id !== 'number' || !Number.isFinite(id)) return null
  if (typeof kind !== 'string' || !STEP_KINDS.has(kind)) return null
  if (typeof state !== 'string' || !STEP_STATES.has(state)) return null
  if (typeof label !== 'string' || !label.trim()) return null
  return {
    id,
    kind: kind as AiStreamStepKind,
    label: label.trim(),
    state: state as AiStreamStepState,
    durationMs: typeof durationMs === 'number' && durationMs >= 0 ? durationMs : null,
  }
}

/** Start and finish of a step share its `id`: the later event replaces the earlier one in place. */
export function upsertAiStreamStep(
  steps: readonly AiStreamStep[],
  step: AiStreamStep
): readonly AiStreamStep[] {
  const index = steps.findIndex((current) => current.id === step.id)
  if (index === -1) return [...steps, step]
  return steps.map((current, currentIndex) => (currentIndex === index ? step : current))
}

function lookups(steps: readonly AiStreamStep[]) {
  return steps.filter((step) => step.kind === 'lookup')
}

/** One data lookup (or none) reads as a single line; two or more deserve the step list. */
export function isCompactThinking(steps: readonly AiStreamStep[]): boolean {
  return lookups(steps).length <= 1
}

/** Data sources actually checked: lookups that finished, with or without data. */
export function countCheckedSources(steps: readonly AiStreamStep[]): number {
  return lookups(steps).filter((step) => step.state === 'done' || step.state === 'empty').length
}

export function countFailedSources(steps: readonly AiStreamStep[]): number {
  return lookups(steps).filter((step) => step.state === 'failed').length
}

/** The step shown on the compact line: the newest one still running, else the newest one. */
export function currentAiStep(steps: readonly AiStreamStep[]): AiStreamStep | null {
  return steps.findLast((step) => step.state === 'running') ?? steps.at(-1) ?? null
}

const SECONDS_FORMAT = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** "6,4 giây" (Vietnamese decimal comma). */
export function formatAiSeconds(milliseconds: number): string {
  return `${SECONDS_FORMAT.format(Math.max(0, milliseconds) / 1000)} giây`
}

/** The collapsed row under a finished turn, e.g. "Đã kiểm tra 2 nguồn dữ liệu · 6,4 giây". */
export function describeAiThinking({ steps, outcome, elapsedMs }: AiThinkingSummary): string {
  const time = formatAiSeconds(elapsedMs)
  if (outcome === 'running') return 'Kovia đang phân tích…'
  if (outcome === 'stopped') return `Đã dừng sau ${time}`
  if (outcome === 'failed') return `Không lấy được câu trả lời · ${time}`

  const checked = countCheckedSources(steps)
  const failed = countFailedSources(steps)
  if (checked === 0 && failed > 0) return `Không lấy được ${failed} nguồn dữ liệu · ${time}`
  const parts = [checked > 0 ? `Đã kiểm tra ${checked} nguồn dữ liệu` : 'Đã trả lời']
  if (failed > 0) parts.push(`không lấy được ${failed} nguồn`)
  parts.push(time)
  return parts.join(' · ')
}
