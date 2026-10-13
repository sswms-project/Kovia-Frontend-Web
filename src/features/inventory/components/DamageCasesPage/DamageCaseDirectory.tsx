'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { APP_ROUTES } from '@/routes/app-routes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
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
import { inventoryService } from '../../services/inventory.service'
import type {
  DamageCase,
  DamageCaseStatus,
  DamageDisposition,
  InventoryFilterOption,
} from '../../types/inventory.types'
import {
  DAMAGE_DISPOSITION_LABELS,
  DAMAGE_STATUS_LABELS,
  formatInventoryDate,
  formatInventoryLocation,
  formatInventoryQuantity,
} from '../../utils/inventory-format'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'
import { DamageCaseDetailDialog } from './DamageCaseDetailDialog'

interface DamageCaseDirectoryProps {
  readonly permissions: readonly string[]
  readonly currentUserId: string | null
  readonly items: readonly DamageCase[]
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly warehouseId: string
  readonly productId: string
  readonly statusFilter: DamageCaseStatus | ''
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly productOptions: readonly InventoryFilterOption[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly canDecide: boolean
  readonly recipientOptions: readonly { value: string; label: string }[]
  readonly areRecipientsLoading: boolean
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onProductChange: (value: string) => void
  readonly onStatusChange: (value: DamageCaseStatus | '') => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onDecide: (
    item: DamageCase,
    disposition: DamageDisposition,
    quantity: number | undefined,
    note: string,
    stockRecipientId?: string
  ) => Promise<void>
  readonly onAddEvidence: (
    item: DamageCase,
    file: File,
    confirmedQuantity?: number
  ) => Promise<void>
}

export function DamageCaseDirectory(props: DamageCaseDirectoryProps) {
  const [selected, setSelected] = useState<DamageCase | null>(null)
  const [disposition, setDisposition] = useState<DamageDisposition>('ContinueHold')
  const [note, setNote] = useState('')
  const [stockRecipientId, setStockRecipientId] = useState('')
  const [detailItem, setDetailItem] = useState<DamageCase | null>(null)
  const [dispositionQuantity, setDispositionQuantity] = useState(0)
  const [evidenceItem, setEvidenceItem] = useState<DamageCase | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [confirmedQuantity, setConfirmedQuantity] = useState(0)

  function canDecideCase(item: DamageCase) {
    return (
      props.canDecide &&
      item.status === 'Open' &&
      item.reportedByUserId !== props.currentUserId &&
      !item.linkedStockIssueRequestId &&
      !item.linkedStockAdjustmentId
    )
  }

  function canAddEvidenceToCase(item: DamageCase) {
    return (
      props.currentUserId === item.reportedByUserId &&
      item.status === 'Open' &&
      (!item.isQuantityConfirmed || Boolean(item.evidenceRequestedAt))
    )
  }

  function openDecision(item: DamageCase) {
    setSelected(item)
    setDispositionQuantity(item.remainingQuantity)
  }

  function openEvidence(item: DamageCase) {
    setEvidenceItem(item)
    setConfirmedQuantity(item.isQuantityConfirmed ? 0 : Math.min(1, item.availableQuantity))
  }

  async function submit() {
    if (!selected) return
    await props.onDecide(
      selected,
      disposition,
      ['ReturnToAvailable', 'InventoryAdjustment', 'SupplierReturn'].includes(disposition)
        ? dispositionQuantity
        : undefined,
      note,
      stockRecipientId || undefined
    )
    setSelected(null)
    setNote('')
    setStockRecipientId('')
    setDispositionQuantity(0)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 items-start gap-3 border-b pb-4">
        <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
          <ShieldAlert />
        </span>
        <div>
          <p className="text-primary text-xs font-medium">Kiểm soát tồn kho</p>
          <h1 className="text-xl font-semibold">Hồ sơ hàng hỏng</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi lượng đang giữ và quyết định xử lý có truy vết.
          </p>
        </div>
      </header>
      <InventoryWorkspaceNavigation currentView="damage-cases" permissions={props.permissions} />
      <OperationalListPanel aria-label="Danh sách sự cố hư hỏng">
        <div className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-5">
          <NativeSelect
            className="w-full"
            aria-label="Lọc theo kho"
            value={props.warehouseId}
            onChange={(event) => props.onWarehouseChange(event.target.value)}
          >
            <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
            {props.warehouseOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            aria-label="Lọc theo sản phẩm"
            value={props.productId}
            onChange={(event) => props.onProductChange(event.target.value)}
          >
            <NativeSelectOption value="">Tất cả sản phẩm</NativeSelectOption>
            {props.productOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            aria-label="Lọc theo trạng thái"
            value={props.statusFilter}
            onChange={(event) => props.onStatusChange(event.target.value as DamageCaseStatus | '')}
          >
            <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
            <NativeSelectOption value="Open">Đang giữ</NativeSelectOption>
            <NativeSelectOption value="Resolved">Đã xử lý</NativeSelectOption>
          </NativeSelect>
          <Input
            aria-label="Từ ngày"
            type="date"
            value={props.dateFrom}
            onChange={(event) => props.onDateFromChange(event.target.value)}
          />
          <Input
            aria-label="Đến ngày"
            type="date"
            value={props.dateTo}
            onChange={(event) => props.onDateToChange(event.target.value)}
          />
        </div>
        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải hồ sơ hàng hỏng" onRetry={props.onRetry} />
        ) : props.items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có hồ sơ hàng hỏng"
            description="Các báo cáo hàng hỏng sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10">Sản phẩm</TableHead>
                  <TableHead className="sticky top-0 z-10">Kho / vị trí</TableHead>
                  <TableHead className="sticky top-0 z-10 text-right">Số lượng</TableHead>
                  <TableHead className="sticky top-0 z-10">Lý do / bằng chứng</TableHead>
                  <TableHead className="sticky top-0 z-10">Nguồn</TableHead>
                  <TableHead className="sticky top-0 z-10">Người báo</TableHead>
                  <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground font-mono text-xs">{item.sku}</p>
                    </TableCell>
                    <TableCell>
                      <p>{item.warehouseName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatInventoryLocation(item)}
                        {item.lotNumber ? ` · lô ${item.lotNumber}` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.isQuantityConfirmed ? (
                        <>
                          {formatInventoryQuantity(item.resolvedQuantity)} /{' '}
                          {formatInventoryQuantity(item.quantity)}
                          <span className="text-muted-foreground block text-xs">
                            còn {formatInventoryQuantity(item.remainingQuantity)}
                          </span>
                        </>
                      ) : (
                        'Chờ xác nhận'
                      )}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="truncate">{item.reason}</p>
                      {item.evidence.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className="text-primary block max-w-full truncate text-left text-xs underline"
                          onClick={() =>
                            void inventoryService.downloadEvidence(file.id, file.fileName)
                          }
                        >
                          {file.fileName}
                        </button>
                      ))}
                      <p className="text-muted-foreground text-xs">
                        {formatInventoryDate(item.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {item.relatedTaskType === 'CycleCount' && item.relatedTaskId ? (
                        <Link
                          href={APP_ROUTES.cycleCountDetail(item.relatedTaskId)}
                          className="text-primary text-xs underline-offset-2 hover:underline"
                        >
                          Phiếu kiểm kê
                          {item.relatedTaskCode ? (
                            <span className="block font-mono">{item.relatedTaskCode}</span>
                          ) : null}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">Báo tay</span>
                      )}
                    </TableCell>
                    <TableCell>{item.reportedByName}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'Open' ? 'outline' : 'secondary'}>
                        {DAMAGE_STATUS_LABELS[item.status]}
                      </Badge>
                      {item.status === 'Resolved' && item.disposition ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {DAMAGE_DISPOSITION_LABELS[item.disposition]}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setDetailItem(item)}>
                          Chi tiết
                        </Button>
                        {canDecideCase(item) ? (
                          <Button size="sm" onClick={() => openDecision(item)}>
                            Chọn xử lý
                          </Button>
                        ) : null}
                        {canAddEvidenceToCase(item) ? (
                          <Button size="sm" variant="outline" onClick={() => openEvidence(item)}>
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
      <DamageCaseDetailDialog
        item={detailItem}
        canDecide={detailItem ? canDecideCase(detailItem) : false}
        canAddEvidence={detailItem ? canAddEvidenceToCase(detailItem) : false}
        onClose={() => setDetailItem(null)}
        onDecide={(item) => {
          setDetailItem(null)
          openDecision(item)
        }}
        onAddEvidence={(item) => {
          setDetailItem(null)
          openEvidence(item)
        }}
      />
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quyết định xử lý hàng hỏng</DialogTitle>
            <DialogDescription>
              Quyết định được ghi audit; chỉ điều chỉnh hoặc xuất hàng mới làm giảm OnHand.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="damage-disposition">Phương án</FieldLabel>
            <NativeSelect
              id="damage-disposition"
              value={disposition}
              onChange={(event) => setDisposition(event.target.value as DamageDisposition)}
            >
              <NativeSelectOption value="ContinueHold">Tiếp tục giữ</NativeSelectOption>
              <NativeSelectOption value="ReturnToAvailable">Trả lại khả dụng</NativeSelectOption>
              <NativeSelectOption value="InventoryAdjustment">
                Tạo phiếu điều chỉnh
              </NativeSelectOption>
              <NativeSelectOption value="SupplierReturn">
                Tạo phiếu trả nhà cung cấp
              </NativeSelectOption>
              <NativeSelectOption value="RequestEvidence">
                Yêu cầu bổ sung bằng chứng
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          {['ReturnToAvailable', 'InventoryAdjustment', 'SupplierReturn'].includes(disposition) ? (
            <Field>
              <FieldLabel htmlFor="damage-quantity">
                Số lượng xử lý (còn{' '}
                {selected ? formatInventoryQuantity(selected.remainingQuantity) : 0})
              </FieldLabel>
              <Input
                id="damage-quantity"
                type="number"
                min="0.001"
                step="0.001"
                max={selected?.remainingQuantity}
                value={dispositionQuantity}
                onChange={(event) => setDispositionQuantity(Number(event.target.value))}
              />
            </Field>
          ) : null}
          {disposition === 'SupplierReturn' ? (
            <Field>
              <FieldLabel htmlFor="damage-recipient">Đơn vị nhận hàng trả</FieldLabel>
              <NativeSelect
                id="damage-recipient"
                value={stockRecipientId}
                disabled={props.areRecipientsLoading}
                onChange={(event) => setStockRecipientId(event.target.value)}
              >
                <NativeSelectOption value="">Chọn đơn vị nhận</NativeSelectOption>
                {props.recipientOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="damage-note">Ghi chú quyết định</FieldLabel>
            <Textarea
              id="damage-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Hủy
            </Button>
            <Button
              disabled={
                props.isPending ||
                (disposition === 'SupplierReturn' && !stockRecipientId) ||
                (['ReturnToAvailable', 'InventoryAdjustment', 'SupplierReturn'].includes(
                  disposition
                ) &&
                  (dispositionQuantity <= 0 ||
                    dispositionQuantity > (selected?.remainingQuantity ?? 0))) ||
                (disposition === 'RequestEvidence' && !note.trim())
              }
              onClick={() => void submit()}
            >
              {props.isPending ? 'Đang lưu...' : 'Xác nhận'}
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
            setConfirmedQuantity(0)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bổ sung bằng chứng hàng hỏng</DialogTitle>
            <DialogDescription>
              Gửi tài liệu kiểm tra và xác nhận số lượng nếu hồ sơ ban đầu chỉ là quan sát.
            </DialogDescription>
          </DialogHeader>
          {evidenceItem && !evidenceItem.isQuantityConfirmed ? (
            <Field>
              <FieldLabel htmlFor="damage-confirmed-quantity">Số lượng hỏng đã xác nhận</FieldLabel>
              <Input
                id="damage-confirmed-quantity"
                type="number"
                min="0.001"
                step="0.001"
                max={evidenceItem.availableQuantity}
                value={confirmedQuantity}
                onChange={(event) => setConfirmedQuantity(Number(event.target.value))}
              />
              <p className="text-muted-foreground text-xs">
                Tồn khả dụng hiện tại: {formatInventoryQuantity(evidenceItem.availableQuantity)}
              </p>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="damage-evidence-file">Tệp bằng chứng mới</FieldLabel>
            <Input
              id="damage-evidence-file"
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
              disabled={
                props.isPending ||
                !evidenceFile ||
                (Boolean(evidenceItem && !evidenceItem.isQuantityConfirmed) &&
                  (confirmedQuantity <= 0 ||
                    confirmedQuantity > (evidenceItem?.availableQuantity ?? 0) ||
                    !evidenceItem?.availableStockVersion))
              }
              onClick={() => {
                if (evidenceItem && evidenceFile)
                  void props
                    .onAddEvidence(
                      evidenceItem,
                      evidenceFile,
                      evidenceItem.isQuantityConfirmed ? undefined : confirmedQuantity
                    )
                    .then(() => {
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
