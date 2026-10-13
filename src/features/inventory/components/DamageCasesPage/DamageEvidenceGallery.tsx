'use client'

import { useState } from 'react'
import { Download, FileText, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { isEvidenceImage, useEvidenceImage } from '../../hooks/use-evidence-image'
import { inventoryService } from '../../services/inventory.service'
import type { InventoryEvidence } from '../../types/inventory.types'
import { formatInventoryDate } from '../../utils/inventory-format'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function EvidenceImage({
  file,
  className,
  alt,
}: {
  readonly file: InventoryEvidence
  readonly className?: string
  readonly alt: string
}) {
  const { url, isLoading, isError } = useEvidenceImage(file.id)
  if (isLoading || (!url && !isError)) return <Skeleton className={cn('size-full', className)} />
  if (isError || !url)
    return (
      <span
        role="img"
        aria-label="Không tải được ảnh"
        className={cn(
          'bg-muted text-muted-foreground flex size-full items-center justify-center',
          className
        )}
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </span>
    )
  // Ảnh là URL tạm của trình duyệt (blob:) nên next/image không áp dụng được.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cn('size-full object-cover', className)} />
}

interface DamageEvidenceGalleryProps {
  readonly evidence: readonly InventoryEvidence[]
}

/** Ảnh bằng chứng hiển thị trực tiếp: ảnh lớn kèm dải ảnh nhỏ, bấm để phóng to; tệp khác ảnh hiện dạng tệp tải về. */
export function DamageEvidenceGallery({ evidence }: DamageEvidenceGalleryProps) {
  const images = evidence.filter(isEvidenceImage)
  const documents = evidence.filter((file) => !isEvidenceImage(file))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const active = images.find((file) => file.id === activeId) ?? images[0] ?? null

  if (evidence.length === 0)
    return <p className="text-muted-foreground text-sm">Chưa có bằng chứng.</p>

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
          <button
            type="button"
            className="bg-muted focus-visible:ring-ring relative h-56 w-full cursor-zoom-in overflow-hidden focus-visible:ring-2 focus-visible:outline-none sm:h-64"
            aria-label={`Phóng to ảnh ${active.fileName}`}
            onClick={() => setIsZoomed(true)}
          >
            <EvidenceImage
              file={active}
              alt={`Bằng chứng ${active.fileName}`}
              className="object-contain"
            />
          </button>
          {images.length > 1 ? (
            <ul className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-y-auto">
              {images.map((file, index) => (
                <li key={file.id} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Xem ảnh ${index + 1}: ${file.fileName}`}
                    aria-current={file.id === active.id}
                    className={cn(
                      'block size-20 overflow-hidden border-2 sm:size-[5.5rem]',
                      file.id === active.id ? 'border-primary' : 'border-transparent opacity-70'
                    )}
                    onClick={() => setActiveId(file.id)}
                  >
                    <EvidenceImage file={file} alt={`Ảnh ${index + 1}`} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {active ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-muted-foreground min-w-0 truncate">
            {active.fileName} · {formatFileSize(active.fileSize)} ·{' '}
            {formatInventoryDate(active.createdAt)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void inventoryService.downloadEvidence(active.id, active.fileName)}
          >
            <Download aria-hidden="true" />
            Tải xuống
          </Button>
        </div>
      ) : null}
      {documents.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {documents.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="text-primary flex max-w-full items-center gap-2 text-sm underline-offset-2 hover:underline"
                onClick={() => void inventoryService.downloadEvidence(file.id, file.fileName)}
              >
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{file.fileName}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatFileSize(file.fileSize)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle className="truncate">{active?.fileName ?? 'Ảnh bằng chứng'}</DialogTitle>
          <DialogDescription className="sr-only">
            Ảnh bằng chứng hàng hỏng phóng to.
          </DialogDescription>
          {active ? (
            <div className="bg-muted flex max-h-[75dvh] min-h-48 items-center justify-center overflow-hidden">
              <EvidenceImage
                file={active}
                alt={`Bằng chứng ${active.fileName}`}
                className="max-h-[75dvh] object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
