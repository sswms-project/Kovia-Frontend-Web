'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { SlotOption } from './PutawayForm'

interface PutawayLocationSelectProps {
  readonly id: string
  readonly value: string
  readonly slots: readonly SlotOption[]
  readonly invalid: boolean
  readonly disabled: boolean
  /** Bảng nhiều dòng: sức chứa hiện ngay trong ô chọn thay vì thêm một hàng chữ bên dưới. */
  readonly compact?: boolean
  readonly onChange: (slotId: string) => void
}

function locationLabel(slot: SlotOption) {
  return slot.name && slot.name !== slot.code ? `${slot.code} - ${slot.name}` : slot.code
}

function capacityLabel(slot: SlotOption) {
  return slot.capacityLabel
}

export function PutawayLocationSelect({
  id,
  value,
  slots,
  invalid,
  disabled,
  compact = false,
  onChange,
}: PutawayLocationSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = slots.find((slot) => slot.id === value)
  const groups = Map.groupBy(slots, (slot) => slot.zoneId)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-label={selected ? `Vị trí lưu trữ: ${locationLabel(selected)}` : 'Vị trí lưu trữ'}
            aria-expanded={open}
            aria-controls={open ? `${id}-popup` : undefined}
            aria-haspopup="dialog"
            aria-invalid={invalid}
            aria-describedby={
              [selected ? `${id}-description` : '', invalid ? `${id}-error` : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            disabled={disabled || slots.length === 0}
            className="bg-card w-full min-w-0 justify-between gap-2 font-normal"
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected
                ? locationLabel(selected)
                : slots.length > 0
                  ? 'Chọn kệ hoặc tìm vị trí...'
                  : 'Không có vị trí khả dụng'}
            </span>
            {compact && selected ? (
              <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                {capacityLabel(selected)}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                open && 'rotate-180'
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          id={`${id}-popup`}
          aria-label="Chọn vị trí lưu trữ"
          align="start"
          sideOffset={4}
          className="bg-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 animation-duration-200 w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] overflow-hidden p-0 motion-reduce:animate-none"
        >
          <Command
            label="Tìm vị trí lưu trữ"
            className="bg-card [&_[data-slot=input-group]]:h-10"
            defaultValue={value}
          >
            <CommandInput
              aria-label="Tìm vị trí lưu trữ"
              placeholder="Tìm mã kệ, tên kệ hoặc khu vực..."
              className="h-10"
            />
            <CommandList
              aria-label="Vị trí khả dụng"
              className="max-h-[min(22rem,calc(var(--radix-popover-content-available-height)-3rem))]"
            >
              <CommandEmpty>Không tìm thấy vị trí phù hợp.</CommandEmpty>
              {Array.from(groups, ([zoneId, locations]) => (
                <CommandGroup
                  key={zoneId}
                  heading={locations[0]?.zoneLabel}
                  className="[&_[cmdk-group-heading]]:bg-muted/50 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-medium"
                >
                  {locations.map((slot) => (
                    <CommandItem
                      key={slot.id}
                      value={slot.id}
                      keywords={[slot.code, slot.name, slot.hierarchy, slot.zoneLabel]}
                      data-checked={slot.id === value}
                      disabled={Boolean(slot.unavailableReason)}
                      className="data-[selected=true]:bg-accent data-[checked=true]:bg-accent/60 items-start gap-2 px-3 py-3"
                      onSelect={() => {
                        onChange(slot.id)
                        setOpen(false)
                      }}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="font-medium break-words">{locationLabel(slot)}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {slot.unavailableReason ?? capacityLabel(slot)}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {slot.hierarchy !== slot.zoneLabel ? `${slot.hierarchy} · ` : ''}
                          {slot.allowsMixedProducts === undefined
                            ? 'Vị trí lưu trữ'
                            : slot.allowsMixedProducts
                              ? 'Cho phép nhiều sản phẩm'
                              : 'Chỉ chứa một sản phẩm'}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected ? (
        <p
          id={`${id}-description`}
          className={compact ? 'sr-only' : 'text-muted-foreground text-xs'}
        >
          {selected.hierarchy} · {capacityLabel(selected)}
        </p>
      ) : null}
    </>
  )
}
