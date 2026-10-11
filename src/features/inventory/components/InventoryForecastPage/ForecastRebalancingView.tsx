import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ForecastWorkspace } from '../../hooks/use-forecast-workspace'
import { formatInventoryQuantity } from '../../utils/inventory-format'

// Keeps the existing transfer acceptance contract separate from inbound draft review.
export function ForecastRebalancingView({
  workspace,
  canCreate,
}: {
  readonly workspace: ForecastWorkspace
  readonly canCreate: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertDescription>
          Đề xuất điều chuyển chưa được chấp nhận không được tính là hàng chắc chắn đang nhập. Kiểm
          tra nháp bổ sung để tránh lập hai kế hoạch cho cùng lượng thiếu.
        </AlertDescription>
      </Alert>
      {(workspace.runQuery.data?.rebalancingSuggestions ?? []).map((item) => (
        <div
          key={item.id}
          className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
        >
          <div>
            <p className="font-medium">
              {item.sku} · {item.productName}
            </p>
            <p className="text-muted-foreground text-xs">
              {item.sourceWarehouseName} → {item.destinationWarehouseName} ·{' '}
              {formatInventoryQuantity(item.suggestedQuantity)} · {item.status}
            </p>
          </div>
          {item.status === 'New' && canCreate ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  workspace.setTransferSuggestion(item)
                  workspace.setDestinationSlotId('')
                }}
              >
                Kiểm tra điều chuyển
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void workspace.rejectTransfer(item.id)}
              >
                Từ chối
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {workspace.transferSuggestion ? (
        <Field>
          <FieldLabel htmlFor="forecast-transfer-slot">Vị trí kho đích</FieldLabel>
          <NativeSelect
            id="forecast-transfer-slot"
            value={workspace.destinationSlotId}
            disabled={workspace.slotsQuery.isLoading || workspace.slotsQuery.isError}
            onChange={(event) => workspace.setDestinationSlotId(event.target.value)}
          >
            <NativeSelectOption value="">Chọn vị trí</NativeSelectOption>
            {(workspace.slotsQuery.data?.items ?? []).map((slot) => (
              <NativeSelectOption key={slot.id} value={slot.id}>
                {slot.code} · {slot.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {workspace.slotsQuery.isError ? (
            <Button variant="outline" onClick={() => void workspace.slotsQuery.refetch()}>
              Tải lại vị trí
            </Button>
          ) : null}
          <Button
            disabled={
              !canCreate ||
              !workspace.destinationSlotId ||
              workspace.isTransferring ||
              workspace.slotsQuery.isError
            }
            onClick={() => void workspace.acceptTransfer()}
          >
            Tạo yêu cầu điều chuyển
          </Button>
        </Field>
      ) : null}
    </div>
  )
}
