import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ACTIVE_ALERT_FILTER, ALERT_SEVERITIES, ALERT_STATUSES } from '../../types/ai-alerts.types'
import { ALERT_STATUS_LABELS, SEVERITY_LABELS } from '../../utils/ai-alerts-format'

export interface AlertFilterValues {
  readonly status: string
  readonly severity: string
  readonly warehouseId: string
  readonly alertType: string
}

export interface FilterOption {
  readonly value: string
  readonly label: string
}

interface AlertFiltersProps {
  readonly filters: AlertFilterValues
  readonly warehouseOptions: readonly FilterOption[]
  readonly typeOptions: readonly FilterOption[]
  readonly onChange: (key: keyof AlertFilterValues, value: string) => void
}

export function AlertFilters({
  filters,
  warehouseOptions,
  typeOptions,
  onChange,
}: AlertFiltersProps) {
  const statusOptions = [
    { value: ACTIVE_ALERT_FILTER, label: 'Đang mở (chưa tự đóng)' },
    ...ALERT_STATUSES.map((value) => ({ value, label: ALERT_STATUS_LABELS[value] })),
  ]
  const severityOptions = ALERT_SEVERITIES.map((value) => ({
    value,
    label: SEVERITY_LABELS[value],
  }))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="Lọc theo trạng thái"
        allLabel="Mọi trạng thái"
        value={filters.status}
        options={statusOptions}
        onChange={(value) => onChange('status', value)}
      />
      <FilterSelect
        label="Lọc theo mức độ"
        allLabel="Mọi mức độ"
        value={filters.severity}
        options={severityOptions}
        onChange={(value) => onChange('severity', value)}
      />
      {warehouseOptions.length > 0 ? (
        <FilterSelect
          label="Lọc theo kho"
          allLabel="Mọi kho"
          value={filters.warehouseId}
          options={warehouseOptions}
          onChange={(value) => onChange('warehouseId', value)}
        />
      ) : null}
      {typeOptions.length > 0 ? (
        <FilterSelect
          label="Lọc theo loại cảnh báo"
          allLabel="Mọi loại"
          value={filters.alertType}
          options={typeOptions}
          onChange={(value) => onChange('alertType', value)}
        />
      ) : null}
    </div>
  )
}

function FilterSelect(props: {
  readonly label: string
  readonly allLabel: string
  readonly value: string
  readonly options: readonly FilterOption[]
  readonly onChange: (value: string) => void
}) {
  return (
    <NativeSelect
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      className="min-w-0 basis-[calc(50%-0.25rem)] @xl:basis-auto"
    >
      <NativeSelectOption value="">{props.allLabel}</NativeSelectOption>
      {props.options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
