'use client'

import { useRef, useState, type ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

export function PdfExportButton({
  prepare,
  disabled = false,
}: {
  prepare: (fontFamily: string) => Promise<{
    document: ReactElement<DocumentProps>
    fileName: string
    draft: boolean
  }>
  disabled?: boolean
}) {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={async () => {
        if (busy.current) return
        busy.current = true
        setPending(true)
        let releaseFont: (() => void) | undefined
        try {
          const [{ pdf, Font }, { createPdfFontFamily }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('./WarehousePdf'),
          ])
          const fontFamily = createPdfFontFamily()
          releaseFont = () => {
            delete Font.getRegisteredFonts()[fontFamily]
          }
          const snapshot = await prepare(fontFamily)
          const blob = await pdf(snapshot.document).toBlob()
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = snapshot.fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
          document.body.appendChild(anchor)
          try {
            anchor.click()
          } finally {
            anchor.remove()
            window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          }
          if (snapshot.draft) toast.info('Đã tải bản nháp, chưa phải chứng từ hoàn tất.')
        } catch (error) {
          logger.error(error)
          toast.error(
            error instanceof Error ? error.message : 'Không thể xuất PDF. Vui lòng thử lại.'
          )
        } finally {
          releaseFont?.()
          busy.current = false
          setPending(false)
        }
      }}
    >
      <FileDown aria-hidden="true" />
      {pending ? 'Đang xuất PDF…' : 'Xuất PDF'}
    </Button>
  )
}
