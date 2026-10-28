'use client'

import { useId, type ReactNode } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalMasterDetail } from '@/components/operations/OperationalMasterDetail'

export const INBOUND_DETAIL_STORAGE_KEY = 'inbound-goods-detail:v1'

interface InboundMasterDetailProps {
  readonly title?: string
  readonly detailAnchorId?: string
  readonly children: ReactNode
  readonly detail: ReactNode
  readonly referenceCode?: string
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

export function InboundMasterDetail({
  title = 'Chi tiết hàng hóa',
  detailAnchorId,
  children,
  detail,
  referenceCode,
  expanded,
  onExpandedChange,
}: InboundMasterDetailProps) {
  const detailId = useId()
  return (
    <OperationalMasterDetail
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      detailId={detailId}
      detail={
        <OperationalListPanel id={detailId} aria-label={title} hidden={!expanded}>
          <header
            id={detailAnchorId}
            className="flex min-h-11 shrink-0 scroll-mt-20 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
          >
            <h2 className="text-sm font-semibold">{title}</h2>
            {referenceCode ? (
              <span className="text-muted-foreground font-mono text-xs">{referenceCode}</span>
            ) : null}
          </header>
          {detail}
        </OperationalListPanel>
      }
    >
      {children}
    </OperationalMasterDetail>
  )
}
