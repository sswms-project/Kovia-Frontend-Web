import type { Route } from 'next'
import Link from 'next/link'
import { RotateCcw, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { APP_ROUTES } from '@/routes/app-routes'

interface AccessControlStateProps {
  readonly kind: 'forbidden' | 'error' | 'empty-roles' | 'empty-permissions'
  readonly onRetry?: () => void
}

const STATE_CONTENT = {
  forbidden: {
    title: 'Bạn không có quyền truy cập',
    description: 'Chỉ Chủ doanh nghiệp có thể cấu hình quyền cho các vai trò của tenant.',
  },
  error: {
    title: 'Không thể tải cấu hình phân quyền',
    description: 'Kiểm tra kết nối hoặc thử tải lại dữ liệu.',
  },
  'empty-roles': {
    title: 'Chưa có vai trò để cấu hình',
    description: 'Vai trò Quản lý kho và Nhân viên kho chưa được thiết lập trên hệ thống.',
  },
  'empty-permissions': {
    title: 'Chưa có quyền có thể ủy quyền',
    description: 'Danh mục quyền vận hành cho doanh nghiệp hiện đang trống.',
  },
} as const

export function AccessControlState({ kind, onRetry }: AccessControlStateProps) {
  const content = STATE_CONTENT[kind]

  return (
    <Empty className="border-border min-h-96 rounded-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{content.title}</EmptyTitle>
        <EmptyDescription>{content.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {kind === 'error' && onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Thử lại
          </Button>
        ) : kind === 'forbidden' ? (
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.dashboard as Route}>Về tổng quan</Link>
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  )
}
