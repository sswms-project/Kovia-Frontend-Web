import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatOperationalDate,
  formatOperationalDateTime,
} from '@/features/inbound-request/utils/inbound-request-format'
import { goodsPreviewInteractions } from '@/features/inbound/utils/goods-preview-interactions'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  TransferFlagBadges,
  TransferProgressText,
  TransferStatusBadge,
} from './TransferStatusBadge'
import type { TransferListPartProps } from './TransferMobileList'

export function TransferDesktopTable({
  items,
  previewId,
  onPreview,
  renderRowActions,
}: TransferListPartProps) {
  return (
    <div data-slot="operational-list-body" className="hidden md:block">
      <Table className="min-w-[1280px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Mã yêu cầu</TableHead>
            <TableHead className="w-44">Ngày tạo</TableHead>
            <TableHead className="w-72">Kho xuất → Kho nhập</TableHead>
            <TableHead className="w-36">Hạn cần hàng</TableHead>
            <TableHead className="w-40">Trạng thái</TableHead>
            <TableHead className="w-36">Tình trạng thực hiện</TableHead>
            <TableHead className="w-64">Cần chú ý</TableHead>
            <TableHead className="w-40">Người tạo</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              {...goodsPreviewInteractions(() => onPreview(item), previewId === item.id)}
            >
              <TableCell className="font-mono font-semibold" translate="no">
                <Link
                  href={APP_ROUTES.transferDetail(item.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {item.transferCode}
                </Link>
              </TableCell>
              <TableCell>{formatOperationalDateTime(item.createdAt)}</TableCell>
              <TableCell className="whitespace-normal">
                {item.sourceWarehouseName} → {item.destinationWarehouseName}
              </TableCell>
              <TableCell>
                {item.requiredBy ? formatOperationalDate(item.requiredBy) : '—'}
              </TableCell>
              <TableCell>
                <TransferStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <TransferProgressText
                  dispatch={item.dispatchProgress}
                  receive={item.receiveProgress}
                />
              </TableCell>
              <TableCell>
                <TransferFlagBadges
                  hasOpenFeedback={item.hasOpenFeedback}
                  hasPendingPickEscalation={item.hasPendingPickEscalation}
                  hasOpenDiscrepancy={item.hasOpenDiscrepancy}
                />
              </TableCell>
              <TableCell className="truncate">{item.createdByName ?? '—'}</TableCell>
              <TableCell className="text-right" data-preview-ignore>
                {renderRowActions(item)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
