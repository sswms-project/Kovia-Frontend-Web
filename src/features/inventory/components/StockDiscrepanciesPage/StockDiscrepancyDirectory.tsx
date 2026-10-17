'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { APP_ROUTES } from '@/routes/app-routes'
import { inventoryService } from '../../services/inventory.service'
import type {
  InventoryFilterOption,
  StockDiscrepancy,
  StockDiscrepancyReviewAction,
  StockDiscrepancyStatus,
  StockDiscrepancyType,
} from '../../types/inventory.types'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'

interface Props {
  readonly permissions: readonly string[]
  readonly currentUserId: string | null
  readonly items: readonly StockDiscrepancy[]
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly filterWarehouseId: string
  readonly filterProductId: string
  readonly statusFilter: StockDiscrepancyStatus | ''
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly productOptions: readonly InventoryFilterOption[]
  readonly slotOptions: readonly InventoryFilterOption[]
  readonly lotOptions: readonly InventoryFilterOption[]
  readonly staffOptions: readonly InventoryFilterOption[]
  readonly taskOptions: readonly InventoryFilterOption[]
  readonly canLinkTask: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly canReport: boolean
  readonly canReview: boolean
  readonly warehouseId: string
  readonly productId: string
  readonly slotId: string
  readonly lotId: string
  readonly correctSlotId: string
  readonly relatedTaskKey: string
  readonly onWarehouseChange: (value: string) => void
  readonly onProductChange: (value: string) => void
  readonly onSlotChange: (value: string) => void
  readonly onLotChange: (value: string) => void
  readonly onCorrectSlotChange: (value: string) => void
  readonly onRelatedTaskChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onFilterWarehouseChange: (value: string) => void
  readonly onFilterProductChange: (value: string) => void
  readonly onStatusFilterChange: (value: StockDiscrepancyStatus | '') => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onRetry: () => void
  readonly onCreate: (values: {
    type: StockDiscrepancyType
    difference: number
    description: string
    file: File
  }) => Promise<void>
  readonly onReview: (
    item: StockDiscrepancy,
    action: StockDiscrepancyReviewAction,
    reason: string,
    duplicateReportId?: string,
    responsibleUserId?: string
  ) => Promise<void>
  readonly onAddEvidence: (item: StockDiscrepancy, file: File) => Promise<void>
}

const reviewActions: readonly StockDiscrepancyReviewAction[] = [
  'RequestEvidence',
  'Reject',
  'LinkDuplicate',
  'InitiateCycleCount',
  'ProposeAdjustment',
]

