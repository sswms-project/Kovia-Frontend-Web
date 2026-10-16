'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { DatePickerField } from '@/components/forms/DatePickerField'
import { operationalToday } from '@/lib/operational-date-time'
import { OpeningStockApprovalDialog } from '../OpeningStockApprovalDialog'
import type { UseFormReturn } from 'react-hook-form'
import { Map as MapIcon, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { TransferSlotMapDialog } from '@/features/transfer/components/TransferFormPage/TransferSlotMapDialog'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { useImportNavigation } from '@/components/operations/use-import-navigation'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import type { CreateOpeningStockFormValues } from '../../schemas/create-opening-stock.schema'
import type {
  InventoryFilterOption,
  OpeningStockRecord,
  OpeningStockStatus,
} from '../../types/inventory.types'
import { inventoryService } from '../../services/inventory.service'
import {
  formatInventoryDate,
  formatInventoryQuantity,
  formatQualityStatus,
  formatEligibilityStatus,
} from '../../utils/inventory-format'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'
import { normalizeOpeningStockLotNumber } from '../../utils/opening-stock-import'

interface OpeningStockDirectoryProps {
  readonly isCreateUncertain: boolean
  readonly search: string
  readonly lookupSearch: { product: string; location: string; lot: string }
  readonly onLookupSearch: (kind: 'product' | 'location' | 'lot', value: string) => void
  readonly lookupError: boolean
  readonly onLookupRetry: () => void
  readonly onSearchChange: (value: string) => void
  readonly permissions: readonly string[]
  readonly currentUserId: string | null
  readonly items: readonly OpeningStockRecord[]
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly filterWarehouseId: string
  readonly statusFilter: OpeningStockStatus | ''
  readonly dateFrom: string
  readonly dateTo: string
  readonly form: UseFormReturn<CreateOpeningStockFormValues>
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly managedWarehouseOptions: readonly InventoryFilterOption[]
  readonly productOptions: readonly (InventoryFilterOption & {
    unitId: string
    unitName: string
    isLotTracked?: boolean
  })[]
  readonly slotOptions: readonly InventoryFilterOption[]
  readonly lotOptions: readonly InventoryFilterOption[]
  readonly areOptionsLoading: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly canCreate: boolean
  readonly canApprove: boolean
  readonly canSelfApprove: boolean
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onFilterWarehouseChange: (value: string) => void
  readonly onStatusFilterChange: (value: OpeningStockStatus | '') => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onCreate: (
    values: CreateOpeningStockFormValues,
    lines: OpeningStockDraftLine[]
  ) => Promise<void>
  readonly onUpdate: (item: OpeningStockRecord, lines: OpeningStockDraftLine[]) => Promise<void>
  readonly onAction: (
    item: OpeningStockRecord,
    action: 'submit' | 'approve' | 'review' | 'cancel' | 'withdraw',
    decision?: 'Returned' | 'Rejected' | 'Cancelled',
    reason?: string,
    selfApprovalAcknowledged?: boolean
  ) => Promise<void>
}

export interface OpeningStockDraftLine {
  id?: string
  newLot?: { lotNumber: string; manufacturedDate: string | null; expiryDate: string | null }
  productId: string
  slotId: string
  lotId?: string
  quantity: number
  enteredUnitId: string
  enteredUnitName: string
  conversionFactor: number
  qualityStatus: 'Good' | 'Damaged'
  eligibilityStatus: 'Available' | 'InspectionHold' | 'DamageHold' | 'Quarantine'
  productLabel: string
  slotLabel: string
  lotLabel?: string
}

function statusLabel(status: OpeningStockStatus) {
  return (
    {
      Draft: 'Nháp',
      PendingApproval: 'Chờ duyệt',
      Returned: 'Trả lại',
      Rejected: 'Từ chối',
      Posted: 'Đã ghi sổ',
      Cancelled: 'Đã hủy',
    } as const
  )[status]
}

export function OpeningStockDirectory(props: OpeningStockDirectoryProps) {
  const filterId = useId()
  const saveLock = useRef(false)
  const [approveItem, setApproveItem] = useState<OpeningStockRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [mapWarehouseId, setMapWarehouseId] = useState<string | null>(null)
  const restoreMapFocus = useRef(false)
  const navigation = useImportNavigation(createOpen, props.isPending || props.isCreateUncertain)
  const [reviewItem, setReviewItem] = useState<OpeningStockRecord | null>(null)
  const [decision, setDecision] = useState<'Returned' | 'Rejected' | 'Cancelled' | 'Withdraw'>(
    'Returned'
  )
  const [reason, setReason] = useState('')
  const [selfApprovalAcknowledged, setSelfApprovalAcknowledged] = useState(false)
  const [draftLines, setDraftLines] = useState<OpeningStockDraftLine[]>([])
  const [editItem, setEditItem] = useState<OpeningStockRecord | null>(null)
  const [detailItem, setDetailItem] = useState<OpeningStockRecord | null>(null)
  const [chosenProduct, setChosenProduct] = useState<
    OpeningStockDirectoryProps['productOptions'][number] | null
  >(null)
  const [chosenSlot, setChosenSlot] = useState<InventoryFilterOption | null>(null)
  const [chosenLot, setChosenLot] = useState<InventoryFilterOption | null>(null)
  const productId = props.form.watch('productId')
  const slotId = props.form.watch('slotId')
  const lotId = props.form.watch('lotId')
  const productOptions =
    chosenProduct &&
    chosenProduct.value === productId &&
    !props.productOptions.some((option) => option.value === productId)
      ? [chosenProduct, ...props.productOptions]
      : props.productOptions
  const slotOptions =
    chosenSlot &&
    chosenSlot.value === slotId &&
    !props.slotOptions.some((option) => option.value === slotId)
      ? [chosenSlot, ...props.slotOptions]
      : props.slotOptions
  const lotOptions =
    chosenLot &&
    chosenLot.value === lotId &&
    !props.lotOptions.some((option) => option.value === lotId)
      ? [chosenLot, ...props.lotOptions]
      : props.lotOptions
  const errors = props.form.formState.errors
  function toDraftLine(values: CreateOpeningStockFormValues): OpeningStockDraftLine {
    const selectedProduct = productOptions.find((option) => option.value === values.productId)
    return {
      productId: values.productId,
      slotId: values.slotId,
      ...(values.lotId ? { lotId: values.lotId } : {}),
      ...(values.newLotNumber
        ? {
            newLot: {
              lotNumber: values.newLotNumber,
              manufacturedDate: values.manufacturedDate || null,
              expiryDate: values.expiryDate || null,
            },
            lotLabel: values.newLotNumber,
          }
        : {}),
      quantity: values.quantity,
      enteredUnitId: selectedProduct?.unitId ?? '',
      enteredUnitName: selectedProduct?.unitName ?? '',
      conversionFactor: 1,
      qualityStatus: values.qualityStatus,
      eligibilityStatus: values.eligibilityStatus,
      productLabel: selectedProduct?.label ?? values.productId,
      slotLabel:
        slotOptions.find((option) => option.value === values.slotId)?.label ?? values.slotId,
      ...(values.lotId
        ? {
            lotLabel:
              lotOptions.find((option) => option.value === values.lotId)?.label ?? values.lotId,
          }
        : {}),
    }
  }
  function resetLineFields() {
    setChosenProduct(null)
    setChosenSlot(null)
    setChosenLot(null)
    props.form.setValue('productId', '')
    props.form.setValue('slotId', '')
    props.form.setValue('lotId', '')
    props.form.setValue('newLotNumber', '')
    props.form.setValue('manufacturedDate', '')
    props.form.setValue('expiryDate', '')
    props.form.setValue('quantity', 1)
    props.form.setValue('qualityStatus', 'Good')
    props.form.setValue('eligibilityStatus', 'Available')
    props.form.setValue('acknowledgePendingLots', false)
  }
  async function addLine() {
    if (props.areOptionsLoading || props.isPending) return
    if (draftLines.length >= 200) {
      props.form.setError('productId', { message: 'Mỗi phiếu tối đa 200 dòng.' })
      return
    }
    const valid = await props.form.trigger([
      'productId',
      'slotId',
      'lotId',
      'quantity',
      'qualityStatus',
      'eligibilityStatus',
      'newLotNumber',
      'manufacturedDate',
      'expiryDate',
    ])
    if (!valid) return
    const values = props.form.getValues()
    const line = toDraftLine(values)
    if (
      productOptions.find((p) => p.value === line.productId)?.isLotTracked &&
      !line.lotId &&
      !line.newLot
    ) {
      props.form.setError('lotId', { message: 'Hàng theo dõi lô phải chọn hoặc khai báo lô.' })
      return
    }
    const duplicate = draftLines.some(
      (item) =>
        item.productId === line.productId &&
        item.slotId === line.slotId &&
        item.lotId === line.lotId &&
        normalizeOpeningStockLotNumber(item.newLot?.lotNumber ?? '') ===
          normalizeOpeningStockLotNumber(line.newLot?.lotNumber ?? '') &&
        item.qualityStatus === line.qualityStatus &&
        item.eligibilityStatus === line.eligibilityStatus
    )
    if (duplicate) {
      props.form.setError('productId', { message: 'Phạm vi tồn kho này đã có trong chứng từ.' })
      return
    }
    setDraftLines((current) => [...current, line])
    resetLineFields()
  }
  async function create(values: CreateOpeningStockFormValues) {
    const lines = [...draftLines, toDraftLine(values)]
    await props.onCreate(values, lines)
    setDraftLines([])
    setCreateOpen(false)
  }
  async function saveDraft() {
    if (props.areOptionsLoading) return
    const values = props.form.getValues()
    if (
      draftLines.length > 0 &&
      (values.productId ||
        values.slotId ||
        values.lotId ||
        values.newLotNumber ||
        values.manufacturedDate ||
        values.expiryDate ||
        values.quantity !== 1 ||
        values.qualityStatus !== 'Good' ||
        values.eligibilityStatus !== 'Available')
    ) {
      props.form.setError(
        'productId',
        { message: 'Còn một dòng chưa được thêm. Bấm “Thêm dòng và nhập tiếp” trước khi lưu.' },
        { shouldFocus: true }
      )
      return
    }
    const valid = await props.form.trigger(
      editItem?.isLegacyDate ? ['warehouseId'] : ['warehouseId', 'effectiveDate']
    )
    if (!valid) return
    if (draftLines.some((line) => line.newLot) && !props.form.getValues('acknowledgePendingLots')) {
      props.form.setError('acknowledgePendingLots', {
        message: 'Xác nhận thông tin lô mới trước khi lưu.',
      })
      return
    }
    if (editItem) {
      if (draftLines.length === 0) return
      await props.onUpdate(editItem, draftLines)
      setDraftLines([])
      setEditItem(null)
      setCreateOpen(false)
      return
    }
    if (draftLines.length === 0) {
      await props.form.handleSubmit(create)()
      return
    }
    const commonFieldsValid = await props.form.trigger([
      'warehouseId',
      'effectiveDate',
      'evidenceFile',
    ])
    if (!commonFieldsValid) return
    await props.onCreate(props.form.getValues(), draftLines)
    setDraftLines([])
    setCreateOpen(false)
  }
  async function createDraft() {
    if (saveLock.current || props.isPending) return
    saveLock.current = true
    try {
      await saveDraft()
    } catch {
      /* The page reports the error; keep all unsaved rows in this dialog. */
    } finally {
      saveLock.current = false
    }
  }
  function openCreate() {
    setChosenProduct(null)
    setChosenSlot(null)
    setChosenLot(null)
    setEditItem(null)
    setDraftLines([])
    props.form.reset({
      warehouseId: '',
      effectiveDate: operationalToday(),
      newLotNumber: '',
      manufacturedDate: '',
      expiryDate: '',
      acknowledgePendingLots: false,
      productId: '',
      slotId: '',
      lotId: '',
      quantity: 1,
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
    })
    setCreateOpen(true)
  }
  function openEdit(item: OpeningStockRecord) {
    setChosenProduct(null)
    setChosenSlot(null)
    setChosenLot(null)
    setEditItem(item)
    setDraftLines(
      item.lines.map((line) => ({
        id: line.id,
        ...(!line.lotId && line.lotNumberSnapshot
          ? {
              newLot: {
                lotNumber: line.lotNumberSnapshot,
                manufacturedDate: line.manufacturedDateSnapshot ?? null,
                expiryDate: line.expiryDateSnapshot ?? null,
              },
            }
          : {}),
        productId: line.productId,
        slotId: line.slotId,
        ...(line.lotId ? { lotId: line.lotId } : {}),
        quantity: line.quantity,
        enteredUnitId: line.enteredUnitId,
        enteredUnitName: line.enteredUnitName,
        conversionFactor: line.conversionFactorSnapshot,
        qualityStatus: line.qualityStatus === 'Damaged' ? 'Damaged' : 'Good',
        eligibilityStatus: line.eligibilityStatus,
        productLabel: `${line.sku} · ${line.productName}`,
        slotLabel: line.slotCode,
        ...(line.lotNumber ? { lotLabel: line.lotNumber } : {}),
      }))
    )
    props.form.reset({
      warehouseId: item.warehouseId,
      effectiveDate: item.effectiveDate ?? operationalToday(),
      newLotNumber: '',
      manufacturedDate: '',
      expiryDate: '',
      acknowledgePendingLots: false,
      productId: '',
      slotId: '',
      lotId: '',
      quantity: 1,
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
    })
    setCreateOpen(true)
  }
  async function review() {
    if (!reviewItem) return
    if (decision === 'Withdraw') await props.onAction(reviewItem, 'withdraw', undefined, reason)
    else
      await props.onAction(
        reviewItem,
        decision === 'Cancelled' ? 'cancel' : 'review',
        decision,
        reason,
        selfApprovalAcknowledged
      )
    setReviewItem(null)
    setReason('')
    setSelfApprovalAcknowledged(false)
  }

  async function approve(item: OpeningStockRecord) {
    setApproveItem(item)
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b pb-4">
        <div className="flex gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <PackagePlus />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Kiểm soát tồn kho</p>
            <h1 className="text-xl font-semibold">Tồn kho đầu kỳ</h1>
            <p className="text-muted-foreground text-sm">
              Lập phiếu từ kết quả kiểm đếm; tồn kho chỉ tăng sau khi duyệt.
            </p>
          </div>
        </div>
        {props.canCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory/opening-stocks/import">Nhập từ tệp</Link>
            </Button>
            <Button onClick={openCreate}>Tạo chứng từ</Button>
          </div>
        ) : null}
      </header>
      <InventoryWorkspaceNavigation currentView="opening-stocks" permissions={props.permissions} />
      <OperationalListPanel aria-label="Danh sách chứng từ tồn đầu kỳ">
        <FieldGroup
          role="search"
          aria-label="Tìm kiếm và lọc chứng từ tồn đầu"
          className="grid shrink-0 grid-cols-2 items-end gap-3 border-b p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,16rem)_10rem_10rem_10rem]"
        >
          <Field className="col-span-2 min-w-0 gap-1.5 xl:col-span-1">
            <FieldLabel htmlFor={`${filterId}-search`}>Tìm kiếm</FieldLabel>
            <Input
              id={`${filterId}-search`}
              name="openingStockSearch"
              aria-label="Tìm mã chứng từ"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              placeholder="Tìm mã chứng từ…"
              value={props.search}
              onChange={(event) => props.onSearchChange(event.target.value)}
            />
          </Field>
          <Field className="min-w-0 gap-1.5">
            <FieldLabel htmlFor={`${filterId}-warehouse`}>Kho</FieldLabel>
            <NativeSelect
              id={`${filterId}-warehouse`}
              name="openingStockWarehouse"
              className="w-full min-w-0"
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
          <Field className="min-w-0 gap-1.5">
            <FieldLabel htmlFor={`${filterId}-status`}>Trạng thái</FieldLabel>
            <NativeSelect
              id={`${filterId}-status`}
              name="openingStockStatus"
              className="w-full min-w-0"
              aria-label="Lọc theo trạng thái"
              value={props.statusFilter}
              onChange={(event) =>
                props.onStatusFilterChange(event.target.value as OpeningStockStatus | '')
              }
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              <NativeSelectOption value="Draft">Nháp</NativeSelectOption>
              <NativeSelectOption value="PendingApproval">Chờ duyệt</NativeSelectOption>
              <NativeSelectOption value="Returned">Trả lại</NativeSelectOption>
              <NativeSelectOption value="Rejected">Từ chối</NativeSelectOption>
              <NativeSelectOption value="Posted">Đã ghi sổ</NativeSelectOption>
              <NativeSelectOption value="Cancelled">Đã hủy</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field className="min-w-0 gap-1.5">
            <FieldLabel htmlFor={`${filterId}-from`}>Ngày ghi nhận từ</FieldLabel>
            <Input
              id={`${filterId}-from`}
              name="openingStockDateFrom"
              type="date"
              value={props.dateFrom}
              onChange={(event) => props.onDateFromChange(event.target.value)}
            />
          </Field>
          <Field className="min-w-0 gap-1.5">
            <FieldLabel htmlFor={`${filterId}-to`}>Ngày ghi nhận đến</FieldLabel>
            <Input
              id={`${filterId}-to`}
              name="openingStockDateTo"
              type="date"
              value={props.dateTo}
              min={props.dateFrom || undefined}
              onChange={(event) => props.onDateToChange(event.target.value)}
            />
          </Field>
        </FieldGroup>
        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải chứng từ tồn đầu" onRetry={props.onRetry} />
        ) : props.items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có chứng từ tồn đầu"
            description="Tạo chứng từ từ kết quả kiểm đếm ban đầu."
          />
        ) : (
          <div data-scrollbar="slim" className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10">Chứng từ</TableHead>
                  <TableHead className="sticky top-0 z-10">Kho</TableHead>
                  <TableHead className="sticky top-0 z-10">Ngày ghi nhận</TableHead>
                  <TableHead className="sticky top-0 z-10">Dòng hàng</TableHead>
                  <TableHead className="sticky top-0 z-10">Bằng chứng</TableHead>
                  <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                  <TableHead className="sticky top-0 z-10">Người lập</TableHead>
                  <TableHead className="sticky top-0 z-10">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-mono font-medium">{item.code}</p>
                      <p className="text-muted-foreground text-xs">
                        v{item.revision} · {formatInventoryDate(item.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>{item.warehouseName}</TableCell>
                    <TableCell>
                      {item.effectiveDate ?? 'Theo lịch sử'}
                      {item.isLegacyDate ? (
                        <p className="text-muted-foreground text-xs">Phiếu cũ</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.lines.length} dòng</TableCell>
                    <TableCell className="max-w-48">
                      {item.evidence.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className="text-primary block max-w-full truncate text-left underline"
                          onClick={() =>
                            void inventoryService.downloadEvidence(file.id, file.fileName)
                          }
                        >
                          {file.fileName}
                        </button>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel(item.status)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-40 wrap-anywhere whitespace-normal">
                      {item.createdByName}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setDetailItem(item)}>
                          Chi tiết
                        </Button>
                        {(item.status === 'Draft' || item.status === 'Returned') &&
                        props.canCreate &&
                        (item.createdByUserId === props.currentUserId ||
                          item.submittedByUserId === props.currentUserId) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={props.isPending}
                            onClick={() => openEdit(item)}
                          >
                            Sửa
                          </Button>
                        ) : null}
                        {(item.status === 'Draft' || item.status === 'Returned') &&
                        props.canCreate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={props.isPending}
                            onClick={() => void props.onAction(item, 'submit')}
                          >
                            Gửi duyệt
                          </Button>
                        ) : null}
                        {item.status === 'PendingApproval' &&
                        props.canApprove &&
                        ((item.createdByUserId !== props.currentUserId &&
                          item.submittedByUserId !== props.currentUserId) ||
                          props.canSelfApprove) ? (
                          <Button
                            size="sm"
                            disabled={props.isPending}
                            onClick={() => void approve(item)}
                          >
                            Duyệt & ghi sổ
                          </Button>
                        ) : null}
                        {item.status === 'PendingApproval' &&
                        props.canApprove &&
                        ((item.createdByUserId !== props.currentUserId &&
                          item.submittedByUserId !== props.currentUserId) ||
                          props.canSelfApprove) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDecision('Returned')
                              setReviewItem(item)
                            }}
                          >
                            Phản hồi
                          </Button>
                        ) : null}
                        {item.status === 'PendingApproval' &&
                        props.canCreate &&
                        (item.createdByUserId === props.currentUserId ||
                          item.submittedByUserId === props.currentUserId) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDecision('Withdraw')
                              setReviewItem(item)
                            }}
                          >
                            Rút lại
                          </Button>
                        ) : null}
                        {['Draft', 'PendingApproval'].includes(item.status) &&
                        props.canCreate &&
                        (item.createdByUserId === props.currentUserId ||
                          item.submittedByUserId === props.currentUserId) ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDecision('Cancelled')
                              setReviewItem(item)
                            }}
                          >
                            Hủy
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
        <DialogContent className="flex max-h-[90dvh] min-h-0 flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{detailItem?.code}</DialogTitle>
            <DialogDescription>Chi tiết chứng từ và các mốc xử lý đã ghi nhận.</DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div
              data-scrollbar="slim"
              className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain text-sm"
              aria-label="Nội dung phiếu tồn đầu"
              tabIndex={0}
            >
              <div className="grid gap-1">
                <p>
                  <strong>Kho:</strong> {detailItem.warehouseName}
                </p>
                <p>
                  <strong>Trạng thái:</strong> {statusLabel(detailItem.status)}
                </p>
                <p>
                  <strong>Ngày ghi nhận:</strong> {detailItem.effectiveDate ?? 'Theo lịch sử'}
                  {detailItem.isLegacyDate ? ' (dữ liệu cũ)' : ''}
                </p>
                {detailItem.decisionReason ? (
                  <p>
                    <strong>Lý do quyết định:</strong> {detailItem.decisionReason}
                  </p>
                ) : null}
              </div>
              <div className="border">
                <p className="border-b px-3 py-2 font-medium">Các dòng tồn đầu</p>
                {detailItem.lines.map((line) => (
                  <p key={line.id} className="border-b px-3 py-2 wrap-anywhere last:border-b-0">
                    {line.sku} · {line.productName} · {line.slotCode}
                    {line.lotNumber ? ` · lô ${line.lotNumber}` : ''} · nhập{' '}
                    {formatInventoryQuantity(line.enteredQuantity)} {line.enteredUnitName} ×{' '}
                    {line.conversionFactorSnapshot} = {formatInventoryQuantity(line.baseQuantity)}{' '}
                    đơn vị cơ sở · {formatQualityStatus(line.qualityStatus)} /{' '}
                    {formatEligibilityStatus(line.eligibilityStatus)}
                    {line.lotNumberSnapshot
                      ? ` · NSX ${line.manufacturedDateSnapshot ?? '—'} · HSD ${line.expiryDateSnapshot ?? '—'}${!line.lotId ? ' · Sẽ tạo lô khi duyệt' : ''}`
                      : ''}
                    {line.sourceRowNumber
                      ? ` · Nguồn ${line.sourceSheetName}:${line.sourceRowNumber}`
                      : ''}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-medium">Lịch sử trạng thái</p>
                <p>
                  Đã tạo bởi {detailItem.createdByName} ·{' '}
                  {formatInventoryDate(detailItem.createdAt)}
                </p>
                {detailItem.submittedAt ? (
                  <p>Đã gửi duyệt · {formatInventoryDate(detailItem.submittedAt)}</p>
                ) : null}
                {detailItem.approvedAt ? (
                  <p>Đã ghi sổ · {formatInventoryDate(detailItem.approvedAt)}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDetailItem(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={createOpen && !mapWarehouseId}
        onOpenChange={(open) => {
          if (mapWarehouseId || props.isPending || props.isCreateUncertain || saveLock.current)
            return
          setCreateOpen(open)
          if (!open) {
            setDraftLines([])
            setEditItem(null)
          }
        }}
      >
        <DialogContent
          data-scrollbar="slim"
          className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
          onEscapeKeyDown={(event) => {
            if (
              event.target instanceof Element &&
              event.target
                .closest('[role="dialog"]')
                ?.querySelector('[role="combobox"][aria-expanded="true"]')
            )
              event.preventDefault()
          }}
          onCloseAutoFocus={(event) => {
            if (mapWarehouseId) event.preventDefault()
          }}
          onOpenAutoFocus={(event) => {
            if (restoreMapFocus.current) {
              event.preventDefault()
              restoreMapFocus.current = false
              document.getElementById('opening-slotId')?.focus()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{editItem ? `Sửa ${editItem.code}` : 'Tạo chứng từ tồn đầu'}</DialogTitle>
            <DialogDescription>
              Thêm các dòng kiểm đếm thuộc cùng một kho trước khi lưu chứng từ.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void createDraft()
            }}
          >
            <fieldset disabled={props.isPending || props.isCreateUncertain} className="grid gap-3">
              {!editItem?.isLegacyDate ? (
                <DatePickerField
                  id="opening-effective-date"
                  label="Ngày ghi nhận tồn đầu"
                  required
                  value={props.form.watch('effectiveDate')}
                  onChange={(value) =>
                    props.form.setValue('effectiveDate', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  error={errors.effectiveDate?.message}
                />
              ) : (
                <p className="text-xs">Phiếu cũ giữ nguyên ngày ghi sổ lịch sử.</p>
              )}
              {props.lookupError ? (
                <p role="alert">
                  Không tải được danh mục.{' '}
                  <Button type="button" variant="outline" onClick={props.onLookupRetry}>
                    Thử lại
                  </Button>
                </p>
              ) : null}
              {(
                [
                  ['warehouseId', 'Kho', props.managedWarehouseOptions, 'Chọn kho'],
                  ['productId', 'Sản phẩm', productOptions, 'Chọn sản phẩm'],
                  [
                    'slotId',
                    'Vị trí',
                    slotOptions,
                    props.form.watch('warehouseId') ? 'Chọn vị trí' : 'Chọn kho trước',
                  ],
                  [
                    'lotId',
                    'Lô có sẵn (hàng theo lô phải chọn hoặc khai báo lô mới)',
                    lotOptions,
                    props.form.watch('productId') ? 'Không chọn lô' : 'Chọn sản phẩm trước',
                  ],
                ] as const
              ).map(([name, label, options, placeholder]) => (
                <Field key={name} data-invalid={Boolean(errors[name])}>
                  <FieldLabel htmlFor={`opening-${name}`}>{label}</FieldLabel>
                  {name === 'slotId' ? (
                    <LookupCombobox
                      id="opening-slotId"
                      value={slotId}
                      options={slotOptions}
                      selectedOption={chosenSlot?.value === slotId ? chosenSlot : undefined}
                      placeholder={placeholder}
                      emptyMessage="Không có vị trí phù hợp. Thử tìm lại hoặc chọn trên sơ đồ."
                      ariaLabel="Vị trí"
                      isLoading={props.areOptionsLoading}
                      isInvalid={Boolean(errors.slotId)}
                      disabled={
                        !props.form.watch('warehouseId') ||
                        props.isPending ||
                        props.isCreateUncertain
                      }
                      onSearchChange={(value) => props.onLookupSearch('location', value)}
                      onChange={(value, option) => {
                        setChosenSlot(option ?? (chosenSlot?.value === value ? chosenSlot : null))
                        props.form.setValue('slotId', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                      footerAction={{
                        label: 'Chọn trên sơ đồ',
                        icon: <MapIcon aria-hidden="true" />,
                        onClick: () => {
                          const warehouseId = props.form.getValues('warehouseId')
                          if (!warehouseId || props.isPending || props.isCreateUncertain) return
                          setMapWarehouseId(warehouseId)
                        },
                      }}
                    />
                  ) : name === 'productId' ? (
                    <LookupCombobox
                      id="opening-productId"
                      value={productId}
                      options={productOptions}
                      selectedOption={
                        chosenProduct?.value === productId ? chosenProduct : undefined
                      }
                      placeholder={placeholder}
                      emptyMessage="Không tìm thấy hàng hóa. Thử mã hoặc tên khác."
                      ariaLabel="Sản phẩm"
                      isLoading={props.areOptionsLoading}
                      isInvalid={Boolean(errors.productId)}
                      disabled={
                        !props.form.watch('warehouseId') ||
                        props.isPending ||
                        props.isCreateUncertain
                      }
                      onSearchChange={(value) => props.onLookupSearch('product', value)}
                      onChange={(value) => {
                        setChosenProduct(
                          productOptions.find((option) => option.value === value) ?? null
                        )
                        props.form.setValue('productId', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                        setChosenLot(null)
                        props.form.setValue('lotId', '')
                        props.form.setValue('newLotNumber', '')
                        props.form.setValue('manufacturedDate', '')
                        props.form.setValue('expiryDate', '')
                      }}
                    />
                  ) : name === 'lotId' ? (
                    <LookupCombobox
                      id="opening-lotId"
                      value={lotId ?? ''}
                      options={lotOptions}
                      selectedOption={chosenLot?.value === lotId ? chosenLot : undefined}
                      placeholder={placeholder}
                      emptyMessage="Không tìm thấy lô. Thử số lô khác hoặc khai báo lô mới."
                      ariaLabel={label}
                      isLoading={props.areOptionsLoading}
                      isInvalid={Boolean(errors.lotId)}
                      disabled={!productId || props.isPending || props.isCreateUncertain}
                      onSearchChange={(value) => props.onLookupSearch('lot', value)}
                      onChange={(value, option) => {
                        setChosenLot(option ?? (chosenLot?.value === value ? chosenLot : null))
                        props.form.setValue('lotId', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                    />
                  ) : (
                    <NativeSelect
                      id={`opening-${name}`}
                      disabled={
                        props.areOptionsLoading || Boolean(editItem) || draftLines.length > 0
                      }
                      {...props.form.register(name, {
                        onChange: () => {
                          props.form.setValue('slotId', '')
                          setChosenSlot(null)
                        },
                      })}
                      value={props.form.watch(name)}
                      aria-invalid={Boolean(errors[name])}
                    >
                      <NativeSelectOption value="">{placeholder}</NativeSelectOption>
                      {options.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                  <FieldError errors={errors[name] ? [errors[name]] : undefined} />
                </Field>
              ))}
              <div className="grid gap-3 border p-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="opening-new-lot">Số lô mới (nếu chưa có)</FieldLabel>
                  <Input
                    id="opening-new-lot"
                    maxLength={100}
                    {...props.form.register('newLotNumber')}
                  />
                  <FieldError errors={errors.newLotNumber ? [errors.newLotNumber] : undefined} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="opening-manufactured">Ngày sản xuất</FieldLabel>
                  <Input
                    id="opening-manufactured"
                    type="date"
                    {...props.form.register('manufacturedDate')}
                  />
                  <FieldError
                    errors={errors.manufacturedDate ? [errors.manufacturedDate] : undefined}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="opening-expiry">Hạn sử dụng</FieldLabel>
                  <Input id="opening-expiry" type="date" {...props.form.register('expiryDate')} />
                  <FieldError errors={errors.expiryDate ? [errors.expiryDate] : undefined} />
                </Field>
              </div>
              <Field data-invalid={Boolean(errors.quantity)}>
                <FieldLabel htmlFor="opening-quantity">
                  Số lượng (
                  {productOptions.find((option) => option.value === props.form.watch('productId'))
                    ?.unitName ?? 'đơn vị cơ sở'}
                  )
                </FieldLabel>
                <Input
                  id="opening-quantity"
                  type="number"
                  step="0.01"
                  {...props.form.register('quantity', { valueAsNumber: true })}
                />
                <FieldError errors={errors.quantity ? [errors.quantity] : undefined} />
              </Field>
              <Field>
                <FieldLabel htmlFor="opening-quality">Tình trạng vật lý</FieldLabel>
                <NativeSelect id="opening-quality" {...props.form.register('qualityStatus')}>
                  <NativeSelectOption value="Good">Đạt</NativeSelectOption>
                  <NativeSelectOption value="Damaged">Hư hỏng</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="opening-eligibility">Điều kiện sử dụng</FieldLabel>
                <NativeSelect
                  id="opening-eligibility"
                  {...props.form.register('eligibilityStatus')}
                >
                  <NativeSelectOption value="Available">Khả dụng</NativeSelectOption>
                  <NativeSelectOption value="InspectionHold">Chờ kiểm tra</NativeSelectOption>
                  <NativeSelectOption value="DamageHold">Giữ do hỏng</NativeSelectOption>
                  <NativeSelectOption value="Quarantine">Cách ly</NativeSelectOption>
                </NativeSelect>
              </Field>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.areOptionsLoading || props.isPending || draftLines.length >= 200}
                  onClick={() => void addLine()}
                >
                  <Plus aria-hidden="true" />
                  Thêm dòng và nhập tiếp
                </Button>
              </div>
              {draftLines.length > 0 ? (
                <div className="border">
                  <div className="border-b px-3 py-2 text-sm font-medium">
                    Dòng đã thêm ({draftLines.length})
                  </div>
                  {draftLines.map((line, index) => (
                    <div
                      key={`${line.productId}-${line.slotId}-${line.lotId ?? 'none'}-${index}`}
                      className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.productLabel}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {line.slotLabel}
                          {line.lotLabel ? ` · ${line.lotLabel}` : ''} ·{' '}
                          {formatInventoryQuantity(line.quantity)} {line.enteredUnitName} ·{' '}
                          {formatQualityStatus(line.qualityStatus)} /{' '}
                          {formatEligibilityStatus(line.eligibilityStatus)}
                        </p>
                      </div>
                      <Input
                        aria-label={`Số lượng dòng ${index + 1}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-28 shrink-0"
                        value={line.quantity}
                        onChange={(event) =>
                          setDraftLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, quantity: Number(event.target.value) } : item
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Xóa dòng ${index + 1}`}
                        onClick={() =>
                          setDraftLines((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              {!editItem ? (
                <Field data-invalid={Boolean(errors.evidenceFile)}>
                  <FieldLabel htmlFor="opening-evidence">
                    Tài liệu đính kèm (không bắt buộc)
                  </FieldLabel>
                  <FieldDescription>Biên bản kiểm đếm hoặc ảnh đối chiếu, nếu có.</FieldDescription>
                  <Input
                    id="opening-evidence"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file)
                        props.form.setValue('evidenceFile', file, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      else props.form.resetField('evidenceFile')
                    }}
                  />
                  <FieldError errors={errors.evidenceFile ? [errors.evidenceFile] : undefined} />
                </Field>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Tài liệu đã đính kèm (nếu có) được giữ nguyên khi sửa các dòng kiểm đếm.
                </p>
              )}
              {draftLines.some((line) => line.newLot) || props.form.watch('newLotNumber') ? (
                <>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <Checkbox
                      checked={props.form.watch('acknowledgePendingLots')}
                      onCheckedChange={(value) =>
                        props.form.setValue('acknowledgePendingLots', value === true, {
                          shouldValidate: true,
                        })
                      }
                    />
                    Tôi xác nhận thông tin các lô mới chỉ được tạo khi duyệt phiếu.
                  </label>
                  <FieldError
                    errors={
                      errors.acknowledgePendingLots ? [errors.acknowledgePendingLots] : undefined
                    }
                  />
                </>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false)
                    setDraftLines([])
                    setEditItem(null)
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={
                    props.isPending ||
                    props.areOptionsLoading ||
                    (Boolean(editItem) && draftLines.length === 0)
                  }
                  onClick={() => void createDraft()}
                >
                  {props.isPending
                    ? 'Đang lưu...'
                    : editItem
                      ? `Lưu ${draftLines.length} dòng`
                      : `Tạo nháp (${Math.max(1, draftLines.length)} dòng)`}
                </Button>
              </DialogFooter>
            </fieldset>
            {props.isCreateUncertain ? (
              <div role="alert" className="space-y-2 border p-3 text-sm">
                <p>
                  Kết quả tạo phiếu chưa rõ. Dữ liệu và mã thao tác được giữ nguyên để tránh tạo
                  trùng.
                </p>
                <Button type="button" disabled={props.isPending} onClick={() => void createDraft()}>
                  Kiểm tra và thử lại cùng thao tác
                </Button>
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
      {mapWarehouseId ? (
        <TransferSlotMapDialog
          key={mapWarehouseId}
          open={createOpen}
          warehouseId={mapWarehouseId}
          title="Chọn vị trí tồn đầu trên sơ đồ kho"
          description="Chọn ô hoặc kệ quản lý cấp kệ trong kho đang lập chứng từ. Chọn vị trí không tạo dữ liệu tồn kho."
          onOpenChange={(open) => {
            if (!open) {
              restoreMapFocus.current = true
              setMapWarehouseId(null)
            }
          }}
          onConfirm={({ slotId: pickedSlotId, label }) => {
            if (
              !createOpen ||
              props.isPending ||
              props.isCreateUncertain ||
              props.form.getValues('warehouseId') !== mapWarehouseId
            )
              return
            setChosenSlot({ value: pickedSlotId, label })
            props.form.setValue('slotId', pickedSlotId, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }}
        />
      ) : null}
      <OpeningStockApprovalDialog
        item={approveItem}
        currentUserId={props.currentUserId}
        pending={props.isPending}
        onClose={() => setApproveItem(null)}
        onConfirm={async (self) => {
          if (!approveItem) return
          await props.onAction(approveItem, 'approve', undefined, undefined, self)
          setApproveItem(null)
        }}
      />
      <UnsavedChangesDialog
        open={navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) navigation.cancelDiscard()
        }}
        onDiscard={navigation.confirmDiscard}
      />
      <Dialog
        open={Boolean(reviewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewItem(null)
            setSelfApprovalAcknowledged(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'Cancelled'
                ? 'Hủy chứng từ'
                : decision === 'Withdraw'
                  ? 'Rút lại chứng từ'
                  : 'Phản hồi chứng từ'}
            </DialogTitle>
            <DialogDescription>Ghi rõ lý do để lưu vào lịch sử nghiệp vụ.</DialogDescription>
          </DialogHeader>
          {decision !== 'Cancelled' && decision !== 'Withdraw' ? (
            <Field>
              <FieldLabel htmlFor="opening-decision">Quyết định</FieldLabel>
              <NativeSelect
                id="opening-decision"
                value={decision}
                onChange={(event) =>
                  setDecision(event.target.value === 'Rejected' ? 'Rejected' : 'Returned')
                }
              >
                <NativeSelectOption value="Returned">Trả lại</NativeSelectOption>
                <NativeSelectOption value="Rejected">Từ chối</NativeSelectOption>
              </NativeSelect>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="opening-reason">Lý do</FieldLabel>
            <Textarea
              id="opening-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {reviewItem &&
          decision !== 'Cancelled' &&
          decision !== 'Withdraw' &&
          (reviewItem.createdByUserId === props.currentUserId ||
            reviewItem.submittedByUserId === props.currentUserId) ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={selfApprovalAcknowledged}
                onCheckedChange={(checked) => setSelfApprovalAcknowledged(checked === true)}
              />
              Tôi xác nhận đang tự xử lý chứng từ do chính mình lập hoặc gửi.
            </label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              Đóng
            </Button>
            <Button
              disabled={
                !reason.trim() ||
                props.isPending ||
                (Boolean(reviewItem) &&
                  decision !== 'Cancelled' &&
                  decision !== 'Withdraw' &&
                  (reviewItem?.createdByUserId === props.currentUserId ||
                    reviewItem?.submittedByUserId === props.currentUserId) &&
                  !selfApprovalAcknowledged)
              }
              onClick={() => void review()}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
