import { Plus } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import type { TransferLineUnits } from '../../types/transfer.types'
import {
  TransferGeneralSection,
  type TransferFormMode,
  type WarehouseSelectOption,
} from './TransferGeneralSection'
import { exceedsAvailability } from '../../utils/transfer-line-units'
import { lineGridColumns } from './line-grid'
import { TransferLineRow, type TransferLineLockInfo } from './TransferLineRow'
import type { BusinessCodeFieldProps } from '@/components/forms/BusinessCodeField'

export type { TransferFormMode, WarehouseSelectOption }

interface TransferFormProps {
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly fields: readonly FieldArrayWithId<TransferRequestFormValues, 'lines', 'id'>[]
  readonly mode: TransferFormMode
  readonly destinationOptions: readonly WarehouseSelectOption[]
  readonly sourceOptions: readonly WarehouseSelectOption[]
  readonly warehousesLocked: boolean
  readonly productOptions: readonly LookupOption[]
  readonly knownProductOptions: Readonly<Record<string, LookupOption>>
  readonly unitsByProductId: Readonly<Record<string, TransferLineUnits>>
  readonly isUnitLoading: boolean
  readonly isUnitError: boolean
  /** Đã chọn đủ kho xuất và kho nhập, nên mới có số tồn để hiển thị. */
  readonly hasWarehouses: boolean
  readonly showSourceSlot: boolean
  readonly sourceWarehouseId: string
  readonly knownSourceSlots: Readonly<Record<string, LookupOption>>
  readonly showDestinationSlot: boolean
  readonly destinationSlotOptions: readonly LookupOption[]
  readonly knownDestinationSlots: Readonly<Record<string, LookupOption>>
  readonly isDestinationSlotLoading: boolean
  readonly lockedDestinationItemIds: ReadonlySet<string>
  readonly onDestinationSlotSearchChange: (value: string) => void
  readonly lockByItemId: Readonly<Record<string, TransferLineLockInfo>>
  readonly isProductSearchLoading: boolean
  readonly isSaving: boolean
  readonly requesterNames: readonly string[]
  readonly codeSuggestionStatus?: BusinessCodeFieldProps['suggestionStatus']
  readonly canCreateRelocation: boolean
  readonly onCodeChange: () => void
  readonly onSelectInternalRelocation: () => void
  readonly onDestinationChange: (value: string) => void
  readonly onSourceChange: (value: string) => void
  readonly onProductSearchChange: (scope: string, value: string) => void
  readonly onAddLine: () => void
  readonly onRemoveLine: (index: number) => void
  readonly onSaveDraft: () => void
  readonly onCancel: () => void
  readonly onSubmit: () => void
}