export function StockDiscrepancyDirectory(props: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewItem, setReviewItem] = useState<StockDiscrepancy | null>(null)
  const [type, setType] = useState<StockDiscrepancyType>('Shortage')
  const [difference, setDifference] = useState(0)
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [action, setAction] = useState<StockDiscrepancyReviewAction>('RequestEvidence')
  const [reason, setReason] = useState('')
  const [duplicateId, setDuplicateId] = useState('')
  const [responsibleUserId, setResponsibleUserId] = useState('')
  const [evidenceItem, setEvidenceItem] = useState<StockDiscrepancy | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [detailItem, setDetailItem] = useState<StockDiscrepancy | null>(null)
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="sr-only">Báo cáo chênh lệch tồn kho</h1>
      <InventoryWorkspaceNavigation
        currentView="discrepancies"
        permissions={props.permissions}
        actions={
          props.canReport ? (
            <Button onClick={() => setCreateOpen(true)}>Báo chênh lệch</Button>
          ) : undefined
        }
      />
      <OperationalListPanel aria-label="Danh sách chênh lệch tồn kho">
        <FieldGroup
          aria-label="Bộ lọc báo cáo chênh lệch"
          className="[container-type:normal] flex shrink-0 flex-row flex-wrap items-end gap-3 border-b p-3"
        >
          <Field className="w-full sm:w-40">
            <FieldLabel htmlFor="discrepancy-filter-warehouse">Kho</FieldLabel>
            <NativeSelect
              id="discrepancy-filter-warehouse"
              className="w-full"
              aria-label="Lọc theo kho"
              value={props.filterWarehouseId}
              onChange={(event) => props.onFilterWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {props.warehouseOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-full sm:w-52">
            <FieldLabel htmlFor="discrepancy-filter-product">Sản phẩm</FieldLabel>
            <NativeSelect
              id="discrepancy-filter-product"
              className="w-full"
              aria-label="Lọc theo sản phẩm"
              value={props.filterProductId}
              onChange={(event) => props.onFilterProductChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả sản phẩm</NativeSelectOption>
              {props.productOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-full sm:w-44">
            <FieldLabel htmlFor="discrepancy-filter-status">Trạng thái</FieldLabel>
            <NativeSelect
              id="discrepancy-filter-status"
              className="w-full"
              aria-label="Lọc theo trạng thái"
              value={props.statusFilter}
              onChange={(event) =>
                props.onStatusFilterChange(event.target.value as StockDiscrepancyStatus | '')
              }
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              <NativeSelectOption value="PendingReview">Chờ xem xét</NativeSelectOption>
              <NativeSelectOption value="EvidenceRequested">Chờ bằng chứng</NativeSelectOption>
              <NativeSelectOption value="FollowUpPending">Đang xử lý tiếp</NativeSelectOption>
              <NativeSelectOption value="Resolved">Đã xử lý</NativeSelectOption>
              <NativeSelectOption value="Rejected">Từ chối</NativeSelectOption>
              <NativeSelectOption value="Duplicate">Trùng lặp</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field className="w-full sm:w-40">
            <FieldLabel htmlFor="discrepancy-filter-from">Từ ngày</FieldLabel>
            <Input
              id="discrepancy-filter-from"
              aria-label="Từ ngày"
              type="date"
              value={props.dateFrom}
              onChange={(event) => props.onDateFromChange(event.target.value)}
            />
          </Field>
          <Field className="w-full sm:w-40">
            <FieldLabel htmlFor="discrepancy-filter-to">Đến ngày</FieldLabel>
            <Input
              id="discrepancy-filter-to"
              aria-label="Đến ngày"
              type="date"
              value={props.dateTo}
              onChange={(event) => props.onDateToChange(event.target.value)}
            />
          </Field>
        </FieldGroup>
        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải báo cáo chênh lệch" onRetry={props.onRetry} />
        ) : props.items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có báo cáo chênh lệch"
            description="Các chênh lệch được báo cáo sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Kho / vị trí</TableHead>
                  <TableHead>Chênh lệch</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>
                      {item.sku} · {item.productName}
                    </TableCell>
                    <TableCell>
                      {item.warehouseName} / {item.slotCode}
                    </TableCell>
                    <TableCell className="font-mono">{item.observedDifference}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setDetailItem(item)}>
                          Chi tiết
                        </Button>
                        {props.canReview &&
                        item.reportedByUserId !== props.currentUserId &&
                        ['PendingReview', 'EvidenceRequested'].includes(item.status) ? (
                          <Button size="sm" onClick={() => setReviewItem(item)}>
                            Xử lý
                          </Button>
                        ) : null}
                        {props.canReport &&
                        item.reportedByUserId === props.currentUserId &&
                        item.status === 'EvidenceRequested' ? (
                          <Button size="sm" variant="outline" onClick={() => setEvidenceItem(item)}>
                            Bổ sung bằng chứng
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isLoading}
          onPageChange={props.onPageChange}
        />
      </OperationalListPanel>
      <Dialog
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailItem?.code}</DialogTitle>
            <DialogDescription>
              Chi tiết báo cáo, bằng chứng và luồng xử lý liên kết.
            </DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div className="grid gap-3 text-sm">
              <p>
                <strong>Sản phẩm:</strong> {detailItem.sku} · {detailItem.productName}
              </p>
              <p>
                <strong>Phạm vi:</strong> {detailItem.warehouseName} / {detailItem.slotCode}
                {detailItem.lotNumber ? ` / lô ${detailItem.lotNumber}` : ''}
                {detailItem.correctSlotCode ? ` → vị trí đúng ${detailItem.correctSlotCode}` : ''}
              </p>
              <p>
                <strong>Loại / chênh lệch:</strong> {detailItem.type} /{' '}
                {detailItem.observedDifference}
              </p>
              <p>
                <strong>Mô tả:</strong> {detailItem.description}
              </p>
              {detailItem.relatedTaskId ? (
                <p>
                  <strong>Công việc nguồn:</strong> {detailItem.relatedTaskType} ·{' '}
                  {detailItem.relatedTaskId}
                </p>
              ) : null}
              {detailItem.responsibleUserName ? (
                <p>
                  <strong>Người phụ trách:</strong> {detailItem.responsibleUserName}
                </p>
              ) : null}
              <div>
                <p className="font-medium">Bằng chứng</p>
                {detailItem.evidence.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className="text-primary block underline"
                    onClick={() => void inventoryService.downloadEvidence(file.id, file.fileName)}
                  >
                    {file.fileName}
                  </button>
                ))}
              </div>
              <div>
                <p className="font-medium">Lịch sử trạng thái</p>
                {detailItem.history.length ? (
                  detailItem.history.map((event) => (
                    <p key={`${event.createdAt}-${event.action}`}>
                      {event.action}: {event.fromState || 'Khởi tạo'} →{' '}
                      {event.toState || 'Không đổi'} · {event.actorName} ·{' '}
                      {new Date(event.createdAt).toLocaleString('vi-VN')}
                      {event.reason ? ` · ${event.reason}` : ''}
                    </p>
                  ))
                ) : (
                  <p>
                    Đã báo bởi {detailItem.reportedByName} ·{' '}
                    {new Date(detailItem.createdAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {detailItem.linkedCycleCountId ? (
                  <Button asChild variant="outline">
                    <Link href={APP_ROUTES.cycleCountDetail(detailItem.linkedCycleCountId)}>
                      Mở phiếu kiểm kê
                    </Link>
                  </Button>
                ) : null}
                {detailItem.linkedStockAdjustmentId ? (
                  <Button asChild variant="outline">
                    <Link
                      href={APP_ROUTES.stockAdjustmentDetail(detailItem.linkedStockAdjustmentId)}
                    >
                      Mở phiếu điều chỉnh
                    </Link>
                  </Button>
                ) : null}
              </div>
              {detailItem.duplicateOfReportId ? (
                <p className="text-muted-foreground text-xs">
                  Báo cáo gốc: {detailItem.duplicateOfReportId}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailItem(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Báo chênh lệch tồn kho</DialogTitle>
            <DialogDescription>
              Chọn đúng phạm vi và đính kèm bằng chứng kiểm đếm.
            </DialogDescription>
          </DialogHeader>
          <div data-scrollbar="slim" className="min-h-0 overflow-y-auto overscroll-contain pr-1">
            <FieldGroup className="[container-type:normal] grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="discrepancy-warehouse">Kho</FieldLabel>
                <NativeSelect
                  id="discrepancy-warehouse"
                  value={props.warehouseId}
                  onChange={(event) => props.onWarehouseChange(event.target.value)}
                >
                  <NativeSelectOption value="">Chọn kho</NativeSelectOption>
                  {props.warehouseOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="discrepancy-product">Sản phẩm</FieldLabel>
                <NativeSelect
                  id="discrepancy-product"
                  value={props.productId}
                  onChange={(event) => props.onProductChange(event.target.value)}
                >
                  <NativeSelectOption value="">Chọn sản phẩm</NativeSelectOption>
                  {props.productOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="discrepancy-slot">Vị trí</FieldLabel>
                <NativeSelect
                  id="discrepancy-slot"
                  value={props.slotId}
                  onChange={(event) => props.onSlotChange(event.target.value)}
                >
                  <NativeSelectOption value="">Chọn vị trí</NativeSelectOption>
                  {props.slotOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="discrepancy-lot">Lô (không bắt buộc)</FieldLabel>
                <NativeSelect
                  id="discrepancy-lot"
                  value={props.lotId}
                  onChange={(event) => props.onLotChange(event.target.value)}
                >
                  <NativeSelectOption value="">Không chọn lô</NativeSelectOption>
                  {props.lotOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {props.canLinkTask ? (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="discrepancy-task">
                    Công việc liên quan (không bắt buộc)
                  </FieldLabel>
                  <NativeSelect
                    id="discrepancy-task"
                    value={props.relatedTaskKey}
                    onChange={(event) => props.onRelatedTaskChange(event.target.value)}
                  >
                    <NativeSelectOption value="">Không liên kết công việc</NativeSelectOption>
                    {props.taskOptions.map((option) => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="discrepancy-type">Loại</FieldLabel>
                <NativeSelect
                  id="discrepancy-type"
                  value={type}
                  onChange={(event) => {
                    const nextType =
                      event.target.value === 'Excess'
                        ? 'Excess'
                        : event.target.value === 'WrongLocation'
                          ? 'WrongLocation'
                          : 'Shortage'
                    setType(nextType)
                    if (nextType === 'Shortage' && difference > 0) setDifference(-difference)
                    if (nextType === 'Excess' && difference < 0) setDifference(-difference)
                  }}
                >
                  <NativeSelectOption value="Shortage">Thiếu</NativeSelectOption>
                  <NativeSelectOption value="Excess">Thừa</NativeSelectOption>
                  <NativeSelectOption value="WrongLocation">Sai vị trí</NativeSelectOption>
                </NativeSelect>
              </Field>
              {type === 'WrongLocation' ? (
                <Field>
                  <FieldLabel htmlFor="discrepancy-correct-slot">Vị trí đúng</FieldLabel>
                  <NativeSelect
                    id="discrepancy-correct-slot"
                    value={props.correctSlotId}
                    onChange={(event) => props.onCorrectSlotChange(event.target.value)}
                  >
                    <NativeSelectOption value="">Chọn vị trí đúng</NativeSelectOption>
                    {props.slotOptions
                      .filter((option) => option.value !== props.slotId)
                      .map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="discrepancy-difference">Chênh lệch quan sát</FieldLabel>
                <Input
                  id="discrepancy-difference"
                  type="number"
                  step="0.001"
                  value={difference}
                  onChange={(event) => setDifference(Number(event.target.value))}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="discrepancy-description">Mô tả</FieldLabel>
                <Textarea
                  id="discrepancy-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="discrepancy-evidence">Tệp bằng chứng</FieldLabel>
                <Input
                  id="discrepancy-evidence"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="shrink-0 border-t pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={
                props.isPending ||
                !props.warehouseId ||
                !props.productId ||
                !props.slotId ||
                difference === 0 ||
                (type === 'Shortage' && difference >= 0) ||
                (type === 'Excess' && difference <= 0) ||
                (type === 'WrongLocation' && !props.correctSlotId) ||
                !description.trim() ||
                !file
              }
              onClick={() => {
                if (file)
                  void props
                    .onCreate({ type, difference, description, file })
                    .then(() => setCreateOpen(false))
              }}
            >
              Gửi báo cáo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(reviewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewItem(null)
            setResponsibleUserId('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo chênh lệch</DialogTitle>
            <DialogDescription>
              Chọn hướng xử lý; điều chỉnh tồn vẫn phải được duyệt ở phiếu điều chỉnh.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Hành động</FieldLabel>
            <NativeSelect
              value={action}
              onChange={(event) =>
                setAction(
                  reviewActions.find((value) => value === event.target.value) ?? 'RequestEvidence'
                )
              }
            >
              <NativeSelectOption value="RequestEvidence">
                Yêu cầu bổ sung bằng chứng
              </NativeSelectOption>
              <NativeSelectOption value="Reject">Từ chối</NativeSelectOption>
              <NativeSelectOption value="LinkDuplicate">Liên kết trùng</NativeSelectOption>
              <NativeSelectOption value="InitiateCycleCount">Tạo kiểm kê</NativeSelectOption>
              <NativeSelectOption value="ProposeAdjustment">Đề xuất điều chỉnh</NativeSelectOption>
            </NativeSelect>
          </Field>
          {action === 'LinkDuplicate' ? (
            <Field>
              <FieldLabel>Báo cáo gốc</FieldLabel>
              <NativeSelect
                value={duplicateId || reviewItem?.duplicateOfReportId || ''}
                onChange={(event) => setDuplicateId(event.target.value)}
              >
                <NativeSelectOption value="">Chọn báo cáo cùng kho</NativeSelectOption>
                {props.items
                  .filter(
                    (candidate) =>
                      candidate.id !== reviewItem?.id &&
                      candidate.warehouseId === reviewItem?.warehouseId &&
                      candidate.status !== 'Duplicate'
                  )
                  .map((candidate) => (
                    <NativeSelectOption key={candidate.id} value={candidate.id}>
                      {candidate.code} · {candidate.sku} · {candidate.slotCode}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
          ) : null}
          {['InitiateCycleCount', 'ProposeAdjustment'].includes(action) ? (
            <Field>
              <FieldLabel>Người phụ trách follow-up</FieldLabel>
              <NativeSelect
                value={responsibleUserId}
                onChange={(event) => setResponsibleUserId(event.target.value)}
              >
                <NativeSelectOption value="">Chọn nhân viên trong kho</NativeSelectOption>
                {props.staffOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <Field>
            <FieldLabel>Lý do</FieldLabel>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              Hủy
            </Button>
            <Button
              disabled={
                props.isPending ||
                !reason.trim() ||
                (action === 'LinkDuplicate' && !(duplicateId || reviewItem?.duplicateOfReportId)) ||
                (['InitiateCycleCount', 'ProposeAdjustment'].includes(action) && !responsibleUserId)
              }
              onClick={() => {
                if (reviewItem)
                  void props
                    .onReview(
                      reviewItem,
                      action,
                      reason,
                      duplicateId || reviewItem.duplicateOfReportId || undefined,
                      responsibleUserId || undefined
                    )
                    .then(() => setReviewItem(null))
              }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(evidenceItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEvidenceItem(null)
            setEvidenceFile(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bổ sung bằng chứng</DialogTitle>
            <DialogDescription>
              Đính kèm tài liệu theo yêu cầu để gửi báo cáo trở lại bước xem xét.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Tệp bằng chứng mới</FieldLabel>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceItem(null)}>
              Hủy
            </Button>
            <Button
              disabled={props.isPending || !evidenceFile}
              onClick={() => {
                if (evidenceItem && evidenceFile)
                  void props.onAddEvidence(evidenceItem, evidenceFile).then(() => {
                    setEvidenceItem(null)
                    setEvidenceFile(null)
                  })
              }}
            >
              Gửi lại xem xét
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
