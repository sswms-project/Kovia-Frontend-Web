import { useState } from 'react'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'

interface ReportFilterSelectProps {
  readonly label: string
  readonly value: string
  readonly options: readonly LookupOption[]
  readonly emptyLabel: string
  readonly isInvalid?: boolean
  readonly onChange: (value: string) => void
}

export function ReportFilterSelect({
  label,
  value,
  options,
  emptyLabel,
  isInvalid = false,
  onChange,
}: ReportFilterSelectProps) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase('vi')
  const choices = [{ value: '', label: emptyLabel }, ...options]

  return (
    <LookupCombobox
      ariaLabel={label}
      value={value}
      options={choices.filter((option) => option.label.toLocaleLowerCase('vi').includes(query))}
      selectedOption={choices.find((option) => option.value === value)}
      placeholder={emptyLabel}
      emptyMessage="Không tìm thấy lựa chọn phù hợp."
      isLoading={false}
      isInvalid={isInvalid}
      onChange={onChange}
      onSearchChange={setSearch}
    />
  )
}
