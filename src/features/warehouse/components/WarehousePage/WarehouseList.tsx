import { Warehouse } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WarehouseResponse } from '@/types/warehouse'
import { formatWarehouseStatus } from '../../utils/warehouse-labels'

interface WarehouseListProps {
  readonly warehouses: readonly WarehouseResponse[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
}

function WarehouseStatusBadge({ status }: { readonly status: string }) {
  const isActive = status === 'Active'
  return (
    <Badge variant={isActive ? 'outline' : 'destructive'}>{formatWarehouseStatus(status)}</Badge>
  )
}

export function WarehouseList({ warehouses }: WarehouseListProps) {
  return (
    <div data-slot="operational-list-body" className="min-h-0 min-w-0">
      <div className="hidden min-w-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 pl-4">Mã kho</TableHead>
              <TableHead className="sticky top-0 z-10">Tên kho</TableHead>
              <TableHead className="sticky top-0 z-10">Địa chỉ</TableHead>
              <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
              <TableHead className="sticky top-0 z-10">Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((warehouse) => (
              <ClickableTableRow
                key={warehouse.id}
                href={APP_ROUTES.warehouseDetail(warehouse.id)}
                className="focus-within:bg-muted"
              >
                <TableCell className="pl-4 font-mono text-xs font-medium">
                  {warehouse.warehouseCode}
                </TableCell>
                <TableCell className="max-w-52 truncate font-medium">
                  <Link
                    href={APP_ROUTES.warehouseDetail(warehouse.id)}
                    className="text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {warehouse.warehouseName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-72 truncate">
                  {warehouse.address || 'Chưa cập nhật'}
                </TableCell>
                <TableCell>
                  <WarehouseStatusBadge status={warehouse.status} />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(warehouse.createdAt)}
                </TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {warehouses.map((warehouse) => (
          <Link
            key={warehouse.id}
            href={APP_ROUTES.warehouseDetail(warehouse.id)}
            aria-label={warehouse.warehouseName}
            className="hover:bg-muted focus-visible:bg-muted focus-visible:outline-ring flex min-h-11 min-w-0 items-start gap-3 px-3 py-3 focus-visible:outline-2"
          >
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center">
              <Warehouse aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-primary block truncate text-sm font-medium">
                    {warehouse.warehouseName}
                  </span>
                  <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                    {warehouse.warehouseCode}
                  </p>
                </div>
                <WarehouseStatusBadge status={warehouse.status} />
              </div>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                {warehouse.address || 'Chưa cập nhật địa chỉ'}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {formatDate(warehouse.createdAt)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
