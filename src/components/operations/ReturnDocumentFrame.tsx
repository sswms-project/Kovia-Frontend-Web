import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { OperationalDocumentInfo } from './OperationalDocumentInfo'
import { LifecycleTimeline } from './LifecycleTimeline'
import type { LifecycleEvent } from '@/features/inbound-request/types/inbound-request.types'
import { OperationalErrorState, OperationalLoadingState } from './OperationalState'

const RETURN_EVENT_LABELS: Record<string, string> = {
  Create: 'Tạo phiếu',
  Approve: 'Duyệt phiếu',
  SelfApprove: 'Tự duyệt phiếu',
  Reject: 'Từ chối',
  Withdraw: 'Thu hồi về Nháp',
  Save: 'Lưu nháp',
  EditContents: 'Chỉnh sửa nội dung',
  Submit: 'Gửi duyệt lại',
  DeleteDraft: 'Xóa nháp có lưu vết',
  Cancel: 'Hủy phiếu',
  Restock: 'Nhập lại kho',
  Deliver: 'Giao trả NCC',
}

export function returnHistoryEvents(
  history: readonly import('@/types/return-document').ReturnDocumentEvent[]
) {
  return history.map((event) => ({
    ...event,
    action: RETURN_EVENT_LABELS[event.action] ?? event.action,
    actorId: '',
    actorName: event.actorName ?? '',
    fromState: null,
    toState: null,
  }))
}

interface ReturnDocumentFrameProps {
  readonly title: string
  readonly code?: string
  readonly subtitle: string
  readonly listHref: string
  readonly backLabel?: string
  readonly status?: ReactNode
  readonly actions?: ReactNode
  readonly info?: ReactNode
  readonly children: ReactNode
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

export function ReturnDocumentFrame({
  title,
  code,
  subtitle,
  listHref,
  backLabel = 'Quay lại danh sách trả hàng',
  status,
  actions,
  info,
  children,
  isLoading,
  isError,
  onRetry,
}: ReturnDocumentFrameProps) {
  return (
    <>
      <header className="flex min-w-0 flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="max-sm:size-11 pointer-coarse:size-11"
          >
            <Link href={listHref as Route} aria-label={backLabel}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-muted-foreground text-sm">{title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold break-all" translate="no">
                {code ?? 'Chi tiết phiếu'}
              </h1>
              {status}
            </div>
            <p className="text-muted-foreground text-sm break-words">{subtitle}</p>
          </div>
        </div>
        {!isLoading && !isError ? (
          <div className="flex flex-wrap items-center gap-2 max-sm:[&>button]:min-h-11">
            {actions}
          </div>
        ) : null}
      </header>
      {isLoading ? (
        <OperationalLoadingState />
      ) : isError ? (
        <OperationalErrorState
          title={`Không thể tải ${title.toLocaleLowerCase('vi-VN')}`}
          onRetry={onRetry}
        />
      ) : (
        <>
          <OperationalDocumentInfo
            documentId={code ?? title}
            headingId="return-document-info"
            summary={subtitle}
          >
            {info}
          </OperationalDocumentInfo>
          {children}
        </>
      )}
    </>
  )
}

export function ReturnDetailField({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm wrap-anywhere">{children ?? 'Chưa ghi nhận'}</dd>
    </div>
  )
}

export function ReturnDocumentHistory({ events }: { readonly events: readonly LifecycleEvent[] }) {
  return (
    <Collapsible className="bg-card border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto min-h-11 w-full justify-between p-4 text-left">
          Lịch sử xử lý
          <ChevronDown aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-4">
        <LifecycleTimeline events={events} />
      </CollapsibleContent>
    </Collapsible>
  )
}
