'use client'

import {
  ArrowLeft,
  Check,
  MapPinned,
  PackageCheck,
  Pencil,
  Send,
  Undo2,
  UserCheck,
  UserRoundCog,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { APP_ROUTES } from '@/routes/app-routes'
import type { InventoryEvidence } from '@/features/inventory/types/inventory.types'
import type {
  GoodsReceiptAction,
  GoodsReceiptDetail as ReceiptDetailType,
} from '../../types/inbound.types'
import { InboundStatusBadge } from '../InboundWorkspace'
import { ReceiptActionDialogs } from './ReceiptActionDialogs'
import { ReceiptHistorySheet } from './ReceiptHistorySheet'
import { ReceiptItemsTable } from './ReceiptItemsTable'
import { ReceiptOverview } from './ReceiptOverview'
import { ReceiptPlanTable } from './ReceiptPlanTable'
import { ReceiptPutAwayTable } from './ReceiptPutAwayTable'

interface ReceiptDetailProps {
  readonly receipt: ReceiptDetailType
  readonly allowedActions: readonly GoodsReceiptAction[]
  readonly isPending: boolean
  readonly selfApprovalRequired: boolean
  readonly onUpdate: () => void
  readonly onSubmit: () => Promise<boolean>
  readonly onApprove: () => Promise<boolean>
  readonly onReject: (reason: string) => Promise<boolean>
  readonly onAssignPutAway?: () => void
  readonly onPlanPutAway?: () => void
  readonly onDownloadEvidence?: (evidence: InventoryEvidence) => void
}

export function ReceiptDetail({
  receipt,
  allowedActions,
  isPending,
  selfApprovalRequired,
  onUpdate,
  onSubmit,
  onApprove,
  onReject,
  onAssignPutAway,
  onPlanPutAway,
  onDownloadEvidence,
}: ReceiptDetailProps) {
  const [confirmationAction, setConfirmationAction] = useState<'Submit' | 'Approve' | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)

  const hasPutAwayDetails = receipt.items.some((item) => item.putAwayDetails.length > 0)
  const hasPutAwayPlan = receipt.items.some((item) => item.putAwayPlan.length > 0)
  const usableQuantity = receipt.items.reduce((sum, item) => sum + item.usableQuantity, 0)
  const putAwayQuantity = receipt.items.reduce((sum, item) => sum + item.putAwayQuantity, 0)
  const putAwayPercent =
    usableQuantity > 0 ? Math.min(100, (putAwayQuantity / usableQuantity) * 100) : 0
  const showPutAwayProgress =
    usableQuantity > 0 && (hasPutAwayDetails || receipt.status === 'Approved')

  async function confirm() {
    if (!confirmationAction) return
    const succeeded = confirmationAction === 'Submit' ? await onSubmit() : await onApprove()
    if (succeeded) setConfirmationAction(null)
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b pb-4">
        <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button asChild variant="outline" size="icon">
              <Link href={APP_ROUTES.goodsReceipts as Route} aria-label="Quay lại danh sách">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 font-mono text-xl font-semibold break-words">
                  {receipt.receiptCode}
                </h1>
                <InboundStatusBadge status={receipt.status} />
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs break-words sm:text-sm">
                Yêu cầu nhập kho {receipt.inboundRequestCode} · {receipt.warehouseName}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <ReceiptHistorySheet events={receipt.history} receiptCode={receipt.receiptCode} />
            {allowedActions.includes('Update') ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={onUpdate}>
                <Pencil aria-hidden="true" />
                Chỉnh sửa
              </Button>
            ) : null}
            {allowedActions.includes('Submit') ? (
              <Button type="button" onClick={() => setConfirmationAction('Submit')}>
                <Send aria-hidden="true" />
                Gửi duyệt
              </Button>
            ) : null}
            {allowedActions.includes('Reject') ? (
              <Button type="button" variant="outline" onClick={() => setIsRejectOpen(true)}>
                <Undo2 aria-hidden="true" />
                Trả sửa
              </Button>
            ) : null}
            {allowedActions.includes('Approve') ? (
              <Button type="button" onClick={() => setConfirmationAction('Approve')}>
                <Check aria-hidden="true" />
                Xác nhận hàng đến
              </Button>
            ) : null}
            {allowedActions.includes('AssignPutAway') && onAssignPutAway ? (
              <Button
                type="button"
                variant={receipt.putAwayAssignedTo ? 'outline' : 'default'}
                onClick={onAssignPutAway}
              >
                {receipt.putAwayAssignedTo ? (
                  <UserRoundCog aria-hidden="true" />
                ) : (
                  <UserCheck aria-hidden="true" />
                )}
                {receipt.putAwayAssignedTo ? 'Giao lại cất hàng' : 'Giao việc cất hàng'}
              </Button>
            ) : null}
            {allowedActions.includes('PlanPutAway') && onPlanPutAway ? (
              <Button type="button" variant="outline" onClick={onPlanPutAway}>
                <MapPinned aria-hidden="true" />
                Cấu hình vị trí cất
              </Button>
            ) : null}
            {allowedActions.includes('PutAway') ? (
              <Button asChild>
                <Link href={APP_ROUTES.inboundPutawayDetail(receipt.id) as Route}>
                  <PackageCheck aria-hidden="true" />
                  Cất hàng
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
        <ReceiptOverview receipt={receipt} />

        {showPutAwayProgress ? (
          <section
            className="bg-card flex flex-col gap-2 border px-4 py-3"
            aria-label="Tiến độ cất hàng"
          >
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <h2 className="font-medium">Tiến độ cất hàng</h2>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatQuantity(putAwayQuantity)} / {formatQuantity(usableQuantity)}
                {putAwayQuantity < usableQuantity
                  ? ` · còn ${formatQuantity(usableQuantity - putAwayQuantity)}`
                  : ' · đã cất đủ'}
              </p>
            </div>
            <Progress
              value={putAwayPercent}
              aria-label={`Đã cất ${Math.round(putAwayPercent)}% số lượng dùng được`}
            />
          </section>
        ) : null}

        <Tabs defaultValue="items" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TabsList
            variant="line"
            className="w-full shrink-0 justify-start overflow-x-auto overflow-y-hidden"
          >
            <TabsTrigger value="items">
              Hàng hóa thực nhận
              <span className="bg-muted text-muted-foreground ml-1.5 rounded px-1.5 py-0.5 text-xs tabular-nums">
                {receipt.items.length}
              </span>
            </TabsTrigger>
            {hasPutAwayPlan ? <TabsTrigger value="plan">Vị trí cất đã cấu hình</TabsTrigger> : null}
            {hasPutAwayDetails ? <TabsTrigger value="putaway">Lịch sử cất hàng</TabsTrigger> : null}
          </TabsList>

          <div className="bg-card min-h-0 min-w-0 flex-1 overflow-hidden border">
            <div className="border-b px-4 py-3">
              <p className="text-muted-foreground text-xs">
                Số lượng hỏng không được đưa vào cất hàng.
              </p>
            </div>
            <TabsContent
              value="items"
              className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              <ReceiptItemsTable items={receipt.items} />
            </TabsContent>
            {hasPutAwayPlan ? (
              <TabsContent
                value="plan"
                className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              >
                <ReceiptPlanTable items={receipt.items} />
              </TabsContent>
            ) : null}
            {hasPutAwayDetails ? (
              <TabsContent
                value="putaway"
                className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              >
                <ReceiptPutAwayTable
                  items={receipt.items}
                  onDownloadEvidence={onDownloadEvidence}
                />
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </div>

      <ReceiptActionDialogs
        confirmationAction={confirmationAction}
        isRejectOpen={isRejectOpen}
        isPending={isPending}
        selfApprovalRequired={selfApprovalRequired}
        onConfirm={confirm}
        onCancelConfirmation={() => setConfirmationAction(null)}
        onReject={onReject}
        onRejectOpenChange={setIsRejectOpen}
      />
    </div>
  )
}
