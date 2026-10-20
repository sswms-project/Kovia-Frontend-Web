import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { useReceivingLocationSelection } from '../../hooks/use-receiving-location-selection'

interface ReceivingLocationPickerProps {
  readonly state: ReturnType<typeof useReceivingLocationSelection>
  readonly disabled?: boolean
}
export function ReceivingLocationPicker({ state, disabled }: ReceivingLocationPickerProps) {
  const items = state.query.isSuccess ? state.query.data.items : []
  const pages = Math.max(1, Math.ceil((state.query.data?.totalCount ?? 0) / 20))
  return (
    <Field>
      <FieldLabel>Vị trí thực tế nhận hàng</FieldLabel>
      <p className="text-muted-foreground text-sm">
        Hàng nhận được ghi vào tồn tạm giữ tại vị trí này. Cất hàng sau duyệt sẽ chuyển sang vị trí
        khác.
      </p>
      <Input
        aria-label="Tìm vị trí nhận hàng"
        value={state.search}
        maxLength={100}
        disabled={disabled}
        placeholder="Tìm mã khu vực, kệ hoặc vị trí"
        onChange={(event) => state.searchFor(event.target.value)}
      />
      <NativeSelect
        aria-label="Vị trí thực tế nhận hàng"
        value={state.selected?.id ?? ''}
        disabled={disabled || state.query.isFetching || state.query.isError}
        onChange={(event) => state.choose(event.target.value)}
      >
        <NativeSelectOption value="">Chọn đúng vị trí hàng đang tới</NativeSelectOption>
        {state.selected && !items.some((item) => item.id === state.selected?.id) && (
          <NativeSelectOption value={state.selected.id}>
            {state.selected.displayPath}
          </NativeSelectOption>
        )}
        {items.map((item) => (
          <NativeSelectOption key={item.id} value={item.id}>
            {item.displayPath}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {state.query.isPending && <p role="status">Đang tải vị trí nhận hàng…</p>}
      {state.query.isError && (
        <div role="alert" className="text-destructive text-sm">
          Không thể tải vị trí nhận hàng.
          <Button type="button" variant="outline" onClick={() => void state.query.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {state.query.isSuccess && items.length === 0 && (
        <p>Không tìm thấy vị trí nào phù hợp với từ khóa hoặc bộ lọc hiện tại.</p>
      )}
      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || state.page <= 1 || state.query.isFetching}
            onClick={() => state.changePage(state.page - 1)}
          >
            Trước
          </Button>
          <span className="text-sm">
            Trang {state.page}/{pages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || state.page >= pages || state.query.isFetching}
            onClick={() => state.changePage(state.page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </Field>
  )
}