export function TransferForm({
  form,
  fields,
  mode,
  destinationOptions,
  sourceOptions,
  warehousesLocked,
  productOptions,
  knownProductOptions,
  unitsByProductId,
  isUnitLoading,
  isUnitError,
  hasWarehouses,
  showSourceSlot,
  sourceWarehouseId,
  knownSourceSlots,
  showDestinationSlot,
  destinationSlotOptions,
  knownDestinationSlots,
  isDestinationSlotLoading,
  lockedDestinationItemIds,
  onDestinationSlotSearchChange,
  lockByItemId,
  isProductSearchLoading,
  isSaving,
  requesterNames,
  codeSuggestionStatus,
  canCreateRelocation,
  onCodeChange,
  onSelectInternalRelocation,
  onDestinationChange,
  onSourceChange,
  onProductSearchChange,
  onAddLine,
  onRemoveLine,
  onSaveDraft,
  onCancel,
  onSubmit,
}: TransferFormProps) {
  const errors = form.formState.errors
  const lines = form.watch('lines')
  const isEditingSubmitted = mode === 'edit'
  const overAvailabilityCount = lines.filter(
    (line) =>
      !(isEditingSubmitted && line.itemId) &&
      exceedsAvailability(line.quantity, line.unitId, unitsByProductId[line.productId])
  ).length

  return (
    <form
      data-slot="transfer-scroll"
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <TransferGeneralSection
        form={form}
        mode={mode}
        destinationOptions={destinationOptions}
        sourceOptions={sourceOptions}
        warehousesLocked={warehousesLocked}
        requesterNames={requesterNames}
        codeSuggestionStatus={codeSuggestionStatus}
        canCreateRelocation={canCreateRelocation}
        onCodeChange={onCodeChange}
        onDestinationChange={onDestinationChange}
        onSourceChange={onSourceChange}
        onSelectInternalRelocation={onSelectInternalRelocation}
      />

      <section className="bg-card border" aria-labelledby="transfer-form-lines">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div>
            <h2 id="transfer-form-lines" className="text-sm font-semibold">
              Dòng hàng
            </h2>
            <p className="text-muted-foreground text-xs">
              Hệ thống tự phân bổ vị trí và lô theo FEFO/FIFO khi gửi yêu cầu.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
            <Plus aria-hidden="true" />
            Thêm dòng
          </Button>
        </div>
        <div
          className={`text-muted-foreground bg-muted hidden gap-3 border-b px-3 py-2 text-xs font-medium lg:grid ${lineGridColumns(showSourceSlot, showDestinationSlot)}`}
        >
          <span>#</span>
          <span>Sản phẩm</span>
          <span>ĐVT</span>
          <span>Số lượng</span>
          <span>SL theo ĐVT chính</span>
          <span>Tồn khả dụng kho xuất</span>
          {showSourceSlot ? <span>Vị trí đi</span> : null}
          {showDestinationSlot ? <span>Vị trí đến</span> : null}
          <span />
        </div>
        {errors.lines?.message || errors.lines?.root?.message ? (
          <p role="alert" className="text-destructive px-3 pt-3 text-xs">
            {errors.lines?.message ?? errors.lines?.root?.message}
          </p>
        ) : null}
        <div className="divide-y">
          {fields.map((field, index) => {
            const line = lines[index]
            const itemId = line?.itemId ?? null
            const productId = line?.productId ?? ''
            return (
              <TransferLineRow
                key={field.id}
                field={field}
                index={index}
                lineCount={fields.length}
                form={form}
                unitInfo={unitsByProductId[productId]}
                isUnitLoading={isUnitLoading}
                isUnitError={isUnitError}
                hasWarehouses={hasWarehouses}
                showSourceSlot={showSourceSlot}
                sourceWarehouseId={sourceWarehouseId}
                selectedSourceSlot={knownSourceSlots[line?.sourceSlotId ?? '']}
                isSourceSlotLocked={isEditingSubmitted && Boolean(itemId)}
                showDestinationSlot={showDestinationSlot}
                destinationSlotOptions={destinationSlotOptions}
                selectedDestinationSlot={knownDestinationSlots[line?.destinationSlotId ?? '']}
                isDestinationSlotLoading={isDestinationSlotLoading}
                isDestinationSlotLocked={Boolean(itemId && lockedDestinationItemIds.has(itemId))}
                onDestinationSlotSearchChange={onDestinationSlotSearchChange}
                selectedOption={knownProductOptions[productId]}
                options={productOptions}
                isProductSearchLoading={isProductSearchLoading}
                isIdentityLocked={isEditingSubmitted && Boolean(itemId)}
                lockInfo={itemId ? lockByItemId[itemId] : undefined}
                showAvailabilityWarning={!isEditingSubmitted || !itemId}
                onProductSearchChange={onProductSearchChange}
                onRemove={onRemoveLine}
              />
            )
          })}
        </div>
      </section>

      <div className="bg-background sticky bottom-0 flex flex-wrap justify-end gap-2 border-t py-3">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          Hủy
        </Button>
        {mode !== 'edit' ? (
          <Button type="button" variant="outline" disabled={isSaving} onClick={onSaveDraft}>
            Lưu nháp
          </Button>
        ) : null}
        {overAvailabilityCount > 0 ? (
          <p role="status" className="text-warning mr-auto self-center text-xs">
            {overAvailabilityCount} dòng vượt tồn khả dụng của kho xuất.
          </p>
        ) : null}
        <Button type="submit" disabled={isSaving || overAvailabilityCount > 0}>
          {isSaving ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo yêu cầu'}
        </Button>
      </div>
    </form>
  )
}
