import Link from 'next/link'
import type { ReactNode } from 'react'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { goodsPreviewInteractions } from '@/features/inbound/utils/goods-preview-interactions'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferSummary } from '../../types/transfer.types'
import { TransferFlagBadges, TransferStatusBadge } from './TransferStatusBadge'

export interface TransferListPartProps {
  readonly items: readonly TransferSummary[]
  readonly previewId?: string
  readonly onPreview: (transfer: TransferSummary) => void
  readonly renderRowActions: (transfer: TransferSummary) => ReactNode
}

export function TransferMobileList({
  items,
  previewId,
  onPreview,
  renderRowActions,
}: TransferListPartProps) {
  return (
    <div data-slot="operational-list-body" className="md:hidden">
      <ItemGroup className="gap-0">
        {items.map((item) => (
          <Item
            key={item.id}
            {...goodsPreviewInteractions(
              () => onPreview(item),
              previewId === item.id,
              'border-b last:border-b-0'
            )}
          >
            <ItemContent className="min-w-0">
              <ItemTitle className="flex flex-wrap items-center gap-2">
                <Link
                  href={APP_ROUTES.transferDetail(item.id)}
                  className="max-w-full min-w-0 truncate font-mono font-semibold underline-offset-4 hover:underline"
                  translate="no"
                >
                  {item.transferCode}
                </Link>
                <TransferStatusBadge status={item.status} />
              </ItemTitle>
              <ItemDescription>
                {item.sourceWarehouseName} → {item.destinationWarehouseName}
              </ItemDescription>
              <ItemDescription>
                {item.lineCount} dòng · {formatQuantity(item.requestedQuantity)} đơn vị ·{' '}
                {formatOperationalDateTime(item.createdAt)}
              </ItemDescription>
              <TransferFlagBadges
                hasOpenFeedback={item.hasOpenFeedback}
                hasPendingPickEscalation={item.hasPendingPickEscalation}
                hasOpenDiscrepancy={item.hasOpenDiscrepancy}
              />
            </ItemContent>
            {renderRowActions(item)}
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}
