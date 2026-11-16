'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  AiCard,
  AiDecisionFeasibility,
  AiDecisionOption,
} from '../../types/ai-assistant.types'
import { formatAiAsOf } from '../../utils/ai-assistant-format'
import { AiCardDetailList, AiCardDisclosure, AiCardLink } from './AiCardParts'

const FEASIBILITY: Record<AiDecisionFeasibility, { label: string; tone: string }> = {
  yes: { label: 'Khả thi', tone: 'border-primary/40 text-primary' },
  partial: { label: 'Một phần', tone: 'border-warning text-warning' },
  no: { label: 'Không khả thi', tone: 'border-destructive/50 text-destructive' },
  unknown: { label: 'Chưa rõ', tone: 'text-muted-foreground' },
}

function OptionBlock({
  option,
  criteria,
  recommended,
  onNavigate,
}: {
  readonly option: AiDecisionOption
  readonly criteria: readonly string[]
  readonly recommended: boolean
  readonly onNavigate: () => void
}) {
  const feasibility = FEASIBILITY[option.feasible] ?? FEASIBILITY.unknown
  return (
    <li
      className={cn(
        'rounded-md border px-2.5 py-2',
        recommended && 'border-primary ring-primary/20 ring-1'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
          <AiCardLink url={option.url} onNavigate={onNavigate}>
            {option.title}
          </AiCardLink>
        </p>
        <span className="flex shrink-0 gap-1">
          {recommended ? <Badge>Đề xuất</Badge> : null}
          <Badge variant="outline" className={feasibility.tone}>
            {feasibility.label}
          </Badge>
        </span>
      </div>
      <dl className="mt-1 divide-y text-xs">
        {criteria.map((criterion, index) =>
          // The first criterion is feasibility, already shown as the badge.
          index === 0 || !option.values[index] ? null : (
            <div
              key={criterion}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 py-1"
            >
              <dt className="text-muted-foreground">{criterion}</dt>
              <dd className="text-right [overflow-wrap:anywhere] tabular-nums">
                {option.values[index]}
              </dd>
            </div>
          )
        )}
      </dl>
    </li>
  )
}

interface AiDecisionCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

/** Options side by side; one is highlighted only when the backend rule chose it, never by the model. */
export function AiDecisionCard({ card, onNavigate }: AiDecisionCardProps) {
  const options = card.decisionOptions ?? []
  if (options.length === 0) return null
  const criteria = card.criteria ?? []
  const snapshot = card.snapshotAt ? formatAiAsOf(card.snapshotAt) : null
  const evidence = card.evidence ?? []

  return (
    <section aria-label={card.title ?? 'So sánh phương án'} className="rounded-lg border">
      <header className="space-y-1 px-3 pt-2.5 pb-2">
        <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{card.title}</h3>
        {card.conclusion ? <p className="text-sm text-pretty">{card.conclusion}</p> : null}
        {card.recommendationBasis ? (
          <p className="text-muted-foreground text-xs text-pretty">{card.recommendationBasis}</p>
        ) : null}
      </header>
      <div className="@container border-t px-3 py-2">
        <ul className="grid gap-2 @lg:grid-cols-2">
          {options.map((option) => (
            <OptionBlock
              key={option.key}
              option={option}
              criteria={criteria}
              recommended={option.key === card.recommendedOption}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>
      <AiCardDisclosure label="Căn cứ, giả định và dữ liệu còn thiếu">
        {evidence.length ? (
          <div className="space-y-0.5">
            <p className="font-medium">Căn cứ</p>
            <ul className="text-muted-foreground list-disc space-y-0.5 pl-4">
              {evidence.map((item) => (
                <li key={item.label}>
                  <AiCardLink url={item.url} onNavigate={onNavigate}>
                    {item.label}
                  </AiCardLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <AiCardDetailList title="Giả định" items={card.assumptions} />
        <AiCardDetailList title="Rủi ro" items={card.risks} />
        <AiCardDetailList title="Chưa có dữ liệu" items={card.unknowns} />
      </AiCardDisclosure>
      {snapshot ? (
        <footer className="text-muted-foreground border-t px-3 py-1.5 text-right text-xs tabular-nums">
          Dữ liệu lúc {snapshot}
        </footer>
      ) : null}
    </section>
  )
}
