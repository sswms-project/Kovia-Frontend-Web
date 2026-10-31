import { FileWarning } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useInboundDocumentFile } from '../../../hooks/use-inbound'
import type { InboundDocumentImport } from '../../../types/inbound.types'

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif)$/i
const PDF_EXTENSION = /\.pdf$/i

export function DocumentPreview({ importData }: { readonly importData: InboundDocumentImport }) {
  const { url, contentType, isLoading, isError } = useInboundDocumentFile(importData.id)
  const type = contentType || importData.contentType
  const isImage = type.startsWith('image/') || IMAGE_EXTENSION.test(importData.fileName)
  const isPdf = type === 'application/pdf' || PDF_EXTENSION.test(importData.fileName)

  return (
    <section className="bg-muted flex min-h-80 flex-col border lg:sticky lg:top-0 lg:h-[72dvh]">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Chứng từ gốc</h3>
        <span className="text-muted-foreground truncate text-xs">{importData.fileName}</span>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        {isLoading ? (
          <Spinner className="size-6" />
        ) : isError || !url ? (
          <p className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
            <FileWarning className="size-4" aria-hidden="true" />
            Không thể tải chứng từ gốc.
          </p>
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL tạm (blob:) không đi qua next/image
          <img
            src={url}
            alt={`Chứng từ ${importData.fileName}`}
            className="max-h-full w-full object-contain"
          />
        ) : isPdf ? (
          <iframe src={url} title={`Chứng từ ${importData.fileName}`} className="size-full" />
        ) : (
          <a
            href={url}
            download={importData.fileName}
            className="text-primary p-4 text-xs underline"
          >
            Tải chứng từ gốc để xem
          </a>
        )}
      </div>
    </section>
  )
}
