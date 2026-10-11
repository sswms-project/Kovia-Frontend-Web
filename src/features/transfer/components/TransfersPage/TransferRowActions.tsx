import { Eye, MoreHorizontal, PencilLine } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferSummary } from '../../types/transfer.types'

interface TransferRowActionsProps {
  readonly transfer: TransferSummary
  readonly canOpenDraft: boolean
}

export function TransferRowActions({ transfer, canOpenDraft }: TransferRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Thao tác với phiếu ${transfer.transferCode}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={APP_ROUTES.transferDetail(transfer.id)}>
            <Eye className="size-4" aria-hidden="true" />
            Xem chi tiết
          </Link>
        </DropdownMenuItem>
        {canOpenDraft ? (
          <DropdownMenuItem asChild>
            <Link href={APP_ROUTES.transferEdit(transfer.id)}>
              <PencilLine className="size-4" aria-hidden="true" />
              Soạn tiếp nháp
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
