'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface OperationalDocumentInfoProps {
  readonly documentId: string
  readonly headingId: string
  readonly summary: string
  readonly summaryContent?: ReactNode
  readonly children: ReactNode
}

export function OperationalDocumentInfo({
  documentId,
  headingId,
  summary,
  summaryContent,
  children,
}: OperationalDocumentInfoProps) {
  return (
    <section aria-labelledby={headingId} className="bg-card w-full min-w-0 shrink-0 border p-3">
      <Collapsible key={documentId} defaultOpen>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium break-words">{summary}</p>
          <h2 id={headingId} className="shrink-0">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="group min-h-11 sm:min-h-7 pointer-coarse:min-h-11"
              >
                Thông tin phiếu
                <ChevronDown
                  data-icon="inline-end"
                  aria-hidden="true"
                  className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                />
              </Button>
            </CollapsibleTrigger>
          </h2>
        </div>
        {summaryContent}
        <CollapsibleContent className="mt-3 border-t pt-3">{children}</CollapsibleContent>
      </Collapsible>
    </section>
  )
}
