'use client'

import { CircleAlert, CircleCheck, Info, OctagonAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  AiCard,
  AiSimulationRowKind,
  AiSimulationSection,
} from '../../types/ai-assistant.types'
import { formatAiAsOf } from '../../utils/ai-assistant-format'
import { AiCardDetailList, AiCardDisclosure, AiCardLink } from './AiCardParts'

type Verdict = NonNullable<AiCard['verdictSeverity']>

const VERDICT: Record<Verdict, { icon: LucideIcon; tone: string; label: string }> = {
  ok: { icon: CircleCheck, tone: 'text-primary', label: 'Đáp ứng' },
  info: { icon: Info, tone: 'text-muted-foreground', label: 'Thông tin' },
  warning: { icon: CircleAlert, tone: 'text-warning', label: 'Cần chú ý' },
  critical: { icon: OctagonAlert, tone: 'text-destructive', label: 'Không đáp ứng' },
}

/** Source of each number, so a projection is never read as stock on hand. */
const KIND_LABEL: Record<AiSimulationRowKind, string> = {
  verified: 'Đã xác minh',
  scheduled: 'Theo lịch',
  assumption: 'Giả định',
  estimate: 'Ước tính',
  result: 'Kết quả',
}

function Section({
  section,
  onNavigate,
}: {
  section: AiSimulationSection
  onNavigate: () => void
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold [overflow-wrap:anywhere]">
        <AiCardLink url={section.url} onNavigate={onNavigate}>
          {section.title}
        </AiCardLink>
      </h4>
      <dl className="divide-y text-xs">
        {section.rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_fit-content(55%)] items-baseline gap-x-3 py-1',
              row.kind === 'result' && 'font-semibold'
            )}
          >
            <dt className="text-muted-foreground min-w-0">
              {row.label}
              <span className="text-muted-foreground/70 ml-1.5 text-[0.6875rem]">
                · {KIND_LABEL[row.kind]}
              </span>
            </dt>
            <dd className="text-right tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

interface AiSimulationCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

/** Read-only what-if: verdict first, then current vs projected per warehouse, assumptions and gaps on demand. */
export function AiSimulationCard({ card, onNavigate }: AiSimulationCardProps) {
  const sections = card.sections ?? []
  if (sections.length === 0 || !card.verdict) return null
  const verdict = VERDICT[card.verdictSeverity ?? 'info'] ?? VERDICT.info
  const VerdictIcon = verdict.icon
  const snapshot = card.snapshotAt ? formatAiAsOf(card.snapshotAt) : null
  const affected = card.affected ?? []

  return (
    <section aria-label={card.title ?? 'Kết quả mô phỏng'} className="rounded-lg border">
      <header className="space-y-1.5 px-3 pt-2.5 pb-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{card.title}</h3>
          <Badge variant="outline" className="border-dashed">
            {card.badge ?? 'Mô phỏng — chưa thực hiện'}
          </Badge>
        </div>
        <p className="flex items-start gap-2 text-sm text-pretty">
          <VerdictIcon className={cn('mt-0.5 size-4 shrink-0', verdict.tone)} aria-hidden="true" />
          <span>
            <span className="sr-only">{verdict.label}: </span>
            {card.verdict}
          </span>
        </p>
      </header>
      <div className="@container border-t px-3 py-2">
        <div className="grid gap-3 @md:grid-cols-2">
          {sections.map((section) => (
            <Section key={section.title} section={section} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
      {affected.length ? (
        <div className="space-y-1 border-t px-3 py-2 text-xs">
          <p className="font-medium">Phiếu khác bị ảnh hưởng</p>
          <ul className="space-y-0.5">
            {affected.map((item) => (
              <li key={item.title}>
                <AiCardLink url={item.url} onNavigate={onNavigate}>
                  {item.title}
                </AiCardLink>
                {item.detail ? (
                  <span className="text-muted-foreground">: {item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AiCardDisclosure label="Giả định và dữ liệu còn thiếu">
        <AiCardDetailList title="Giả định" items={card.assumptions} />
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
