'use client'

import type { Route } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Lock,
  RefreshCw,
  SearchX,
  ServerCrash,
  ShieldAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getApiErrorMessage, getErrorKind, type ErrorKind } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'

/**
 * Xuất hiện lần lượt (mờ dần + trượt lên vài px, tổng tối đa 400ms: 200ms + trễ tối đa 200ms). `fill-mode-backwards` giữ phần
 * tử ẩn trong lúc chờ; `motion-safe:` tắt hẳn khi người dùng chọn giảm chuyển động. Chỉ đổi opacity/transform nên không gây dịch bố cục.
 */
const ENTER =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:animation-duration-200 motion-safe:fill-mode-backwards'

/** Nút của khối lỗi: nhấn lún nhẹ, rê chuột nâng nhẹ (150ms, bỏ khi giảm chuyển động). */
const BUTTON_MOTION =
  'duration-150 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-95'

interface ErrorCopy {
  icon: LucideIcon
  title: string
  description: string
  /** Thử lại chỉ có ý nghĩa khi lỗi có thể tự hết (mạng, máy chủ). */
  retryable: boolean
}

const copy: Record<ErrorKind, ErrorCopy> = {
  forbidden: {
    icon: Lock,
    title: 'Bạn chưa có quyền xem nội dung này',
    description:
      'Tài khoản của bạn chưa được cấp quyền truy cập mục này. Vui lòng liên hệ quản trị viên để được cấp quyền.',
    retryable: false,
  },
  unauthorized: {
    icon: ShieldAlert,
    title: 'Phiên đăng nhập đã hết hạn',
    description: 'Vui lòng đăng nhập lại để tiếp tục.',
    retryable: false,
  },
  notFound: {
    icon: SearchX,
    title: 'Không tìm thấy dữ liệu',
    description: 'Dữ liệu bạn yêu cầu không tồn tại hoặc đã bị xóa.',
    retryable: false,
  },
  network: {
    icon: WifiOff,
    title: 'Không thể kết nối đến hệ thống',
    description: 'Vui lòng kiểm tra kết nối mạng rồi thử lại.',
    retryable: true,
  },
  server: {
    icon: ServerCrash,
    title: 'Hệ thống đang gặp sự cố',
    description: 'Chúng tôi chưa tải được dữ liệu. Vui lòng thử lại sau ít phút.',
    retryable: true,
  },
  unknown: {
    icon: CircleAlert,
    title: 'Không thể tải dữ liệu',
    description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    retryable: true,
  },
}

interface ErrorStateProps {
  readonly error: unknown
  /** Ép loại lỗi khi không có AxiosError (vd. thiếu tham số URL → notFound). */
  readonly kind?: ErrorKind
  /** page: thay cả trang (lỗi quyền, không tìm thấy); inline: trong một khối; banner: thanh phía trên. */
  readonly variant?: 'page' | 'inline' | 'banner'
  readonly onRetry?: () => void
  readonly isRetrying?: boolean
  readonly backHref?: Route
  /** Thay tiêu đề/mô tả mặc định, ví dụ hiện nguyên thông báo nghiệp vụ (400) của BE. */
  readonly title?: string
  readonly description?: string
  readonly className?: string
}

export function ErrorState({
  error,
  kind: forcedKind,
  variant = 'page',
  onRetry,
  isRetrying = false,
  backHref,
  title: titleOverride,
  description: descriptionOverride,
  className,
}: ErrorStateProps) {
  const detected = getErrorKind(error)
  const kind = forcedKind ?? detected.kind
  const status = detected.status
  const { icon: Icon, retryable, ...defaults } = copy[kind]
  const title = titleOverride ?? defaults.title
  const description = descriptionOverride ?? defaults.description
  const canRetry = retryable && Boolean(onRetry)
  const retryButton = canRetry && (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-1.5', BUTTON_MOTION)}
      disabled={isRetrying}
      aria-busy={isRetrying}
      onClick={onRetry}
    >
      <RefreshCw
        aria-hidden="true"
        className={cn(
          'size-3.5 transition-transform duration-300',
          isRetrying
            ? 'motion-safe:animate-spin'
            : 'motion-safe:group-hover/button:rotate-180 motion-safe:group-focus-visible/button:rotate-180'
        )}
      />
      {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
    </Button>
  )
  const technical = (
    <Collapsible className="text-muted-foreground w-full text-xs">
      <CollapsibleTrigger className="group/details hover:text-foreground focus-visible:ring-ring/50 mx-auto flex cursor-pointer items-center gap-1 rounded-sm px-1 transition-colors duration-150 outline-none select-none focus-visible:ring-1">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-200 group-data-[state=open]/details:rotate-90"
        />
        Chi tiết kỹ thuật
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up animation-duration-200 overflow-hidden motion-reduce:animate-none">
        <p className="mt-1 break-words">
          {status ? `HTTP ${status} · ` : ''}
          {getApiErrorMessage(error)}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )

  if (variant === 'banner')
    return (
      <div
        role="alert"
        className={cn(
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:animation-duration-200 border-warning/40 bg-warning/10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs',
          className
        )}
      >
        <Icon aria-hidden="true" className="text-warning size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong className="font-medium">{title}.</strong>{' '}
          <span className="text-muted-foreground">Một phần dữ liệu có thể chưa đầy đủ.</span>
        </span>
        {retryButton}
      </div>
    )

  if (variant === 'inline')
    return (
      <div
        role="alert"
        className={cn('flex flex-col items-center justify-center gap-3 p-6 text-center', className)}
      >
        <Icon
          aria-hidden="true"
          className={cn('text-muted-foreground motion-safe:zoom-in-90 size-8', ENTER)}
        />
        <div className={cn('space-y-1 motion-safe:delay-75', ENTER)}>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground max-w-sm text-xs">{description}</p>
        </div>
        {retryButton && <div className={cn('motion-safe:delay-150', ENTER)}>{retryButton}</div>}
        {kind === 'forbidden' && (
          <Button size="sm" className={BUTTON_MOTION} asChild>
            <Link href={APP_ROUTES.dashboard}>Về trang chủ</Link>
          </Button>
        )}
        <div className={cn('w-full motion-safe:delay-200', ENTER)}>{technical}</div>
      </div>
    )

  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-8 text-center',
        className
      )}
    >
      <span
        className={cn(
          'bg-muted text-muted-foreground motion-safe:zoom-in-90 flex size-14 items-center justify-center rounded-full',
          ENTER
        )}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <div className={cn('space-y-1.5 motion-safe:delay-75', ENTER)}>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-center gap-2 motion-safe:delay-150',
          ENTER
        )}
      >
        {backHref && (
          <Button variant="outline" size="sm" className={cn('gap-1.5', BUTTON_MOTION)} asChild>
            <Link href={backHref}>
              <ArrowLeft
                aria-hidden="true"
                className="size-3.5 transition-transform duration-150 motion-safe:group-hover/button:-translate-x-0.5"
              />
              Quay lại
            </Link>
          </Button>
        )}
        {kind === 'forbidden' && variant === 'page' && (
          <Button size="sm" className={BUTTON_MOTION} asChild>
            <Link href={APP_ROUTES.dashboard}>Về trang chủ</Link>
          </Button>
        )}
        {kind === 'unauthorized' && (
          <Button size="sm" className={BUTTON_MOTION} asChild>
            <Link href={APP_ROUTES.auth.login}>Đăng nhập lại</Link>
          </Button>
        )}
        {retryButton}
      </div>
      <div className={cn('w-full motion-safe:delay-200', ENTER)}>{technical}</div>
    </div>
  )
}
