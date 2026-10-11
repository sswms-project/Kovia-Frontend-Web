'use client'

import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useScanPreferences } from '../../utils/scan-preferences'

interface ScanPreferencesBarProps {
  /** Chỉ màn lấy hàng có chế độ quét từng đơn vị. */
  readonly showEachUnit?: boolean
}

/** Tùy chọn quét của thiết bị này (lưu trên trình duyệt, không đổi dữ liệu nghiệp vụ). */
export function ScanPreferencesBar({ showEachUnit = false }: ScanPreferencesBarProps) {
  const baseId = useId()
  const [preferences, update] = useScanPreferences()
  return (
    <fieldset className="bg-muted/40 flex flex-wrap items-center gap-x-4 gap-y-2 border p-2">
      <legend className="sr-only">Tùy chọn quét mã</legend>
      <div className="flex items-center gap-2">
        <Switch
          id={`${baseId}-scanner`}
          size="sm"
          checked={preferences.scannerMode}
          onCheckedChange={(checked) => update({ scannerMode: checked })}
        />
        <Label htmlFor={`${baseId}-scanner`} className="text-xs">
          Dùng máy quét (ẩn bàn phím ảo)
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`${baseId}-feedback`}
          size="sm"
          checked={preferences.feedback}
          onCheckedChange={(checked) => update({ feedback: checked })}
        />
        <Label htmlFor={`${baseId}-feedback`} className="text-xs">
          Âm báo và rung
        </Label>
      </div>
      {showEachUnit ? (
        <div className="flex items-center gap-2">
          <Switch
            id={`${baseId}-each-unit`}
            size="sm"
            checked={preferences.eachUnit}
            onCheckedChange={(checked) => update({ eachUnit: checked })}
          />
          <Label htmlFor={`${baseId}-each-unit`} className="text-xs">
            Quét từng đơn vị
          </Label>
        </div>
      ) : null}
    </fieldset>
  )
}
