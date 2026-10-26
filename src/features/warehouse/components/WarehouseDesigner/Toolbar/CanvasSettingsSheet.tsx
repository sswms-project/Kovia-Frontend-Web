'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  warehouseLayoutCanvasSchema,
  type WarehouseLayoutCanvasFormValues,
} from '../../../schemas/warehouse-layout-scene.schema'
import type { WarehouseLayoutCanvas } from '../../../types/warehouse-layout-scene.types'
import { CanvasNumberField } from './CanvasNumberField'

export function CanvasSettingsSheet({
  canvas,
  disabled,
  onSubmit,
}: {
  readonly canvas: WarehouseLayoutCanvas
  readonly disabled: boolean
  readonly onSubmit: (canvas: WarehouseLayoutCanvas) => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<WarehouseLayoutCanvasFormValues>({
    resolver: zodResolver(warehouseLayoutCanvasSchema),
    values: canvas,
  })
  const { errors } = form.formState

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Cài đặt nền"
              disabled={disabled}
            >
              <Settings2 aria-hidden="true" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Cài đặt nền</TooltipContent>
      </Tooltip>
      <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Cài đặt nền</SheetTitle>
          <SheetDescription>Đặt kích thước cố định và bước lưới của mặt bằng kho.</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            if (disabled) return
            onSubmit(values)
            setOpen(false)
          })}
        >
          <FieldGroup className="p-4">
            <CanvasNumberField
              id="canvas-width"
              label="Chiều rộng mặt bằng"
              error={errors.width}
              registration={form.register('width', { valueAsNumber: true })}
            />
            <CanvasNumberField
              id="canvas-height"
              label="Chiều cao mặt bằng"
              error={errors.height}
              registration={form.register('height', { valueAsNumber: true })}
            />
            <CanvasNumberField
              id="canvas-grid-size"
              label="Bước lưới"
              error={errors.gridSize}
              registration={form.register('gridSize', { valueAsNumber: true })}
            />
          </FieldGroup>
          <SheetFooter>
            <Button type="submit" disabled={disabled}>
              <Check data-icon="inline-start" aria-hidden="true" />
              Áp dụng
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
