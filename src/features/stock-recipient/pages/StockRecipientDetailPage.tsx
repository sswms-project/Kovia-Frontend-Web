'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { ArrowLeft, Building2, Mail, MapPin, Pencil, Phone, Power, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { Button } from '@/components/ui/button'
import { StatusChangeDialog } from '@/components/operations/StatusChangeDialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { StockIssueRequestStatusBadge } from '@/features/stock-issue/components/StockIssueRequestsPage/StockIssueRequestStatusBadge'
import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import { APP_ROUTES } from '@/routes/app-routes'
import { StockRecipientFormDialog } from '../components/StockRecipientsPage'
import {
  useStockRecipientIssueHistoryQuery,
  useStockRecipientQuery,
  useChangeStockRecipientStatusMutation,
  useUpdateStockRecipientMutation,
} from '../hooks/use-stock-recipients'
import {
  emptyStockRecipientFormValues,
  stockRecipientSchema,
  toStockRecipientRequest,
  type StockRecipientFormValues,
} from '../schemas/stock-recipient.schema'

export default function StockRecipientDetailPage({
  stockRecipientId,
}: {
  readonly stockRecipientId: string
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const stockRecipientQuery = useStockRecipientQuery(stockRecipientId)
  const historyQuery = useStockRecipientIssueHistoryQuery(stockRecipientId, {
    pageNumber: page,
    pageSize,
  })
  const meQuery = useMeQuery()
  const updateMutation = useUpdateStockRecipientMutation()
  const statusMutation = useChangeStockRecipientStatusMutation()
  const form = useForm<StockRecipientFormValues>({
    resolver: zodResolver(stockRecipientSchema),
    defaultValues: emptyStockRecipientFormValues,
  })

  async function update(values: StockRecipientFormValues) {
    try {
      await updateMutation.mutateAsync({
        stockRecipientId,
        request: toStockRecipientRequest(values),
      })
      toast.success('Đã cập nhật khách hàng.')
      setIsEditOpen(false)
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật khách hàng.'))
    }
  }

  async function changeStatus() {
    const recipient = stockRecipientQuery.data
    if (!recipient) return
    const status = recipient.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await statusMutation.mutateAsync({ stockRecipientId, status })
      toast.success(status === 'Active' ? 'Đã kích hoạt khách hàng.' : 'Đã ngừng khách hàng.')
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể thay đổi trạng thái khách hàng.'))
    }
  }

  if (stockRecipientQuery.isLoading) return <OperationalLoadingState />
  if (stockRecipientQuery.isError || !stockRecipientQuery.data)
    return (
      <OperationalErrorState
        title="Không thể tải khách hàng"
        onRetry={() => void stockRecipientQuery.refetch()}
      />
    )
  const stockRecipient = stockRecipientQuery.data
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.stockRecipients as Route} aria-label="Quay lại">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-primary font-mono text-xs" translate="no">
              {stockRecipient.recipientCode}
            </p>
            <h1 className="text-xl font-semibold">{stockRecipient.recipientName}</h1>
            <Badge
              className="mt-2"
              variant={stockRecipient.status === 'Active' ? 'default' : 'outline'}
            >
              {stockRecipient.status === 'Active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
          {(meQuery.data?.permissions ?? []).includes(P.STOCK_RECIPIENTS_MANAGE_STATUS) ? (
            <Button
              variant="outline"
              size="icon"
              aria-label={stockRecipient.status === 'Active' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
              title={stockRecipient.status === 'Active' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
              disabled={statusMutation.isPending}
              onClick={() => setIsStatusOpen(true)}
            >
              {stockRecipient.status === 'Active' ? (
                <Power aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
            </Button>
          ) : null}
          {(meQuery.data?.permissions ?? []).includes(P.STOCK_RECIPIENTS_UPDATE) ? (
            <Button
              size="icon"
              aria-label="Chỉnh sửa khách hàng"
              title="Chỉnh sửa khách hàng"
              disabled={stockRecipient.status !== 'Active'}
              onClick={() => {
                form.reset({
                  recipientCode: stockRecipient.recipientCode,
                  recipientName: stockRecipient.recipientName,
                  recipientType: stockRecipient.recipientType,
                  taxCode: stockRecipient.taxCode ?? '',
                  phone: stockRecipient.phone,
                  email: stockRecipient.email ?? '',
                  address: stockRecipient.address,
                  shippingAddress: stockRecipient.shippingAddress ?? '',
                  contactSalutation: stockRecipient.contactSalutation ?? '',
                  contactName: stockRecipient.contactName ?? '',
                  contactMobile: stockRecipient.contactMobile ?? '',
                  contactChannel: stockRecipient.contactChannel ?? '',
                  contactChannelName: stockRecipient.contactChannelName ?? '',
                })
                setIsEditOpen(true)
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </header>
      <section aria-labelledby="recipient-contact-heading" className="bg-card shrink-0 border">
        <div className="border-b px-4 py-3">
          <h2 id="recipient-contact-heading" className="text-sm font-semibold">
            Thông tin khách hàng
          </h2>
        </div>
        <dl className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <div className="flex min-w-0 gap-3 p-4">
            <Building2
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">Mã số thuế</dt>
              <dd className="mt-1 truncate text-sm font-medium">
                {stockRecipient.taxCode ?? 'Chưa có'}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-3 p-4">
            <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">Số điện thoại</dt>
              <dd className="mt-1 truncate text-sm font-medium">
                {stockRecipient.phone || 'Chưa có'}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-3 p-4">
            <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">Email</dt>
              <dd className="mt-1 truncate text-sm font-medium">
                {stockRecipient.email ? (
                  <a
                    className="hover:text-primary hover:underline"
                    href={`mailto:${stockRecipient.email}`}
                  >
                    {stockRecipient.email}
                  </a>
                ) : (
                  'Chưa có'
                )}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-3 p-4">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">Địa chỉ</dt>
              <dd className="mt-1 line-clamp-2 text-sm font-medium">
                {stockRecipient.address || 'Chưa có'}
              </dd>
            </div>
          </div>
        </dl>
      </section>
      <OperationalListPanel aria-label="Lịch sử yêu cầu xuất kho" className="rounded-none">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Lịch sử yêu cầu xuất kho</h2>
        </div>
        {historyQuery.isLoading ? (
          <OperationalLoadingState />
        ) : historyQuery.isError ? (
          <OperationalErrorState
            title="Không thể tải lịch sử đơn"
            onRetry={() => void historyQuery.refetch()}
          />
        ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
          <OperationalEmptyState
            title="Khách hàng chưa có yêu cầu xuất kho"
            description="Các yêu cầu xuất kho mới sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            <div
              data-slot="operational-list-body"
              className="[&>[data-slot=table-container]]:overflow-visible"
            >
              <Table className="min-w-[720px] text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 p-3">Mã đơn</TableHead>
                    <TableHead className="sticky top-0 z-10 p-3">Kho</TableHead>
                    <TableHead className="sticky top-0 z-10 p-3">Mục đích</TableHead>
                    <TableHead className="sticky top-0 z-10 p-3">Trạng thái</TableHead>
                    <TableHead className="sticky top-0 z-10 p-3">Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.items.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="p-3 font-mono">{order.stockIssueRequestCode}</TableCell>
                      <TableCell className="p-3">{order.warehouseName}</TableCell>
                      <TableCell className="p-3">{order.purpose ?? '—'}</TableCell>
                      <TableCell className="p-3">
                        <StockIssueRequestStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="p-3">{formatStockIssueDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={historyQuery.data?.totalCount ?? 0}
              isPending={historyQuery.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
          </>
        )}
      </OperationalListPanel>
      <StockRecipientFormDialog
        open={isEditOpen}
        title="Chỉnh sửa khách hàng"
        description="Cập nhật thông tin liên hệ và địa chỉ mặc định."
        form={form}
        isPending={updateMutation.isPending}
        onOpenChange={setIsEditOpen}
        onSubmit={(values) => void update(values)}
      />
      <StatusChangeDialog
        open={isStatusOpen}
        subject={`khách hàng “${stockRecipient.recipientName}”`}
        nextStatus={stockRecipient.status === 'Active' ? 'Inactive' : 'Active'}
        isPending={statusMutation.isPending}
        onOpenChange={setIsStatusOpen}
        onConfirm={() => {
          setIsStatusOpen(false)
          void changeStatus()
        }}
      />
    </div>
  )
}
