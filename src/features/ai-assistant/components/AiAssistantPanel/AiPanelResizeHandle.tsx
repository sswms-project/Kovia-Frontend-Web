'use client'

import { SidePanelResizeHandle } from '@/components/operations/SidePanelResizeHandle'
import { AI_PANEL_MIN_WIDTH } from '../../utils/ai-panel-layout'

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
