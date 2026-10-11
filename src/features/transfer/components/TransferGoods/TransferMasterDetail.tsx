'use client'

import { useId, type ReactNode } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalMasterDetail } from '@/components/operations/OperationalMasterDetail'

export const TRANSFER_DETAIL_STORAGE_KEY = 'transfer-goods-detail:v1'

interface TransferMasterDetailProps {
  readonly children: ReactNode
  readonly detail: ReactNode
  readonly referenceCode?: string
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

/** Cùng bố cục danh sách + chi tiết hàng hóa của trang Nhập kho, tách bảng riêng cho điều chuyển. */
export function TransferMasterDetail({
  children,
  detail,
  referenceCode,
  expanded,
  onExpandedChange,
}: TransferMasterDetailProps) {
  const detailId = useId()
  return (
    <OperationalMasterDetail
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      detailId={detailId}
      detail={
        <OperationalListPanel id={detailId} aria-label="Chi tiết hàng hóa" hidden={!expanded}>
          <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2">
            <h2 className="text-sm font-semibold">Chi tiết hàng hóa</h2>
            {referenceCode ? (
              <span className="text-muted-foreground font-mono text-xs">{referenceCode}</span>
            ) : null}
          </header>
          {detail}
        </OperationalListPanel>
      }
    >
      {children}
    </OperationalMasterDetail>
  )
}
