'use client'

import { Download, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useCreateStockIssueRequestMutation,
  useStockIssueImportPreviewMutation,
} from '../../hooks/use-stock-issue-requests'
import { stockIssueService } from '../../services/stock-issue.service'
import type { StockIssueImportPreviewRow } from '../../types/stock-issue.types'

interface TicketGroup {
  key: string
  warehouseId: string
  warehouseName: string
  stockRecipientId: string
  recipientName: string
  referenceCode: string | null
  purpose: string | null
  items: { productId: string; quantity: number }[]
}

function groupRows(rows: StockIssueImportPreviewRow[]): TicketGroup[] {
  const groups = new Map<string, TicketGroup>()
  for (const row of rows) {
    if (!row.warehouseId || !row.stockRecipientId || !row.productId || !row.quantity) continue
    const key = `${row.warehouseId}|${row.stockRecipientId}|${row.referenceCode ?? ''}`
    const group = groups.get(key) ?? {
      key,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName ?? '',
      stockRecipientId: row.stockRecipientId,
      recipientName: row.recipientName ?? '',
      referenceCode: row.referenceCode,
      purpose: row.purpose,
      items: [],
    }
    group.purpose ??= row.purpose
    group.items.push({ productId: row.productId, quantity: row.quantity })
    groups.set(key, group)
  }
  return [...groups.values()]
}

interface StockIssueImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockIssueImportDialog({ open, onOpenChange }: StockIssueImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<StockIssueImportPreviewRow[] | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const preview = useStockIssueImportPreviewMutation()
  const createOrder = useCreateStockIssueRequestMutation()

  const errorRows = useMemo(() => (rows ?? []).filter((row) => row.errors.length > 0), [rows])
  const groups = useMemo(
    () => groupRows((rows ?? []).filter((row) => row.errors.length === 0)),
    [rows]
  )
  const hasErrors = errorRows.length > 0

  function close(next: boolean) {
    if (isCreating) return
    if (!next) {
      setRows(null)
      setResults({})
    }
    onOpenChange(next)
  }

  async function onFileChange(file: File | undefined) {
    if (!file) return
    setResults({})
    try {
      const response = await preview.mutateAsync(file)
      setRows(response.data.rows)
    } catch (error) {
      setRows(null)
      toast.error(getApiErrorMessage(error, 'Không thể đọc tệp nhập.'))
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function downloadTemplate() {
    try {
      await stockIssueService.downloadImportTemplate()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp mẫu.'))
    }
  }

  async function createAll() {
    setIsCreating(true)
    const next: Record<string, string> = {}
    for (const group of groups) {
      if (results[group.key] === 'ok') {
        next[group.key] = 'ok'
        continue
      }
      try {
        await createOrder.mutateAsync({
          stockRecipientId: group.stockRecipientId,
          warehouseId: group.warehouseId,
          purpose: group.purpose,
          referenceCode: group.referenceCode,
          items: group.items,
        })
        next[group.key] = 'ok'
      } catch (error) {
        next[group.key] = getApiErrorMessage(error, 'Không thể tạo phiếu.')
      }
      setResults({ ...next })
    }
    setIsCreating(false)
    const failed = Object.values(next).filter((value) => value !== 'ok').length
    if (failed === 0) {
      toast.success(`Đã tạo ${groups.length} phiếu xuất kho.`)
      close(false)
    } else {
      toast.error(`${failed}/${groups.length} phiếu tạo thất bại. Xem chi tiết trong hộp thoại.`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập phiếu xuất kho từ Excel</DialogTitle>
          <DialogDescription>
            Mỗi dòng là một mặt hàng. Các dòng cùng kho, đơn vị nhận và tham chiếu được gộp thành
            một phiếu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
            <Download aria-hidden="true" />
            Tải tệp mẫu
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={preview.isPending || isCreating}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            {preview.isPending ? 'Đang đọc…' : 'Chọn tệp .xlsx / .csv'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="sr-only"
            aria-label="Chọn tệp nhập phiếu xuất kho"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
        </div>
        {rows ? (
          <div className="max-h-80 space-y-3 overflow-y-auto text-sm">
            <p>
              <span className="font-medium">{rows.length}</span> dòng ·{' '}
              <span className="font-medium">{groups.length}</span> phiếu hợp lệ ·{' '}
              <span className={hasErrors ? 'text-destructive font-medium' : ''}>
                {errorRows.length} dòng lỗi
              </span>
            </p>
            {hasErrors ? (
              <ul className="border-destructive/40 space-y-1 border p-2 text-xs">
                {errorRows.map((row) => (
                  <li key={row.rowNumber}>
                    <span className="font-medium">Dòng {row.rowNumber}:</span>{' '}
                    {row.errors.join(' ')}
                  </li>
                ))}
              </ul>
            ) : null}
            {groups.length > 0 ? (
              <ul className="divide-y border">
                {groups.map((group) => {
                  const result = results[group.key]
                  return (
                    <li key={group.key} className="flex items-start justify-between gap-2 p-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {group.recipientName} · {group.warehouseName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {group.referenceCode ? `Tham chiếu ${group.referenceCode} · ` : ''}
                          {group.items.length} mặt hàng
                        </p>
                        {result && result !== 'ok' ? (
                          <p className="text-destructive text-xs">{result}</p>
                        ) : null}
                      </div>
                      {result === 'ok' ? (
                        <span className="text-xs font-medium text-green-600">Đã tạo</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isCreating}
            onClick={() => close(false)}
          >
            Đóng
          </Button>
          <Button
            type="button"
            disabled={isCreating || hasErrors || groups.length === 0}
            onClick={() => void createAll()}
          >
            {isCreating ? 'Đang tạo…' : `Tạo ${groups.length} phiếu`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
