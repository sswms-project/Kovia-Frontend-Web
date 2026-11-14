'use client'

import { Check, ChevronDown, CircleSlash, Minus, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { AiStreamStep } from '../../types/ai-assistant.types'
import {
  currentAiStep,
  describeAiThinking,
  formatAiSeconds,
  isCompactThinking,
  type AiThinkingSummary,
} from '../../utils/ai-thinking'

/** "0,0 giây" is noise: instant steps show no duration. */
const MIN_SHOWN_DURATION_MS = 100

const STATE_VIEW: Record<
  AiStreamStep['state'] | 'stopped',
  { readonly icon: LucideIcon; readonly className: string; readonly srLabel: string }
> = {
  running: { icon: Minus, className: 'text-tertiary', srLabel: 'đang chạy' },
  done: { icon: Check, className: 'text-primary', srLabel: 'xong' },
  empty: { icon: Minus, className: 'text-muted-foreground', srLabel: 'không có dữ liệu' },
  failed: { icon: X, className: 'text-destructive', srLabel: 'lỗi' },
  stopped: { icon: CircleSlash, className: 'text-muted-foreground', srLabel: 'đã dừng' },
}

interface StepRowProps {
  readonly step: AiStreamStep
  /** The turn ended: a step still `running` was cut off (no finish event comes after a stop). */
  readonly isFinal: boolean
}

function StepRow({ step, isFinal }: StepRowProps) {
  const state = isFinal && step.state === 'running' ? 'stopped' : step.state
  const view = STATE_VIEW[state]
  const Icon = view.icon
  const isRunning = state === 'running'

  return (
    <span className="flex min-w-0 items-start gap-2">
      <span
        className={cn('mt-px flex size-4 shrink-0 items-center justify-center', view.className)}
      >
        {isRunning ? (
          <Spinner
            role={undefined}
            aria-label={undefined}
            aria-hidden="true"
            className="size-3.5 motion-reduce:animate-none"
          />
        ) : (
          <Icon className="size-3.5" aria-hidden="true" />
        )}
      </span>
      <span
        // The running row carries the shimmer, so the eye lands on what is happening now.
        data-slot={isRunning ? 'ai-typing-label' : undefined}
        className={cn(
          'min-w-0 flex-1 [overflow-wrap:anywhere]',
          !isRunning && 'text-muted-foreground'
        )}
      >
        {step.label}
        <span className="sr-only"> ({view.srLabel})</span>
      </span>
      {step.durationMs !== null && step.durationMs >= MIN_SHOWN_DURATION_MS && !isRunning ? (
        <span className="text-muted-foreground/80 shrink-0 tabular-nums">
          {formatAiSeconds(step.durationMs)}
        </span>
      ) : null}
    </span>
  )
}

interface StepListProps {
  readonly steps: readonly AiStreamStep[]
  readonly isFinal: boolean
  /** Live list only: a finished list expands without per-row entrances. */
  readonly animate: boolean
}

function StepList({ steps, isFinal, animate }: StepListProps) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((step) => (
        // Keyed by state too: each transition replays the short step entrance.
        <li key={`${step.id}-${step.state}`} data-ai-motion={animate ? 'step' : undefined}>
          <StepRow step={step} isFinal={isFinal} />
        </li>
      ))}
    </ol>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span key={dot} data-slot="ai-typing-dot" className="bg-tertiary size-1.5 rounded-full" />
      ))}
    </span>
  )
}

/** While running: header + real steps only (no fake progress, no percentages). */
function LiveThinking({ steps }: { readonly steps: readonly AiStreamStep[] }) {
  const current = currentAiStep(steps)
  const hasRunningStep = steps.some((step) => step.state === 'running')

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="text-muted-foreground flex min-h-6 items-center gap-2">
        <TypingDots />
        <span data-slot={hasRunningStep ? undefined : 'ai-typing-label'}>
          Kovia đang phân tích…
        </span>
      </div>
      {current && isCompactThinking(steps) ? (
        <div key={`${current.id}-${current.state}`} data-ai-motion="step">
          <StepRow step={current} isFinal={false} />
        </div>
      ) : null}
      {!isCompactThinking(steps) ? <StepList steps={steps} isFinal={false} animate /> : null}
      {/* Announced politely once per step change, never per streamed token. */}
      <span role="status" className="sr-only">
        {current ? current.label : 'Kovia đang phân tích…'}
      </span>
    </div>
  )
}

/** After the turn: one quiet row that expands to the steps it ran. */
function ThinkingSummaryRow({ summary }: { readonly summary: AiThinkingSummary }) {
  const hasSteps = summary.steps.length > 0
  const label = describeAiThinking(summary)
  const tone = summary.outcome === 'failed' ? 'text-destructive' : 'text-muted-foreground'

  if (!hasSteps) return <p className={cn('text-xs', tone)}>{label}</p>

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            'group/thinking -ml-2 h-auto min-h-6 max-w-full justify-start py-0.5 text-left font-normal whitespace-normal',
            tone
          )}
        >
          <span className="min-w-0">{label}</span>
          <ChevronDown
            className="shrink-0 transition-transform duration-(--ai-motion-hover) group-data-[state=open]/thinking:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent data-ai-motion="expand" className="pt-1 pb-0.5 text-xs">
        <StepList steps={summary.steps} isFinal animate={false} />
      </CollapsibleContent>
    </Collapsible>
  )
}

interface AiThinkingStepsProps {
  readonly summary: AiThinkingSummary
}

/** Replaces the old "Kovia đang trả lời…" line: what the assistant is really doing, then a summary. */
export function AiThinkingSteps({ summary }: AiThinkingStepsProps) {
  if (summary.outcome === 'running') return <LiveThinking steps={summary.steps} />
  // A plain answer without data steps needs no "thinking" row at all.
  if (summary.outcome === 'done' && summary.steps.length === 0) return null
  return <ThinkingSummaryRow summary={summary} />
}
