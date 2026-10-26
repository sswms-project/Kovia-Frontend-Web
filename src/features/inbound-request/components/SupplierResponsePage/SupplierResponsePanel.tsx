import { CheckCircle2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Logo } from '@/components/Logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  supplierResponseDecisionLabels,
  type SupplierResponseFormValues,
} from '../../schemas/supplier-response.schema'
import type {
  SupplierInboundResponsePreview,
  SupplierResponseLinkStatus,
} from '../../types/inbound-request.types'
import {
  formatOperationalDate,
  formatOperationalDateTime,
} from '../../utils/inbound-request-format'
import { SupplierOrderSummary } from './SupplierOrderSummary'
import { SupplierResponseForm } from './SupplierResponseForm'

const INACTIVE_LINK_MESSAGES: Partial<Record<SupplierResponseLinkStatus, string>> = {
  Expired: 'Liên kết đã hết hạn. Vui lòng liên hệ bên đặt hàng để được gửi lại đơn.',
  Revoked:
    'Bên đặt hàng đã gửi một email mới cho đơn này. Vui lòng dùng liên kết trong email mới nhất.',
  Closed: 'Đơn hàng này không còn chờ phản hồi (đã hủy, đã đóng hoặc đã bắt đầu nhận hàng).',
}

interface SupplierResponsePanelProps {
  readonly token?: string
  readonly preview?: SupplierInboundResponsePreview
  readonly isLoading: boolean
  readonly loadErrorMessage?: string
  readonly form: UseFormReturn<SupplierResponseFormValues>
  readonly isPending: boolean
  readonly submitErrorMessage?: string
  readonly onSubmit: (values: SupplierResponseFormValues) => Promise<void>
}

export function SupplierResponsePanel({
  token,
  preview,
  isLoading,
  loadErrorMessage,
  form,
  isPending,
  submitErrorMessage,
  onSubmit,
}: SupplierResponsePanelProps) {
  return (
    <main className="bg-muted/30 flex min-h-dvh items-start justify-center p-4 sm:items-center sm:p-8">
      <section className="bg-background w-full max-w-2xl border">
        <header className="border-b px-5 py-4 sm:px-7">
          <Logo />
        </header>
        <div className="space-y-6 p-5 sm:p-7">
          {!token ? (
            <LinkError message="Liên kết thiếu mã xác thực. Vui lòng mở lại nút trong email." />
          ) : isLoading ? (
            <div className="space-y-3" aria-label="Đang tải đơn hàng">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : loadErrorMessage || !preview ? (
            <LinkError message={loadErrorMessage ?? 'Liên kết không hợp lệ.'} />
          ) : (
            <>
              <SupplierOrderSummary preview={preview} />
              {preview.linkStatus === 'Open' ? (
                <SupplierResponseForm
                  form={form}
                  isPending={isPending}
                  errorMessage={submitErrorMessage}
                  onSubmit={onSubmit}
                />
              ) : preview.linkStatus === 'Responded' ? (
                <SubmittedResponse preview={preview} />
              ) : (
                <Alert role="status">
                  <AlertTitle>Không thể phản hồi qua liên kết này</AlertTitle>
                  <AlertDescription>{INACTIVE_LINK_MESSAGES[preview.linkStatus]}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

function SubmittedResponse({ preview }: { readonly preview: SupplierInboundResponsePreview }) {
  return (
    <div className="border-primary/40 bg-primary/5 space-y-2 border p-4" role="status">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="text-primary size-4" aria-hidden="true" />
        Đã ghi nhận phản hồi
        {preview.respondedAt ? ` lúc ${formatOperationalDateTime(preview.respondedAt)}` : ''}
      </p>
      {preview.response ? (
        <p className="text-sm">{supplierResponseDecisionLabels[preview.response]}</p>
      ) : null}
      {preview.proposedDate ? (
        <p className="text-sm">Ngày giao đề xuất: {formatOperationalDate(preview.proposedDate)}</p>
      ) : null}
      {preview.responseNote ? (
        <p className="text-muted-foreground text-sm">{preview.responseNote}</p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {preview.tenantName} đã nhận được thông báo. Nếu cần thay đổi, vui lòng liên hệ trực tiếp
        bên đặt hàng.
      </p>
    </div>
  )
}

function LinkError({ message }: { readonly message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Không mở được đơn hàng</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
