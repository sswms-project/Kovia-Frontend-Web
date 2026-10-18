import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import { ProductStatusBadge } from '../ProductStatusBadge'
import type { ProductListItem } from '../../types/product.types'

const quantityFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })

interface ProductMobileListProps {
  readonly products: readonly ProductListItem[]
  readonly canEdit: boolean
  readonly canViewInventory: boolean
  readonly onView: (product: ProductListItem) => void
  readonly onEdit: (product: ProductListItem) => void
}

export function ProductMobileList({
  products,
  canEdit,
  canViewInventory,
  onView,
  onEdit,
}: ProductMobileListProps) {
  return (
    <ItemGroup className="gap-0">
      {products.map((product) => (
        <Item
          key={product.id}
          {...rowActivationProps(() => onView(product), 'border-b last:border-b-0')}
        >
          <ItemContent className="min-w-0">
            <ItemTitle className="flex w-full min-w-0 items-start gap-2">
              <span className="min-w-0 flex-1 break-words">{product.productName}</span>
              <ProductStatusBadge status={product.status} />
            </ItemTitle>
            <ItemDescription className="font-mono" translate="no">
              {product.sku}
            </ItemDescription>
            <ItemDescription>
              {product.categoryName ?? 'Chưa có nhóm'} · {product.unitName}
            </ItemDescription>
            {canViewInventory ? (
              <ItemDescription>
                Tồn:{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {quantityFormatter.format(product.quantityOnHand ?? 0)}
                </span>{' '}
                {product.unitName}
              </ItemDescription>
            ) : null}
          </ItemContent>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Chỉnh sửa ${product.productName}`}
              onClick={() => onEdit(product)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          ) : null}
        </Item>
      ))}
    </ItemGroup>
  )
}
