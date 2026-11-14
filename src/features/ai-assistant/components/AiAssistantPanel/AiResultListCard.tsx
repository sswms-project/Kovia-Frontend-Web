'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AiCard, AiResultListItem } from '../../types/ai-assistant.types'
import { formatAiAsOf } from '../../utils/ai-assistant-format'
import { isAiAppPath } from '../../utils/ai-assistant-links'

/** Enough to answer "what matters most" without pushing the conversation off screen. */
const RESULT_LIST_INITIAL_COUNT = 5
const RESULT_LIST_PAGE_SIZE = 10

function ResultRowBody({ item }: { readonly item: AiResultListItem }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium [overflow-wrap:anywhere]">
          {item.title}
        </span>
        {item.subtitle ? (
          <span className="text-muted-foreground line-clamp-2 block text-xs">{item.subtitle}</span>
        ) : null}
      </span>
      {item.status || item.meta ? (
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {item.status ? <Badge variant="outline">{item.status}</Badge> : null}
          {item.meta ? (
            <span className="text-muted-foreground text-xs whitespace-nowrap">{item.meta}</span>
          ) : null}
        </span>
      ) : null}
    </>
  )
}

const ROW_CLASS = 'flex items-start gap-3 px-3 py-2'

interface AiResultListCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

/** A long result kept out of the answer text: a short preview that expands in place. */
export function AiResultListCard({ card, onNavigate }: AiResultListCardProps) {
  const items = card.items ?? []
  const total = card.total ?? items.length
  const [visibleCount, setVisibleCount] = useState(RESULT_LIST_INITIAL_COUNT)
  const actionsRef = useRef<HTMLDivElement>(null)
  const isExpanded = visibleCount > RESULT_LIST_INITIAL_COUNT
  const remaining = items.length - visibleCount
  const hasMoreOnServer = total > items.length && isAiAppPath(card.moreUrl)

  const collapse = () => {
    flushSync(() => setVisibleCount(RESULT_LIST_INITIAL_COUNT))
    // The list shrinks above the buttons; keep them where the reader's eye is, not jump to the top.
    actionsRef.current?.scrollIntoView?.({ block: 'nearest' })
  }

  return (
    <section aria-label={card.title ?? 'Danh sách kết quả'} className="rounded-lg border">
      <header className="flex items-baseline justify-between gap-3 px-3 pt-2.5 pb-2">
        <h3 className="min-w-0 text-sm font-semibold">{card.title}</h3>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{total} mục</span>
      </header>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-t px-3 py-2 text-sm">Không có mục nào.</p>
      ) : (
        <ul className="divide-y border-t">
          {items.slice(0, visibleCount).map((item, index) => (
            <li key={`${index}-${item.title}`}>
              {isAiAppPath(item.url) ? (
                <Link
                  // In-app path, validated by the BE and isAiAppPath.
                  href={item.url as Route}
                  onNavigate={onNavigate}
                  className={cn(
                    ROW_CLASS,
                    'hover:bg-muted focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-inset'
                  )}
                >
                  <ResultRowBody item={item} />
                </Link>
              ) : (
                <div className={ROW_CLASS}>
                  <ResultRowBody item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > RESULT_LIST_INITIAL_COUNT || hasMoreOnServer ? (
        <div ref={actionsRef} className="flex flex-wrap items-center gap-x-3 border-t px-3 py-1.5">
          {!isExpanded && items.length > RESULT_LIST_INITIAL_COUNT ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-7 px-0"
              onClick={() =>
                setVisibleCount(
                  Math.min(items.length, RESULT_LIST_INITIAL_COUNT + RESULT_LIST_PAGE_SIZE)
                )
              }
            >
              Xem tất cả {items.length}
            </Button>
          ) : null}
          {isExpanded && remaining > 0 ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-7 px-0"
              onClick={() => setVisibleCount((count) => count + RESULT_LIST_PAGE_SIZE)}
            >
              Tải thêm {Math.min(remaining, RESULT_LIST_PAGE_SIZE)}
            </Button>
          ) : null}
          {isExpanded ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="text-muted-foreground h-7 px-0"
              onClick={collapse}
            >
              Thu gọn
            </Button>
          ) : null}
          {hasMoreOnServer ? (
            <Link
              href={card.moreUrl as Route}
              onNavigate={onNavigate}
              className="text-primary ml-auto inline-flex h-7 items-center gap-1 text-xs font-medium hover:underline"
            >
              {card.moreLabel || 'Mở danh sách đầy đủ'}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {card.sortNote || card.asOf ? (
        <p className="text-muted-foreground bg-muted/40 border-t px-3 py-1.5 text-[11px]">
          {[card.sortNote, card.asOf ? `Số liệu tại ${formatAiAsOf(card.asOf)}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </section>
  )
}
