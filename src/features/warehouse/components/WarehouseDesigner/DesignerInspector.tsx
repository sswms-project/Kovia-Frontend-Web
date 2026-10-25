'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  warehouseLayoutDecorationSchema,
  type WarehouseLayoutDecorationFormValues,
} from '../../schemas/warehouse-layout-scene.schema'
import { rackNameSchema } from '../../schemas/warehouse.schema'
import type {
  WarehouseLayoutEditorDecoration,
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutEditorZone,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { formatWarehouseStatus } from '../../utils/warehouse-labels'
import { StorageCapacitySummary } from '../WarehouseDetailPage'
import { DECORATION_OPTIONS, getDecorationLabel } from './designer-constants'

interface DesignerInspectorProps {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection
  readonly canConfigure: boolean
  readonly isUpdatingRack: boolean
  readonly isDeactivatingRack: boolean
  readonly onRackNameChange: (rackName: string) => Promise<boolean>
  readonly onDecorationChange: (
    decoration: Omit<WarehouseLayoutEditorDecoration, 'clientKey' | 'id' | 'color'>
  ) => void
  readonly onClose: () => void
}

function InspectorHeader({
  title,
  code,
  status,
}: {
  readonly title: string
  readonly code: string
  readonly status?: string
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 pr-12">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px]">{title}</p>
          <h2 translate="no" className="truncate font-mono text-sm font-semibold">
            {code}
          </h2>
        </div>
        {status ? <Badge variant="outline">{formatWarehouseStatus(status)}</Badge> : null}
      </div>
    </div>
  )
}

function ZoneInspector({ zone }: { readonly zone: WarehouseLayoutEditorZone }) {
  return (
    <>
      <InspectorHeader title="Khu vực" code={zone.zoneCode} status={zone.status} />
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 px-4 pb-3 text-xs">
        <dt className="text-muted-foreground">Tên</dt>
        <dd className="truncate">{zone.zoneName}</dd>
      </dl>
      <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
        Kéo các điểm điều khiển trực tiếp trên sơ đồ để thay đổi kích thước; dùng toolbar nổi để đổi
        màu hoặc xoay khu vực.
      </p>
    </>
  )
}

function RackInspector({
  rack,
  zone,
  canConfigure,
  isUpdating,
  isDeactivating,
  onNameChange,
}: {
  readonly rack: WarehouseLayoutEditorRack
  readonly zone?: WarehouseLayoutEditorZone
  readonly canConfigure: boolean
  readonly isUpdating: boolean
  readonly isDeactivating: boolean
  readonly onNameChange: (rackName: string) => Promise<boolean>
}) {
  const [rackName, setRackName] = useState(rack.rackName)
  const parsedName = rackNameSchema.safeParse({ rackName })
  const nameError = parsedName.success ? null : parsedName.error.issues[0]?.message
  const isNameDirty = rackName.trim() !== rack.rackName

  async function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!parsedName.success) return
    if (await onNameChange(parsedName.data.rackName)) {
      setRackName(parsedName.data.rackName)
    }
  }

  return (
    <>
      <InspectorHeader title="Kệ hàng" code={rack.rackCode} status={rack.status} />
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 px-4 pb-3 text-xs">
        <dt className="text-muted-foreground">Khu vực</dt>
        <dd translate="no" className="font-mono">
          {zone ? `${zone.zoneCode} · ${zone.zoneName}` : rack.zoneCode}
        </dd>
      </dl>
      {canConfigure ? (
        <form className="flex flex-col gap-3 px-4 pb-3" onSubmit={submitName}>
          <Field data-invalid={Boolean(nameError)}>
            <FieldLabel htmlFor="rack-name-inspector">Tên kệ</FieldLabel>
            <Input
              id="rack-name-inspector"
              autoComplete="off"
              disabled={isUpdating || isDeactivating}
              aria-invalid={Boolean(nameError)}
              value={rackName}
              onChange={(event) => setRackName(event.target.value)}
            />
            <FieldError>{nameError}</FieldError>
          </Field>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!isNameDirty || Boolean(nameError) || isUpdating || isDeactivating}
          >
            {isUpdating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : (
              <Save data-icon="inline-start" aria-hidden="true" />
            )}
            Lưu tên kệ
          </Button>
        </form>
      ) : (
        <dl className="grid grid-cols-[5rem_1fr] gap-x-3 px-4 pb-3 text-xs">
          <dt className="text-muted-foreground">Tên</dt>
          <dd className="truncate">{rack.rackName}</dd>
        </dl>
      )}
      <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
        Màu, góc xoay và thao tác ngừng hoạt động nằm trên toolbar của kệ đang chọn.
      </p>
    </>
  )
}

