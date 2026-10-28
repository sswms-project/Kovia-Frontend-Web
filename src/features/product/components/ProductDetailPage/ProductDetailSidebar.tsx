import Image from 'next/image'
import { Boxes, FolderOpen, Package, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProductStatusBadge } from '../ProductStatusBadge'
import type { ProductResponse } from '../../types/product.types'

interface ProductDetailSidebarProps {
  readonly product: ProductResponse
}

interface DetailRowProps {
  readonly label: string
  readonly value: React.ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  )
}

export function ProductDetailSidebar({ product }: ProductDetailSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Product identity */}
      <div className="bg-card flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`Ảnh ${product.productName}`}
            width={96}
            height={96}
            className="size-24 rounded-lg border object-cover"
            unoptimized
          />
        ) : (
          <div className="bg-primary/10 flex size-16 items-center justify-center rounded-xl">
            <Package className="text-primary size-8" aria-hidden="true" />
          </div>
        )}
        <div>
          <p className="leading-snug font-semibold">{product.productName}</p>
          <Badge variant="outline" className="mt-1.5 font-mono text-[11px]">
            {product.sku}
          </Badge>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      {/* Meta rows */}
      <div className="bg-card rounded-lg border px-4">
        <DetailRow
          label="Nhóm VTHH"
          value={
            product.categoryName ? (
              <span className="flex items-center gap-1.5">
                <FolderOpen className="text-muted-foreground size-3.5" aria-hidden="true" />
                <span title={product.categoryPath ?? undefined}>{product.categoryName}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">Chưa phân loại</span>
            )
          }
        />
        <Separator />
        <DetailRow
          label="Đơn vị tính"
          value={
            <span className="flex items-center gap-1.5">
              <Scale className="text-muted-foreground size-3.5" aria-hidden="true" />
              {product.unitName}
            </span>
          }
        />
        <Separator />
        <DetailRow
          label="Quản lý tồn kho"
          value={
            <span className="flex items-center gap-1.5">
              <Boxes className="text-muted-foreground size-3.5" aria-hidden="true" />
              {product.isLotTracked ? 'Theo lô' : 'Theo số lượng'}
            </span>
          }
        />
      </div>
    </div>
  )
}
