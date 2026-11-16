'use client'

import { SidePanelResizeHandle } from '@/components/operations/SidePanelResizeHandle'

interface AiPanelResizeHandleProps {
  readonly width: number
  /** Giới hạn do bố cục tính từ chỗ còn lại cạnh thanh bên; kéo hay phím mũi tên đều không vượt qua. */
  readonly minWidth: number
  readonly maxWidth: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
}

/** Mép trái của khung trợ lý: kéo (hoặc dùng phím mũi tên) để nới rộng / thu hẹp. */
export function AiPanelResizeHandle(props: AiPanelResizeHandleProps) {
  return <SidePanelResizeHandle {...props} label="Kéo để đổi bề rộng khung trợ lý" />
}
