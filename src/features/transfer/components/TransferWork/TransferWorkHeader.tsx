import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferShipmentStatus } from '../../types/transfer.types'
import { ShipmentStatusBadge } from '../TransfersPage'

interface TransferWorkHeaderProps {
  readonly heading: string
  readonly transferId: string
  readonly transferCode: string
  readonly shipmentNumber: number
  readonly shipmentStatus: TransferShipmentStatus
  readonly route: string
}

export function TransferWorkHeader({
  heading,
  transferId,
  transferCode,
  shipmentNumber,
  shipmentStatus,
  route,
}: TransferWorkHeaderProps) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b pb-3">
      <Button asChild variant="outline" size="icon" className="size-11">
        <Link href={APP_ROUTES.transferDetail(transferId)} aria-label="Xem phiếu điều chuyển">
          <ArrowLeft aria-hidden="true" />
        </Link>
      </Button>
      <div className="min-w-0">
        <p className="text-primary text-xs font-medium">{heading}</p>
        <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          <span className="font-mono" translate="no">
            {transferCode}
          </span>
          <span>· Đợt {shipmentNumber}</span>
          <ShipmentStatusBadge status={shipmentStatus} />
        </h1>
        <p className="text-muted-foreground text-xs">{route}</p>
      </div>
    </header>
  )
}
