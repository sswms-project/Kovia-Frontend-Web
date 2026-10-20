import { CalendarDays, MapPin, Settings2, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useState } from 'react'
import type { WarehouseDetailResponse } from '@/types/warehouse'
import { formatWarehouseStatus } from '../../utils/warehouse-labels'

interface WarehouseOverviewProps {
  readonly warehouse: WarehouseDetailResponse
  readonly slots?: readonly { id: string; label: string }[]
  readonly canConfigureQuarantine?: boolean
  readonly isConfiguringQuarantine?: boolean
  readonly onConfigureQuarantine?: (slotId: string) => void
}

function formatDateTime(value: string | null) {
  if (!value) return 'Chưa cập nhật'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function WarehouseOverview({
  warehouse,
  slots = [],
  canConfigureQuarantine = false,
  isConfiguringQuarantine = false,
  onConfigureQuarantine,
}: WarehouseOverviewProps) {
  const [isQuarantineDialogOpen, setIsQuarantineDialogOpen] = useState(false)
  const [quarantineSlotId, setQuarantineSlotId] = useState(warehouse.quarantineSlotId ?? '')
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
      <div className="flex min-w-0 items-center justify-between gap-3 border-t px-3 py-2.5 sm:px-4">
        <div>
          <p className="text-muted-foreground text-xs">Vị trí quarantine</p>
          <p className="mt-0.5 font-mono text-sm font-medium">
            {warehouse.quarantineSlotCode ?? 'Chưa cấu hình'}
          </p>
        </div>
        {canConfigureQuarantine ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsQuarantineDialogOpen(true)}
          >
            <Settings2 data-icon="inline-start" aria-hidden="true" />
            Cấu hình
          </Button>
        ) : null}
      </div>
      <Dialog open={isQuarantineDialogOpen} onOpenChange={setIsQuarantineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấu hình vị trí quarantine</DialogTitle>
            <DialogDescription>
              Hàng thuộc lô bị block hoặc hoàn trả có lỗi sẽ được đưa về vị trí này trong kho{' '}
              {warehouse.warehouseCode}.
            </DialogDescription>
          </DialogHeader>
          <NativeSelect
            aria-label="Vị trí quarantine"
            value={quarantineSlotId}
            onChange={(event) => setQuarantineSlotId(event.target.value)}
          >
            <NativeSelectOption value="">Chọn vị trí</NativeSelectOption>
            {slots.map((slot) => (
              <NativeSelectOption key={slot.id} value={slot.id}>
                {slot.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isConfiguringQuarantine}
              onClick={() => setIsQuarantineDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!quarantineSlotId || isConfiguringQuarantine}
              onClick={() => onConfigureQuarantine?.(quarantineSlotId)}
            >
              {isConfiguringQuarantine ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
