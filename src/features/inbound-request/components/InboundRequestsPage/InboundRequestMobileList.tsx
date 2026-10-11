import { Copy } from 'lucide-react'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import { useRouter } from 'next/navigation'
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
import { InboundRequestStatusBadge } from './InboundRequestStatusBadge'

interface InboundRequestMobileListProps {
  readonly items: readonly InboundRequestSummary[]
  readonly canCreate: boolean
  readonly isDuplicating: boolean
  readonly onDuplicate: (item: InboundRequestSummary) => void
}

export function InboundRequestMobileList({
  items,
  canCreate,
  isDuplicating,
  onDuplicate,
}: InboundRequestMobileListProps) {
  const router = useRouter()
  return (
    <ItemGroup className="gap-0 md:hidden">
      {items.map((item) => (
        <Item
          key={item.id}
          {...rowActivationProps(
            () => router.push(APP_ROUTES.inboundRequestDetail(item.id) as Route),
            'border-b last:border-b-0'
          )}
        >
          <ItemContent className="min-w-0">
            <ItemTitle className="flex flex-wrap items-center gap-2">
              <Link
                href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
                className="text-primary max-w-full min-w-0 truncate font-mono font-semibold underline-offset-4 hover:underline"
                translate="no"
              >
                {item.inboundRequestCode}
              </Link>
              <InboundRequestStatusBadge status={item.status} />
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
