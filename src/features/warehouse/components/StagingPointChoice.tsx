'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { WarehouseStagingPoints } from '../schemas/warehouse-staging-points.schema'

export function StagingPointChoice({
  id,
  title,
  points,
  value,
  onChange,
  disabled,
  frozen = false,
  className,
}: {
  readonly id: string
  readonly title: string
  readonly points: WarehouseStagingPoints
  readonly value: string
  readonly onChange: (value: string) => void
  readonly disabled?: boolean
  readonly frozen?: boolean
  readonly className?: string
}) {
  const [editing, setEditing] = useState(false)
  const selected =
    points.items.find((point) => point.slotId === value) ??
    (frozen && points.boundPoint?.slotId === value ? points.boundPoint : undefined)
  return (
    <Field className={cn('min-w-0 border p-3', className)}>
      <FieldLabel htmlFor={id}>{title}</FieldLabel>
      {!frozen && (editing || !selected) ? (
        <NativeSelect
          id={id}
          className="w-full max-md:[&_select]:min-h-11 pointer-coarse:[&_select]:min-h-11"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.value)
            setEditing(false)
          }}
        >
          <NativeSelectOption value="">Chọn điểm chờ</NativeSelectOption>
          {points.items.map((point) => (
            <NativeSelectOption key={point.slotId} value={point.slotId}>
              {point.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 wrap-anywhere">
            {selected?.label ?? 'Điểm đã gắn với đợt hiện không còn hợp lệ. Liên hệ quản lý.'}
          </p>
          {!frozen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 max-md:min-h-11 pointer-coarse:min-h-11"
              disabled={disabled}
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" />
              Đổi vị trí
            </Button>
          )}
        </div>
      )}
      <FieldDescription>
        {points.items.length === 0
          ? 'Chưa có điểm chờ đúng chức năng đang hoạt động. Nhờ quản lý cấu hình tại khu vực của kho.'
          : points.invalidDefault
            ? 'Điểm mặc định không còn hợp lệ. Chọn rõ điểm khác hoặc nhờ quản lý sửa cấu hình.'
            : frozen
              ? 'Điểm đã gắn với đợt; đổi mặc định của kho không thay đổi điểm này.'
              : 'Có thể đổi điểm cho đợt này. Không cần quét điểm chờ.'}
      </FieldDescription>
    </Field>
  )
}
