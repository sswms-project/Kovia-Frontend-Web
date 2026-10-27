import { Copy } from 'lucide-react'
import { goodsPreviewInteractions } from '@/features/inbound/utils/goods-preview-interactions'
import Link from 'next/link'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { APP_ROUTES } from '@/routes/app-routes'
import type { InboundRequestSummary } from '../../types/inbound-request.types'
import {
  formatOperationalDate,
  formatOperationalDateTime,
  formatQuantity,
} from '../../utils/inbound-request-format'
import { inboundSourceLabels } from '../../schemas/inbound-request.schema'
import { InboundRequestStatusBadge, SupplierResponseHint } from './InboundRequestStatusBadge'

interface InboundRequestMobileListProps {
  readonly previewId?: string
  readonly onOpen?: (item: InboundRequestSummary) => void
  readonly items: readonly InboundRequestSummary[]
  readonly canCreate: boolean
  readonly isDuplicating: boolean
  readonly onDuplicate: (item: InboundRequestSummary) => void
}

export function InboundRequestMobileList({
  previewId,
  onOpen,
  items,
  canCreate,
  isDuplicating,
  onDuplicate,
}: InboundRequestMobileListProps) {
  return (
    <ItemGroup className="gap-0 md:hidden">
      {items.map((item) => (
        <Item
          key={item.id}
          {...goodsPreviewInteractions(
            onOpen ? () => onOpen(item) : undefined,
            previewId === item.id,
            'border-b last:border-b-0'
          )}
        >
          <ItemContent className="min-w-0">
            <ItemTitle className="flex flex-wrap items-center gap-2">
              <Link
                href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
                className="max-w-full min-w-0 font-mono font-semibold wrap-anywhere whitespace-normal underline-offset-4 hover:underline"
                translate="no"
              >
                {item.inboundRequestCode}
              </Link>
              <InboundRequestStatusBadge status={item.status} />
              <SupplierResponseHint item={item} />
              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sao chép ${item.inboundRequestCode}`}
                  disabled={isDuplicating}
                  onClick={() => onDuplicate(item)}
                >
                  <Copy className="text-primary" aria-hidden="true" />
                </Button>
              ) : null}
            </ItemTitle>
            <ItemDescription>Tạo lúc {formatOperationalDateTime(item.createdAt)}</ItemDescription>
            <ItemDescription>
              {item.supplierName ?? item.sourceName ?? 'Chưa xác định nguồn'} ·{' '}
              {inboundSourceLabels[item.sourceType]} · {item.warehouseName ?? 'Chưa xác định kho'}
            </ItemDescription>
            <ItemDescription>
              {formatQuantity(item.receivedQuantity)} / {formatQuantity(item.orderedQuantity)} đã
              nhận · {formatOperationalDate(item.expectedDate)}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}
