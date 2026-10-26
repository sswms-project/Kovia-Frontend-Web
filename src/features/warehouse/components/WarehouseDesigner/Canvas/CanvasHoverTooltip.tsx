'use client'

import { useImperativeHandle, useState, type Ref } from 'react'

export interface CanvasHoverInfo {
  readonly code: string
  readonly name: string
  readonly left: number
  readonly top: number
}

export interface CanvasHoverTooltipHandle {
  show: (info: CanvasHoverInfo) => void
  hide: () => void
}

/**
 * Giữ state hover ở đây thay vì ở canvas: mỗi lần rê chuột chỉ dựng lại tooltip,
 * không dựng lại toàn bộ kệ, ô và trang trí của sơ đồ.
 */
export function CanvasHoverTooltip({
  ref,
  suppressed,
}: {
  readonly ref?: Ref<CanvasHoverTooltipHandle>
  readonly suppressed: boolean
}) {
  const [info, setInfo] = useState<CanvasHoverInfo | null>(null)
  useImperativeHandle(ref, () => ({ show: setInfo, hide: () => setInfo(null) }), [])

  if (!info || suppressed) return null
  return (
    <div
      role="tooltip"
      className="bg-popover text-popover-foreground pointer-events-none fixed z-50 max-w-56 rounded-md border px-3 py-2 text-xs break-words shadow-sm"
      style={{ left: info.left, top: info.top }}
    >
      <p>
        <span className="text-muted-foreground">Mã vị trí: </span>
        <span translate="no" className="font-mono break-all">
          {info.code}
        </span>
      </p>
      <p className="mt-1 break-words">
        <span className="text-muted-foreground">Tên vị trí: </span>
        {info.name}
      </p>
    </div>
  )
}
