'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Spinner } from '@/components/ui/spinner'
import type { LookupOption } from '../../types/inbound-request.types'

export type { LookupOption }

interface LookupComboboxProps {
  readonly id?: string
  readonly value: string
  readonly options: readonly LookupOption[]
  readonly selectedOption?: LookupOption
  readonly placeholder: string
  readonly emptyMessage: string
  readonly ariaLabel: string
  readonly isLoading: boolean
  readonly isInvalid: boolean
  readonly disabled?: boolean
  readonly onChange: (value: string, option?: LookupOption) => void
  readonly onSearchChange: (value: string) => void
  /** Hành động đặt cuối danh sách thả xuống (ví dụ mở sơ đồ kho để chọn vị trí); bấm vào sẽ đóng danh sách. */
  readonly footerAction?: {
    readonly label: string
    readonly icon?: ReactNode
    readonly onClick: () => void
  }
}

export function LookupCombobox({
  id,
  value,
  options,
  selectedOption,
  placeholder,
  emptyMessage,
  ariaLabel,
  isLoading,
  isInvalid,
  disabled = false,
  onChange,
  onSearchChange,
  footerAction,
}: LookupComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null)
  const [rememberedOption, setRememberedOption] = useState<LookupOption | undefined>(
    () => selectedOption ?? options.find((option) => option.value === value)
  )
  const resolvedSelectedOption = value
    ? (options.find((option) => option.value === value) ??
      (selectedOption?.value === value ? selectedOption : undefined) ??
      (rememberedOption?.value === value ? rememberedOption : undefined))
    : undefined
  const optionLabels = useMemo(() => {
    const labels = new Map(options.map((option) => [option.value, option.label]))
    if (resolvedSelectedOption && !labels.has(resolvedSelectedOption.value)) {
      labels.set(resolvedSelectedOption.value, resolvedSelectedOption.label)
    }
    return labels
  }, [options, resolvedSelectedOption])
  const descriptions = useMemo(
    () => new Map(options.map((option) => [option.value, option.description])),
    [options]
  )
  const itemValues = useMemo(() => Array.from(optionLabels.keys()), [optionLabels])
  const filteredItemValues = useMemo(() => options.map((option) => option.value), [options])

  return (
    <Combobox
      items={itemValues}
      filteredItems={filteredItemValues}
      value={value || null}
      filter={null}
      itemToStringLabel={(itemValue: string) => optionLabels.get(itemValue) ?? itemValue}
      onValueChange={(nextValue, details) => {
        const nextOption = nextValue
          ? options.find((option) => option.value === nextValue)
          : undefined
        setRememberedOption(nextOption)
        onChange(nextValue ?? '', nextOption)
        if (details.reason === 'item-press' || details.reason === 'clear-press') {
          onSearchChange('')
        }
      }}
      onInputValueChange={(nextSearchValue, details) => {
        if (details.reason === 'input-change') onSearchChange(nextSearchValue)
      }}
      open={isOpen}
      onOpenChange={(open) => {
        // Keep the popup inside the modal's scroll boundary without unlocking the page.
        if (open)
          setPopupContainer(inputRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null)
        setIsOpen(open)
        if (!open) onSearchChange('')
      }}
    >
      <ComboboxInput
        ref={inputRef}
        id={id}
        className="w-full"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        disabled={disabled}
        showClear={Boolean(value) && !disabled}
      />
      <ComboboxContent sideOffset={4} align="start" container={popupContainer ?? undefined}>
        <ComboboxList
          data-scrollbar="slim"
          className="supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] [&::-webkit-scrollbar]:block"
        >
          <ComboboxGroup>
            {filteredItemValues.map((itemValue) => (
              <ComboboxItem key={itemValue} value={itemValue}>
                <span className="flex min-w-0 flex-col">
                  <span>{optionLabels.get(itemValue)}</span>
                  {descriptions.get(itemValue) ? (
                    <span className="text-muted-foreground text-xs">
                      {descriptions.get(itemValue)}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxGroup>
          <ComboboxEmpty>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Đang tìm kiếm
              </span>
            ) : (
              emptyMessage
            )}
          </ComboboxEmpty>
        </ComboboxList>
        {footerAction ? (
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setIsOpen(false)
                onSearchChange('')
                footerAction.onClick()
              }}
            >
              {footerAction.icon}
              {footerAction.label}
            </Button>
          </div>
        ) : null}
      </ComboboxContent>
    </Combobox>
  )
}
