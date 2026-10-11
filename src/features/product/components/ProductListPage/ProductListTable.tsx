import { Eye, Pencil } from 'lucide-react'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductStatusBadge } from '../ProductStatusBadge'
import type { ProductListItem } from '../../types/product.types'

const quantityFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })

interface ProductListTableProps {
  readonly products: readonly ProductListItem[]
  readonly canEdit: boolean
  readonly canViewInventory: boolean
  readonly onView: (product: ProductListItem) => void
  readonly onEdit: (product: ProductListItem) => void
}

export function ProductListTable({
  products,
  canEdit,
  canViewInventory,
  onView,
  onEdit,
}: ProductListTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="sticky top-0 z-10 w-[200px] pl-4">Mã hàng hóa</TableHead>
          <TableHead className="sticky top-0 z-10">Tên sản phẩm</TableHead>
          <TableHead className="sticky top-0 z-10">Danh mục</TableHead>
          <TableHead className="sticky top-0 z-10">Đơn vị chính</TableHead>
          <TableHead className="sticky top-0 z-10">Đơn vị quy đổi</TableHead>
          {canViewInventory ? (
            <TableHead className="sticky top-0 z-10 text-right">Số lượng tồn</TableHead>
          ) : null}
          <TableHead className="sticky top-0 z-10 w-[120px] text-center">Trạng thái</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px] pr-4 text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <ClickableTableRow
            key={product.id}
            className="hover:bg-muted/30"
            onActivate={() => onView(product)}
          >
            <TableCell className="text-muted-foreground pl-4 font-mono text-xs">
              {product.sku}
            </TableCell>
            <TableCell className="font-medium">{product.productName}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              <span title={product.categoryPath ?? undefined}>{product.categoryName ?? '—'}</span>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">{product.unitName}</TableCell>
            <TableCell>
              {product.unitConversions?.length ? (
                <div className="flex flex-col gap-1">
                  {product.unitConversions.map((conversion) => (
                    <span key={conversion.id}>
                      1 {conversion.unitName} ={' '}
                      {quantityFormatter.format(conversion.conversionFactor)} {product.unitName}
                    </span>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </TableCell>
            {canViewInventory ? (
              <TableCell className="text-right font-medium tabular-nums">
                {quantityFormatter.format(product.quantityOnHand ?? 0)}
              </TableCell>
            ) : null}
            <TableCell className="text-center">
              <ProductStatusBadge status={product.status} />
            </TableCell>
            <TableCell className="pr-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Xem chi tiết"
                  onClick={() => onView(product)}
                >
                  <Eye className="size-4" aria-hidden="true" />
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Chỉnh sửa"
                    onClick={() => onEdit(product)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </TableCell>
          </ClickableTableRow>
        ))}
      </TableBody>
    </Table>
  )
}
