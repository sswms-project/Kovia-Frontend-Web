'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useStockIssueRequestsQuery } from '../../hooks/use-stock-issue-requests'
import { formatStockIssueDate } from '../../utils/stock-issue-format'

interface SelectStockIssueForReturnDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSelect: (stockIssueRequestId: string) => void
}

/** Bước đầu của việc lập yêu cầu trả hàng: chọn phiếu xuất đã xuất kho cần trả. */
export function SelectStockIssueForReturnDialog({
  open,
  onOpenChange,
  onSelect,
}: SelectStockIssueForReturnDialogProps) {
  const [searchText, setSearchText] = useState('')
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const ordersQuery = useStockIssueRequestsQuery(
    {
      pageNumber: 1,
      pageSize: 20,
      status: 'Dispatched',
      ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    },
    open
  )
  const orders = ordersQuery.data?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chọn phiếu xuất cần trả hàng</DialogTitle>
          <DialogDescription>
            Chỉ phiếu xuất đã xuất kho mới có thể tạo yêu cầu trả.
          </DialogDescription>
        </DialogHeader>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Tìm phiếu xuất"
            placeholder="Mã phiếu, người nhận…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </InputGroup>
        {ordersQuery.isLoading ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : ordersQuery.isError ? (
          <p className="text-destructive p-3 text-sm">Không thể tải danh sách phiếu xuất.</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">Không có phiếu xuất phù hợp.</p>
        ) : (
          <ul className="divide-y border">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  className="hover:bg-muted flex w-full flex-col gap-0.5 p-3 text-left"
                  onClick={() => onSelect(order.id)}
                >
                  <span className="font-mono text-sm font-medium">
                    {order.stockIssueRequestCode}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {order.stockRecipientName} · {formatStockIssueDate(order.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
