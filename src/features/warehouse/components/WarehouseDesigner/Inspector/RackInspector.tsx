import { Loader2, Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { rackNameSchema } from '../../../schemas/warehouse.schema'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorZone,
} from '../../../types/warehouse-layout-scene.types'
import { InspectorHeader } from './InspectorHeader'

export function RackInspector({
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
