'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WarehouseLocationMapContent } from './WarehouseLocationMapContent'

interface WarehouseLocationMapButtonProps {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly slotId: string
  readonly locationLabel: string
  readonly productLabel: string
  /** Includes user/tenant and effective permission revision; never reuse a previous session. */
  readonly accessScope: string
  readonly sourceVersion: string
  readonly canView: boolean
  readonly ready: boolean
  readonly onOpen?: () => void
}

export function WarehouseLocationMapButton(props: WarehouseLocationMapButtonProps) {
  if (!props.canView || !props.warehouseId || !props.slotId) return null
  return (
    <LocationMapSession
      key={JSON.stringify([
        props.accessScope,
        props.warehouseId,
        props.slotId,
        props.sourceVersion,
        props.ready,
      ])}
      {...props}
    />
  )
}

function LocationMapSession(props: WarehouseLocationMapButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog
      open={open && props.ready}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) props.onOpen?.()
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-10 w-fit sm:h-8"
          disabled={!props.ready}
          aria-label={`Xem sơ đồ vị trí ${props.locationLabel}`}
        >
          <MapPin aria-hidden="true" /> Xem sơ đồ
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90dvh] max-h-dvh flex-col gap-3 sm:max-w-5xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Vị trí hàng trên sơ đồ</DialogTitle>
          <DialogDescription className="break-words">
            {props.productLabel} · {props.warehouseName} / {props.locationLabel}
          </DialogDescription>
        </DialogHeader>
        {open && props.ready && <WarehouseLocationMapContent {...props} />}
      </DialogContent>
    </Dialog>
  )
}
