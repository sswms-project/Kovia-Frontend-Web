import { Button } from '@/components/ui/button'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { useReceivingLocationSelection } from '../../hooks/use-receiving-location-selection'

interface ReceivingLocationPickerProps {
  readonly state: ReturnType<typeof useReceivingLocationSelection>
  readonly disabled?: boolean
}
export function ReceivingLocationPicker({ state, disabled }: ReceivingLocationPickerProps) {
  const fieldId = useId()
  const label = state.forDamageIsolation
    ? 'Vị trí cách biệt hàng hỏng'
    : 'Vị trí tại khu chờ cất hàng'
  const items = state.query.isSuccess ? state.query.data.items : []
  const pages = Math.max(1, Math.ceil((state.query.data?.totalCount ?? 0) / 20))
  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <p className="text-muted-foreground text-sm">
        {state.forDamageIsolation
          ? 'Chọn vị trí riêng để cách biệt hàng hỏng, không đặt chung với hàng đạt hoặc chờ kiểm.'
          : 'Chọn nơi hàng đang đặt. Hàng được ghi nhận ở trạng thái chờ kiểm duyệt, sau đó mới cất vào vị trí lưu trữ.'}
      </p>
      <Input
        aria-label="Tìm vị trí nhận hàng"
        value={state.search}
        maxLength={100}
        disabled={disabled}
        placeholder="Tìm mã hoặc tên khu vực, kệ, vị trí…"
        autoComplete="off"
        onChange={(event) => state.searchFor(event.target.value)}
      />
      <NativeSelect
        id={fieldId}
        aria-label={label}
        value={state.selected?.id ?? ''}
        disabled={disabled || state.isSearching || state.query.isFetching || state.query.isError}
        onChange={(event) => state.choose(event.target.value)}
      >
        <NativeSelectOption value="">Chọn vị trí hàng đang đặt</NativeSelectOption>
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
      {(state.isSearching || state.query.isFetching) && (
        <p role="status">Đang tải vị trí nhận hàng…</p>
      )}
      {state.query.isError && (
        <div role="alert" className="text-destructive text-sm">
          Không thể tải vị trí nhận hàng.
          <Button type="button" variant="outline" onClick={() => void state.query.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {!state.isSearching &&
        !state.query.isFetching &&
        state.query.isSuccess &&
        items.length === 0 && (
          <p>Không tìm thấy vị trí nào phù hợp với từ khóa hoặc bộ lọc hiện tại.</p>
        )}
      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || state.isSearching || state.page <= 1 || state.query.isFetching}
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
            disabled={
              disabled || state.isSearching || state.page >= pages || state.query.isFetching
            }
            onClick={() => state.changePage(state.page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </Field>
  )
}
