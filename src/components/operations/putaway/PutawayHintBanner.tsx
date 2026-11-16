import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PutawayHintBannerProps {
  readonly children: ReactNode
  readonly className?: string
}

/** Dòng hướng dẫn nổi bật dùng chung cho các màn hình chọn vị trí cất hàng. */
export function PutawayHintBanner({ children, className }: PutawayHintBannerProps) {
  return (
    <p
      className={cn('bg-muted/40 border-l-primary border border-l-4 px-4 py-3 text-sm', className)}
      role="status"
      aria-live="polite"
    >
      {children}
    </p>
  )
}
