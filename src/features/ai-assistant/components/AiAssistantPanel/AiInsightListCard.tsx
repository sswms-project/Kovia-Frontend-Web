'use client'

import { useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ChevronDown, CircleAlert, Info, OctagonAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { AiCard, AiInsightItem, AiInsightSeverity } from '../../types/ai-assistant.types'
import { formatAiAsOf } from '../../utils/ai-assistant-format'
import { isAiAppPath } from '../../utils/ai-assistant-links'
import { AiCardLink } from './AiCardParts'

/** The conclusion first: the most serious findings are visible, the rest one tap away. */
const INITIAL_COUNT = 3

const SEVERITY: Record<AiInsightSeverity, { label: string; icon: LucideIcon; tone: string }> = {
  critical: { label: 'Nghiêm trọng', icon: OctagonAlert, tone: 'text-destructive' },
  warning: { label: 'Cần chú ý', icon: CircleAlert, tone: 'text-warning' },
  info: { label: 'Theo dõi', icon: Info, tone: 'text-muted-foreground' },
}

function InsightRow({
  item,
  onNavigate,
}: {
  readonly item: AiInsightItem
  readonly onNavigate: () => void
}) {
  const severity = SEVERITY[item.severity] ?? SEVERITY.info
  const SeverityIcon = severity.icon
  const url = item.entity?.url
  const hasDetails = Boolean(item.evidence?.length || item.recommendation)

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <SeverityIcon className={cn('mt-0.5 size-4 shrink-0', severity.tone)} aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
              <span className="sr-only">{severity.label}: </span>
              <AiCardLink url={url} onNavigate={onNavigate}>
                {item.title}
              </AiCardLink>
            </p>
            {item.status ? (
              <Badge variant="outline" className="shrink-0">
                {item.status}
              </Badge>
            ) : null}
          </div>
          {item.summary ? (
            <p className="text-foreground/85 text-sm text-pretty">{item.summary}</p>
          ) : null}
          {hasDetails ? (
            <Collapsible>
              <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-7 items-center gap-1 rounded-sm text-xs outline-none focus-visible:ring-2">
                Căn cứ và đề xuất
                <ChevronDown
                  className="size-3.5 transition-transform duration-(--ai-motion-expand) group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent data-ai-motion="expand" className="space-y-1.5 pt-1 text-xs">
                {item.evidence?.length ? (
                  <ul className="text-muted-foreground list-disc space-y-0.5 pl-4">
                    {item.evidence.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                {item.recommendation ? (
                  <p className="text-pretty">
                    <span className="font-medium">Đề xuất: </span>
                    {item.recommendation}
                  </p>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </div>
    </li>
  )
}

interface AiInsightListCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

/** Operational findings ranked by the backend: severity, verified cause, recommendation, record to open. */
export function AiInsightListCard({ card, onNavigate }: AiInsightListCardProps) {
  const items = card.insights ?? []
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const visible = expanded ? items : items.slice(0, INITIAL_COUNT)
  const asOf = card.asOf ? formatAiAsOf(card.asOf) : null

  return (
    <section aria-label={card.title ?? 'Phát hiện vận hành'} className="rounded-lg border">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 pt-2.5 pb-2">
        <h3 className="min-w-0 text-sm font-semibold">{card.title}</h3>
        <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
          {card.completeness === 'partial' ? (
            <Badge variant="outline" className="border-warning text-warning">
              Chưa đủ nguồn
            </Badge>
          ) : null}
          {items.length} mục
        </span>
      </header>
      <ul className="divide-y border-t">
        {visible.map((item, index) => (
          <InsightRow key={`${index}-${item.title}`} item={item} onNavigate={onNavigate} />
        ))}
      </ul>
      {items.length > INITIAL_COUNT || asOf || isAiAppPath(card.moreUrl) ? (
        <footer className="text-muted-foreground flex flex-wrap items-center gap-x-3 border-t px-3 py-1.5 text-xs">
          {items.length > INITIAL_COUNT ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-7 px-0"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Thu gọn' : `Xem thêm ${items.length - INITIAL_COUNT}`}
            </Button>
          ) : null}
          {isAiAppPath(card.moreUrl) ? (
            <Link
              href={card.moreUrl as Route}
              onNavigate={onNavigate}
              className="text-primary hover:underline"
            >
              {card.moreLabel ?? 'Xem tất cả'}
            </Link>
          ) : null}
          {asOf ? <span className="ml-auto">{asOf}</span> : null}
        </footer>
      ) : null}
    </section>
  )
}
