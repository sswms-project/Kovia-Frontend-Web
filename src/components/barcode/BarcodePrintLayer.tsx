'use client'

import { createPortal } from 'react-dom'

interface BarcodePrintLayerProps {
  /** SVG do JsBarcode tạo ra (không chứa dữ liệu người dùng nhập), chèn nguyên văn vào nhãn in. */
  readonly svgMarkup: string
  readonly title: string
  /** Bỏ trống khi chính mã vạch đã in kèm giá trị. */
  readonly code?: string
}

/**
 * Nhãn để in, gắn thẳng vào body. In từ chính trang chi tiết dễ ra giấy trắng vì các khung cuộn của
 * layout cắt phần tử định vị tuyệt đối; lớp này luôn là con trực tiếp của body nên không bị cắt.
 * Chỉ hiện khi in (xem quy tắc data-barcode-print-root trong index.css).
 */
export function BarcodePrintLayer({ svgMarkup, title, code }: BarcodePrintLayerProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-barcode-print-root aria-hidden="true">
      <p data-barcode-print-title>{title}</p>
      <div data-barcode-print-bars dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      {code ? (
        <p data-barcode-print-code translate="no">
          {code}
        </p>
      ) : null}
    </div>,
    document.body
  )
}
