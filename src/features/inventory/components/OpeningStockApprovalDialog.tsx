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
import type { OpeningStockRecord } from '../types/inventory.types'
import { formatEligibilityStatus } from '../utils/inventory-format'

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
    item && (item.createdByUserId === currentUserId || item.submittedByUserId === currentUserId)
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Duyệt và ghi sổ {item?.code}</DialogTitle>
          <DialogDescription>
            Kiểm tra ngày ghi nhận, thông tin lô và số lượng. Duyệt sẽ ghi tăng tồn kho một lần.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <>
            <p>
              Kho: {item.warehouseName} · Ngày ghi nhận:{' '}
              {item.effectiveDate ?? 'Theo ngày ghi sổ cũ'}
            </p>
            <div className="divide-y border">
              {item.lines.map((line) => (
                <div key={line.id} className="p-3 text-sm wrap-anywhere">
                  <p>
                    {line.sku} · {line.productName} · {line.slotCode}
                  </p>
                  <p>
                    {line.quantity} {line.enteredUnitName} ·{' '}
                    {line.qualityStatus === 'Good' ? 'Hàng tốt' : 'Hàng hỏng'} ·{' '}
                    {formatEligibilityStatus(line.eligibilityStatus)}
                  </p>
                  <p>
                    Lô: {line.lotNumberSnapshot ?? line.lotNumber ?? 'Không theo lô'} · NSX:{' '}
                    {line.manufacturedDateSnapshot ?? '—'} · HSD: {line.expiryDateSnapshot ?? '—'}
                  </p>
                  {!line.lotId && line.lotNumberSnapshot ? (
                    <p className="text-primary">Sẽ tạo lô khi duyệt</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
        {maker ? (
          <label className="flex min-h-11 items-center gap-3 text-sm">
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
        <DialogFooter>
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
