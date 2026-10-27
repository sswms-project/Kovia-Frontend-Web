'use client'

import type { ReactNode } from 'react'
import { OperationalMasterDetail } from './OperationalMasterDetail'

export interface ReturnGoodsWorkspaceState {
  readonly selectedId: string
  readonly onSelect: (id: string, open?: boolean) => void
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
  readonly detailId: string
  readonly detail: ReactNode
}

export function ReturnGoodsWorkspace({
  preview,
  children,
}: {
  readonly preview?: ReturnGoodsWorkspaceState
  readonly children: ReactNode
}) {
  if (!preview) return children
  return (
    <OperationalMasterDetail
      expanded={preview.expanded}
      onExpandedChange={preview.onExpandedChange}
      detailId={preview.detailId}
      detailLabel="chi tiết hàng hóa trả lại"
      detail={preview.detail}
    >
      {children}
    </OperationalMasterDetail>
  )
}
