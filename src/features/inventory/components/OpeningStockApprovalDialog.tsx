'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OpeningStockRecord } from '../types/inventory.types'
import {
  formatEligibilityStatus,
  formatInventoryQuantity,
  formatQualityStatus,
} from '../utils/inventory-format'

export function OpeningStockApprovalDialog({
  item,
  currentUserId,
  pending,
  onClose,
  onConfirm,
}: {
  readonly item: OpeningStockRecord | null
  readonly currentUserId: string | null
  readonly pending: boolean
  readonly onClose: () => void
  readonly onConfirm: (selfApproval: boolean) => Promise<void>
}) {
  const lock = useRef(false)
  const [acknowledgedId, setAcknowledgedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const maker = Boolean(
    item &&
    currentUserId &&
    (item.createdByUserId === currentUserId || item.submittedByUserId === currentUserId)
  )
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setAcknowledgedId(null)
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Duyệt và ghi sổ {item?.code}</DialogTitle>
          <DialogDescription>
            Kiểm tra ngày ghi nhận, thông tin lô và số lượng. Duyệt sẽ ghi tăng tồn kho một lần.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <>
            <p className="shrink-0">
              Kho: {item.warehouseName} · Ngày ghi nhận:{' '}
              {item.effectiveDate ?? 'Theo ngày ghi sổ cũ'}
            </p>
            <OperationalListPanel aria-label="Dòng hàng chờ duyệt tồn đầu" className="min-h-40">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Tên hàng</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead className="text-right">Số lượng nhập</TableHead>
                    <TableHead>ĐVT</TableHead>
                    <TableHead className="text-right">SL ĐVT chính</TableHead>
                    <TableHead>Lô</TableHead>
                    <TableHead>Ngày sản xuất</TableHead>
                    <TableHead>Hạn sử dụng</TableHead>
                    <TableHead>Tình trạng</TableHead>
                    <TableHead>Điều kiện sử dụng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono">{line.sku}</TableCell>
                      <TableCell className="min-w-40 whitespace-normal">
                        {line.productName}
                      </TableCell>
                      <TableCell>{line.slotCode}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInventoryQuantity(line.enteredQuantity)}
                      </TableCell>
                      <TableCell>{line.enteredUnitName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInventoryQuantity(line.baseQuantity)}
                      </TableCell>
                      <TableCell>
                        {line.lotNumberSnapshot ?? line.lotNumber ?? 'Không theo lô'}
                        {!line.lotId && line.lotNumberSnapshot ? (
                          <p className="text-primary text-xs">Sẽ tạo lô khi duyệt</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{line.manufacturedDateSnapshot ?? '—'}</TableCell>
                      <TableCell>{line.expiryDateSnapshot ?? '—'}</TableCell>
                      <TableCell>{formatQualityStatus(line.qualityStatus)}</TableCell>
                      <TableCell>{formatEligibilityStatus(line.eligibilityStatus)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </OperationalListPanel>
          </>
        ) : null}
        {maker ? (
          <label className="flex min-h-11 shrink-0 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={acknowledgedId === item?.id}
              disabled={pending}
              onChange={(event) =>
                setAcknowledgedId(event.target.checked ? (item?.id ?? null) : null)
              }
            />
            Tôi xác nhận tự duyệt phiếu do chính mình lập hoặc gửi.
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setAcknowledgedId(null)
              onClose()
            }}
          >
            Quay lại
          </Button>
          <Button
            disabled={pending || !item || (maker && acknowledgedId !== item.id)}
            onClick={async () => {
              if (lock.current) return
              lock.current = true
              try {
                await onConfirm(maker)
                setAcknowledgedId(null)
              } catch {
                setError(
                  'Không thể duyệt phiếu. Vui lòng đối chiếu thông báo và tải lại nếu dữ liệu đã thay đổi.'
                )
              } finally {
                lock.current = false
              }
            }}
          >
            {pending ? 'Đang ghi sổ…' : 'Xác nhận duyệt & ghi sổ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