function DecorationInspector({
  decoration,
  canConfigure,
  onChange,
}: {
  readonly decoration: WarehouseLayoutEditorDecoration
  readonly canConfigure: boolean
  readonly onChange: (
    decoration: Omit<WarehouseLayoutEditorDecoration, 'clientKey' | 'id' | 'color'>
  ) => void
}) {
  const form = useForm<WarehouseLayoutDecorationFormValues>({
    resolver: zodResolver(warehouseLayoutDecorationSchema),
    values: decoration,
  })
  const { errors } = form.formState

  return (
    <>
      <InspectorHeader title="Khu chức năng" code={decoration.label} />
      <form className="flex flex-col gap-3 px-4 py-3" onSubmit={form.handleSubmit(onChange)}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.label)}>
            <FieldLabel htmlFor="decoration-label">Tên hiển thị</FieldLabel>
            <Input
              id="decoration-label"
              disabled={!canConfigure}
              autoComplete="off"
              aria-invalid={Boolean(errors.label)}
              {...form.register('label')}
            />
            <FieldError errors={[errors.label]} />
          </Field>
          <Field data-invalid={Boolean(errors.type)}>
            <FieldLabel htmlFor="decoration-type">Loại khu vực</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} disabled={!canConfigure} onValueChange={field.onChange}>
                  <SelectTrigger id="decoration-type" className="w-full">
                    <SelectValue>{getDecorationLabel(field.value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DECORATION_OPTIONS.map((option) => (
                        <SelectItem key={option.type} value={option.type}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.type]} />
          </Field>
        </FieldGroup>
        <Button type="submit" size="sm" className="w-full" disabled={!canConfigure}>
          <Save data-icon="inline-start" aria-hidden="true" />
          Áp dụng thuộc tính
        </Button>
      </form>
      <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
        Di chuyển, đổi màu, xoay, nhân bản hoặc xóa biểu tượng bằng toolbar nổi trên sơ đồ.
      </p>
    </>
  )
}

function SlotInspector({
  scene,
  slotId,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly slotId: string
}) {
  const slot = scene.slots.find((item) => item.id === slotId)
  if (!slot) return null
  const rack = scene.racks.find((item) => item.id === slot.rackId)
  return (
    <>
      <InspectorHeader title="Vị trí lưu trữ" code={slot.slotCode} status={slot.occupancyStatus} />
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 px-4 py-3 text-xs">
        <dt className="text-muted-foreground">Kệ hàng</dt>
        <dd translate="no" className="font-mono">
          {rack?.rackCode ?? '—'}
        </dd>
        <dt className="text-muted-foreground">Sức chứa</dt>
        <dd className="min-w-0">
          <StorageCapacitySummary location={slot} />
        </dd>
        <dt className="text-muted-foreground">Vòng đời</dt>
        <dd>{slot.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</dd>
      </dl>
      <p className="text-muted-foreground px-4 pb-4 text-[11px]">
        Vị trí lưu trữ chỉ được xem trong phiên bản designer này.
      </p>
    </>
  )
}

export function DesignerInspector({
  scene,
  selection,
  canConfigure,
  isUpdatingRack,
  isDeactivatingRack,
  onRackNameChange,
  onDecorationChange,
  onClose,
}: DesignerInspectorProps) {
  const content = (() => {
    if (selection.kind === 'zone') {
      const zone = scene.zones.find((item) => item.id === selection.id)
      return zone ? <ZoneInspector zone={zone} /> : null
    }
    if (selection.kind === 'rack') {
      const rack = scene.racks.find((item) => item.id === selection.id)
      return rack ? (
        <RackInspector
          key={`${rack.id}:${rack.rackName}`}
          rack={rack}
          zone={scene.zones.find((zone) => zone.id === rack.zoneId)}
          canConfigure={canConfigure}
          isUpdating={isUpdatingRack}
          isDeactivating={isDeactivatingRack}
          onNameChange={onRackNameChange}
        />
      ) : null
    }
    if (selection.kind === 'decoration') {
      const decoration = scene.decorations.find((item) => item.clientKey === selection.id)
      return decoration ? (
        <DecorationInspector
          decoration={decoration}
          canConfigure={canConfigure}
          onChange={onDecorationChange}
        />
      ) : null
    }
    return <SlotInspector scene={scene} slotId={selection.id} />
  })()

  return (
    <div className="bg-surface-container-lowest relative h-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="absolute top-2 right-2 z-10"
            aria-label="Đóng bảng thuộc tính"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Đóng bảng thuộc tính</TooltipContent>
      </Tooltip>
      <ScrollArea className="h-full">{content}</ScrollArea>
    </div>
  )
}
