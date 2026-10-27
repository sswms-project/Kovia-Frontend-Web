import { CalendarDays, MapPin, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { WarehouseDetailResponse } from '@/types/warehouse'
import { formatWarehouseStatus } from '../../utils/warehouse-labels'

interface WarehouseOverviewProps {
  readonly warehouse: WarehouseDetailResponse
}

function formatDateTime(value: string | null) {
  if (!value) return 'Chưa cập nhật'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function WarehouseOverview({ warehouse }: WarehouseOverviewProps) {
  const metadata = [
    { label: 'Mã kho', value: warehouse.warehouseCode, mono: true },
    { label: 'Địa chỉ', value: warehouse.address || 'Chưa cập nhật', icon: MapPin },
    { label: 'Số khu vực', value: `${warehouse.zoneCount} khu vực`, icon: Warehouse },
    { label: 'Ngày tạo', value: formatDateTime(warehouse.createdAt), icon: CalendarDays },
    { label: 'Cập nhật gần nhất', value: formatDateTime(warehouse.modifiedAt), icon: CalendarDays },
  ]

  return (
    <div className="bg-card text-card-foreground border">
      <dl className="grid min-w-0 grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {metadata.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="min-w-0 p-3 sm:p-4">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium">
                {Icon && <Icon className="text-muted-foreground shrink-0" aria-hidden="true" />}
                <span className={item.mono ? 'truncate font-mono text-xs' : 'truncate'}>
                  {item.value}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
      <div className="flex min-w-0 items-center justify-between gap-3 border-t px-3 py-2.5 sm:px-4">
        <span className="text-muted-foreground text-xs">Trạng thái vận hành</span>
        <Badge variant={warehouse.status === 'Active' ? 'outline' : 'destructive'}>
          {formatWarehouseStatus(warehouse.status)}
        </Badge>
      </div>
    </div>
  )
}
