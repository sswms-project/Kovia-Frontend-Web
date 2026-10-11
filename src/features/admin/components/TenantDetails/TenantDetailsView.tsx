import Link from 'next/link'
import { ArrowLeft, Building2, CircleCheck, CirclePause, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_ROUTES } from '@/routes/app-routes'
import { cn } from '@/lib/utils'
import {
  formatBillingCycle,
  formatSubscriptionStatus,
} from '@/features/subscription/utils/format-subscription'
import type { TenantDetailsResponse } from '../../types/admin.types'
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
  formatTenantStatus,
} from '../../utils/platform-admin-format'

interface TenantDetailsViewProps {
  readonly data?: TenantDetailsResponse
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isFetching: boolean
  readonly isPending: boolean
  readonly onRetry: () => void
  readonly onStateAction: () => void
  readonly onApprove: () => void
  readonly onReject: () => void
}

function DetailList({ items }: { readonly items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="mt-1 text-sm break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TenantDetailsView({
  data,
  isLoading,
  isError,
  isFetching,
  isPending,
  onRetry,
  onStateAction,
  onApprove,
  onReject,
}: TenantDetailsViewProps) {
  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-8" />
          <Skeleton className="h-96 lg:col-span-4" />
        </div>
      </div>
    )
  if (isError || !data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Không thể tải chi tiết đơn vị thuê</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  const isActive = data.status === 'Active'
  const isPendingRegistration = data.status === 'Pending'
  const statusLabel = formatTenantStatus(data.status)

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="link" className="h-auto px-0 text-xs">
            <Link href={APP_ROUTES.admin.tenants}>
              <ArrowLeft aria-hidden="true" />
              Quay lại danh sách đơn vị thuê
            </Link>
          </Button>
          <div className="mt-2 flex items-center gap-3">
            <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
              <Building2 aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">{data.tenantName}</h2>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              isActive
                ? 'border-primary/30 text-primary'
                : isPendingRegistration
                  ? 'border-warning text-warning'
                  : 'border-destructive/30 text-destructive'
            )}
          >
            {statusLabel}
          </Badge>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Làm mới chi tiết doanh nghiệp"
            disabled={isFetching}
            onClick={onRetry}
          >
            <RefreshCw
              className={cn(isFetching && 'animate-spin motion-reduce:animate-none')}
              aria-hidden="true"
            />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="bg-card border p-4">
            <h2 className="text-sm font-semibold">Doanh nghiệp và chủ sở hữu</h2>
            <DetailList
              items={[
                ['Email đơn vị thuê', data.email],
                ['Điện thoại', data.phone],
                ['Địa chỉ', data.address ?? '—'],
                ['Ngày tạo', formatAdminDate(data.createdAt)],
                ['Chủ sở hữu', data.owner.fullName],
                ['Email chủ sở hữu', data.owner.email],
                ['Điện thoại chủ sở hữu', data.owner.phone ?? '—'],
                ['Đăng nhập gần nhất', formatAdminDateTime(data.owner.lastLoginAt)],
              ]}
            />
          </section>
          <section className="bg-card border p-4">
            <h2 className="text-sm font-semibold">Mức sử dụng</h2>
            <dl className="mt-4 grid grid-cols-2 divide-x border sm:grid-cols-4">
              <div className="p-3">
                <dt className="text-muted-foreground text-xs">Người dùng hoạt động</dt>
                <dd className="mt-1 text-lg font-semibold">{data.usage.activeUsers}</dd>
              </div>
              <div className="p-3">
                <dt className="text-muted-foreground text-xs">Tổng người dùng</dt>
                <dd className="mt-1 text-lg font-semibold">{data.usage.totalUsers}</dd>
              </div>
              <div className="p-3">
                <dt className="text-muted-foreground text-xs">Kho hoạt động</dt>
                <dd className="mt-1 text-lg font-semibold">{data.usage.activeWarehouses}</dd>
              </div>
              <div className="p-3">
                <dt className="text-muted-foreground text-xs">Tổng kho</dt>
                <dd className="mt-1 text-lg font-semibold">{data.usage.totalWarehouses}</dd>
              </div>
            </dl>
          </section>
          <section className="bg-card border p-4">
            <h2 className="text-sm font-semibold">Vòng đời đăng ký</h2>
            {data.subscription ? (
              <DetailList
                items={[
                  ['Gói hiện tại', data.subscription.planName],
                  ['Chu kỳ', formatBillingCycle(data.subscription.billingCycle)],
                  ['Hiệu lực từ', formatAdminDate(data.subscription.startDate)],
                  ['Hết hạn', formatAdminDate(data.subscription.endDate)],
                  ['Trạng thái', formatSubscriptionStatus(data.subscription.status)],
                  ['Phương thức gia hạn', 'Thủ công qua PayOS'],
                  ['Thay đổi chờ áp dụng', data.subscription.pendingPlanName ?? 'Không có'],
                  [
                    'Chu kỳ chờ áp dụng',
                    data.subscription.pendingBillingCycle
                      ? formatBillingCycle(data.subscription.pendingBillingCycle)
                      : '—',
                  ],
                ]}
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Đơn vị thuê chưa có đăng ký.
              </p>
            )}
          </section>
        </div>

        <aside className="order-first flex flex-col gap-4 lg:order-none lg:col-span-4">
          <Alert variant={isActive || isPendingRegistration ? 'default' : 'destructive'}>
            {isActive ? <CircleCheck aria-hidden="true" /> : <CirclePause aria-hidden="true" />}
            <AlertTitle>Trạng thái đơn vị thuê: {statusLabel}</AlertTitle>
            <AlertDescription>
              {isPendingRegistration
                ? data.owner.emailVerified
                  ? 'Email chủ sở hữu đã được xác minh. Đăng ký đã sẵn sàng để xét duyệt.'
                  : 'Chủ sở hữu chưa xác minh email. Chưa thể phê duyệt đăng ký.'
                : isActive
                  ? 'Tạm ngưng sẽ thu hồi phiên đăng nhập và chặn truy cập đơn vị thuê.'
                  : data.status === 'Suspended'
                    ? 'Kích hoạt lại để khôi phục quyền truy cập của đơn vị thuê.'
                    : 'Chỉ đơn vị thuê đang hoạt động hoặc tạm ngưng mới có thể đổi trạng thái tại đây.'}
              {isPendingRegistration ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    disabled={isPending || !data.owner.emailVerified}
                    onClick={onApprove}
                  >
                    Phê duyệt
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    disabled={isPending}
                    onClick={onReject}
                  >
                    Từ chối
                  </Button>
                </div>
              ) : (
                <Button
                  className="mt-4 w-full"
                  variant={isActive ? 'destructive' : 'default'}
                  disabled={isPending || (!isActive && data.status !== 'Suspended')}
                  onClick={onStateAction}
                >
                  {isActive ? 'Tạm ngưng đơn vị thuê' : 'Kích hoạt lại đơn vị thuê'}
                </Button>
              )}
            </AlertDescription>
          </Alert>
          <section className="bg-card border p-4">
            <h2 className="text-sm font-semibold">Thanh toán hoàn tất</h2>
            <DetailList
              items={[
                ['Tổng doanh thu', formatAdminCurrency(data.billing.totalCompletedRevenue)],
                [
                  'Thanh toán gần nhất',
                  data.billing.lastPaymentAmount === null
                    ? '—'
                    : formatAdminCurrency(data.billing.lastPaymentAmount),
                ],
                ['Ngày thanh toán', formatAdminDateTime(data.billing.lastPaidAt)],
                ['Số hóa đơn', data.billing.lastInvoiceNumber ?? '—'],
              ]}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
