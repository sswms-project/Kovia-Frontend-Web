import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { CircleOff, Pencil, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import { APP_ROUTES } from '@/routes/app-routes'
import type { StockRecipient } from '../../types/stock-recipient.types'

interface StockRecipientMobileListProps {
  readonly items: readonly StockRecipient[]
  readonly canUpdate: boolean
  readonly canManageStatus: boolean
  readonly onEdit: (stockRecipient: StockRecipient) => void
  readonly onChangeStatus: (stockRecipient: StockRecipient) => void
}

export function StockRecipientMobileList({
  items,
  canUpdate,
  canManageStatus,
  onEdit,
  onChangeStatus,
}: StockRecipientMobileListProps) {
  const router = useRouter()
  return (
    <ItemGroup className="gap-0">
      {items.map((stockRecipient) => {
        const detailHref = APP_ROUTES.stockRecipientDetail(stockRecipient.id) as Route
        return (
          <Item
            key={stockRecipient.id}
            {...rowActivationProps(() => router.push(detailHref), 'border-b last:border-b-0')}
          >
            <ItemContent className="min-w-0">
              <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-2">
                <Link
                  href={detailHref}
                  className="text-primary min-w-0 font-medium break-words underline-offset-4 hover:underline"
                >
                  {stockRecipient.recipientName}
                </Link>
                <Badge variant={stockRecipient.status === 'Active' ? 'default' : 'outline'}>
                  {stockRecipient.status === 'Active' ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                </Badge>
              </ItemTitle>
              <ItemDescription className="font-mono" translate="no">
                {stockRecipient.recipientCode}
              </ItemDescription>
              <ItemDescription className="break-all">
                {stockRecipient.phone}
                {stockRecipient.email ? ` · ${stockRecipient.email}` : ''}
              </ItemDescription>
            </ItemContent>
            {canUpdate || canManageStatus ? (
              <ItemActions>
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Chỉnh sửa ${stockRecipient.recipientName}`}
                    onClick={() => onEdit(stockRecipient)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                ) : null}
                {canManageStatus ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      stockRecipient.status === 'Active'
                        ? `Ngừng hợp tác ${stockRecipient.recipientName}`
                        : `Tiếp tục hợp tác với ${stockRecipient.recipientName}`
                    }
                    onClick={() => onChangeStatus(stockRecipient)}
                  >
                    {stockRecipient.status === 'Active' ? (
                      <CircleOff aria-hidden="true" />
                    ) : (
                      <RotateCcw aria-hidden="true" />
                    )}
                  </Button>
                ) : null}
              </ItemActions>
            ) : null}
          </Item>
        )
      })}
    </ItemGroup>
  )
}
