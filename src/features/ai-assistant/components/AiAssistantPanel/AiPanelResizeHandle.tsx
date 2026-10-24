'use client'

import {
  SidePanelResizeHandle,
  clampSidePanelWidth,
} from '@/components/operations/SidePanelResizeHandle'

export const AI_PANEL_MIN_WIDTH = 340

/** Luôn chừa đủ bề rộng cho trang nằm cạnh khung để người dùng còn thao tác được. */
export function clampAiPanelWidth(width: number) {
  return clampSidePanelWidth(width, AI_PANEL_MIN_WIDTH)
}

interface AiPanelResizeHandleProps {
  readonly width: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
}

/** Mép trái của khung trợ lý: kéo (hoặc dùng phím mũi tên) để nới rộng / thu hẹp. */
export function AiPanelResizeHandle(props: AiPanelResizeHandleProps) {
  return (
    <SidePanelResizeHandle
      {...props}
      minWidth={AI_PANEL_MIN_WIDTH}
      label="Kéo để đổi bề rộng khung trợ lý"
    />
  )
}
