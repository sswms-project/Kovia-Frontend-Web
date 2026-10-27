import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ZoneResponse } from '@/types/warehouse'

export function IsolationAreaDialog({
  open,
  zones,
  onOpenChange,
  onSelect,
}: {
  readonly open: boolean
  readonly zones: readonly ZoneResponse[]
  readonly onOpenChange: (open: boolean) => void
  readonly onSelect: (zone: ZoneResponse | null) => void
}) {
  const [zoneId, setZoneId] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấu hình khu vực cách ly</DialogTitle>
          <DialogDescription>
            Tạo điểm riêng cho hàng hỏng, hết hạn. Vị trí lưu trữ thông thường không tự trở thành
            điểm cách ly.
          </DialogDescription>
        </DialogHeader>
        <Label htmlFor="isolation-zone">Khu vực</Label>
        <NativeSelect
          id="isolation-zone"
          value={zoneId}
          onChange={(event) => setZoneId(event.target.value)}
        >
          <NativeSelectOption value="">Tạo khu vực mới</NativeSelectOption>
          {zones
            .filter((zone) => zone.status === 'Active')
            .map((zone) => (
              <NativeSelectOption key={zone.id} value={zone.id}>
                {zone.zoneCode} - {zone.zoneName}
              </NativeSelectOption>
            ))}
        </NativeSelect>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            type="button"
            onClick={() => onSelect(zones.find((zone) => zone.id === zoneId) ?? null)}
          >
            Tiếp tục cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
