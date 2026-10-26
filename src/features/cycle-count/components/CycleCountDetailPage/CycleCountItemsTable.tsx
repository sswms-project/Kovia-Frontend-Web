'use client'

import Link from 'next/link'
import {
  ClipboardCheck,
  History,
  ImagePlus,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Save,
  ScanBarcode,
  Search,
  Send,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemActions, ItemContent, ItemDescription } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import { CYCLE_COUNT_NOTE_MAX_LENGTH, parseCountQuantity } from '../../schemas/cycle-count.schema'
import type { CycleCountDetail, CycleCountItem } from '../../types/cycle-count.types'
import {
  CYCLE_COUNT_QUALITY_LABELS,
  formatCount,
  formatCountDifference,
  getRecountBlockReason,
  formatCycleCountDay,
} from '../../utils/cycle-count-format'
import { isDamageDetailComplete } from '../../utils/cycle-count-damage'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { StockAdjustmentStatusBadge } from '../CycleCountStatusBadge'
import { CycleCountDamageDialog } from './CycleCountDamageDialog'
import { CycleCountItemCards } from './CycleCountItemCards'
import { CycleCountScanDialog } from './CycleCountScanDialog'
import type {
  CycleCountDamageDraft,
  CycleCountEvidenceActions,
  CycleCountItemFilter,
  CycleCountItemRowModel,
  CycleCountRecordEntry,
} from './types'
import { getCycleCountDraftKey, useCycleCountDrafts } from './use-cycle-count-drafts'

const FILTERS: ReadonlyArray<{ readonly value: CycleCountItemFilter; readonly label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'uncounted', label: 'Chưa đếm' },
  { value: 'counted', label: 'Đã đếm' },
  { value: 'variance', label: 'Có lệch' },
]

function parseFilter(value: string): CycleCountItemFilter {
  return FILTERS.find((option) => option.value === value)?.value ?? 'all'
}

function matchesFilter(item: CycleCountItem, filter: CycleCountItemFilter): boolean {
  if (filter === 'uncounted') return item.countedQuantity === null
  if (filter === 'counted') return item.countedQuantity !== null
  if (filter === 'variance') return item.difference !== null && item.difference !== 0
  return true
}

function getItemState(item: CycleCountItem, detail: CycleCountDetail) {
  if (item.countedQuantity !== null) return { label: 'Đã kiểm kê', variant: 'secondary' } as const
  if (detail.status === 'Recount' && item.requestedRecountRound === detail.recountRound)
    return { label: 'Cần đếm lại', variant: 'destructive' } as const
  return { label: 'Chưa kiểm kê', variant: 'outline' } as const
}

interface CycleCountItemsTableProps {
  readonly detail: CycleCountDetail
  readonly allowedActions: readonly string[]
  readonly isPending: boolean
  readonly canCreateAdjustment: boolean
  readonly selectedItemIds: readonly string[]
  readonly onToggleSelect: (itemId: string, checked: boolean) => void
  readonly canSubmit: boolean
  readonly isBeforeSchedule: boolean
  readonly evidenceActions: CycleCountEvidenceActions
  readonly onSaveItems: (entries: readonly CycleCountRecordEntry[]) => Promise<boolean>
  readonly onSubmit: () => Promise<void>
  readonly onCreateAdjustment: (itemId: string) => void
}

export function CycleCountItemsTable({
  detail,
  allowedActions,
  isPending,
  canCreateAdjustment,
  selectedItemIds,
  onToggleSelect,
  canSubmit,
  isBeforeSchedule,
  evidenceActions,
  onSaveItems,
  onSubmit,
  onCreateAdjustment,
}: CycleCountItemsTableProps) {
  const [filter, setFilter] = useState<CycleCountItemFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [damageDialogItemId, setDamageDialogItemId] = useState<string | null>(null)
  const [isScanOpen, setIsScanOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const canRecord = allowedActions.includes('Record')
  const {
    drafts,
    damagedDrafts,
    noteDrafts,
    damageDrafts,
    setDrafts,
    setDamagedDrafts,
    setNoteDrafts,
    setDamageDrafts,
    discardDrafts,
  } = useCycleCountDrafts(
    canRecord && detail.assignedTo
      ? getCycleCountDraftKey(detail.id, detail.recountRound, detail.assignedTo)
      : null
  )
  const isMobile = useIsMobile()
  const canSelect = allowedActions.includes('RequestRecount')
  const items = detail.items
  const hasHiddenQuantity = items.some((item) => item.systemQuantity === null)
  const counts: Record<CycleCountItemFilter, number> = {
    all: items.length,
    uncounted: items.filter((item) => matchesFilter(item, 'uncounted')).length,
    counted: items.filter((item) => matchesFilter(item, 'counted')).length,
    variance: hasHiddenQuantity
      ? 0
      : items.filter((item) => matchesFilter(item, 'variance')).length,
  }
  const keyword = searchTerm.trim().toLocaleLowerCase('vi')
  const rows = items.filter(
    (item) =>
      matchesFilter(item, filter) &&
      (!keyword ||
        `${item.productSku} ${item.productName} ${item.lotNumber ?? ''}`
          .toLocaleLowerCase('vi')
          .includes(keyword))
  )
  const totalSystem = hasHiddenQuantity
    ? null
    : items.reduce((sum, item) => sum + (item.systemQuantity ?? 0), 0)
  const liveCounts = items.map(getLiveCounted)
  const totalCounted = liveCounts.every((value) => value === null)
    ? null
    : liveCounts.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  const totalDifference = hasHiddenQuantity
    ? null
    : items.reduce((sum, item) => sum + (getLiveDifference(item) ?? 0), 0)
  const totalDamaged = items.reduce((sum, item) => sum + (getLiveDamaged(item) ?? 0), 0)
  const columnCount = canSelect ? 12 : 11
  const mustStart = allowedActions.includes('Start')
  // Cờ Scan do BE trả theo gói dịch vụ; không có thì chỉ nhập tay.
  const canScan = allowedActions.includes('Scan')

  function isRecordable(item: CycleCountItem): boolean {
    return (
      canRecord &&
      (detail.status !== 'Recount' || item.requestedRecountRound === detail.recountRound)
    )
  }

  // Tính chênh lệch ngay trên FE theo số đang nhập; server chỉ chốt khi lưu.
  function getLiveCounted(item: CycleCountItem): number | null {
    const draft = getDraft(item)
    return parseCountQuantity(draft)
  }

  function getLiveDifference(item: CycleCountItem): number | null {
    const counted = getLiveCounted(item)
    return counted === null || item.systemQuantity === null ? null : counted - item.systemQuantity
  }

  function getDraft(item: CycleCountItem): string {
    return drafts[item.id] ?? (item.countedQuantity === null ? '' : String(item.countedQuantity))
  }

  function getDamagedDraft(item: CycleCountItem): string {
    return (
      damagedDrafts[item.id] ??
      (item.countedDamagedQuantity === null ? '' : String(item.countedDamagedQuantity))
    )
  }

  // Ô hỏng để trống nghĩa là 0; chỉ hợp lệ khi không vượt số đếm.
  function getLiveDamaged(item: CycleCountItem): number | null {
    const draft = getDamagedDraft(item)
    if (draft === '') return null
    return parseCountQuantity(draft)
  }

  function isDamagedInvalid(item: CycleCountItem): boolean {
    const draft = getDamagedDraft(item)
    if (draft === '') return false
    const damaged = getLiveDamaged(item)
    const counted = getLiveCounted(item)
    return damaged === null || (counted !== null && damaged > counted)
  }

  function getNoteDraft(item: CycleCountItem): string {
    return noteDrafts[item.id] ?? item.note ?? ''
  }

  function getDamageDraft(item: CycleCountItem): CycleCountDamageDraft {
    return damageDrafts[item.id] ?? { reason: item.damageReason ?? '', evidence: [] }
  }

  // Ảnh đã lưu chỉ còn hiệu lực khi dòng đã lưu với số hỏng > 0 (BE trả theo vòng đếm hiện tại).
  function getSavedDamageEvidence(item: CycleCountItem) {
    return (item.countedDamagedQuantity ?? 0) > 0 ? item.damageEvidence : []
  }

  // Hàng hỏng cần lý do và ít nhất một ảnh trước khi lưu.
  function isDamageIncomplete(item: CycleCountItem): boolean {
    if ((getLiveDamaged(item) ?? 0) <= 0) return false
    const damageDraft = getDamageDraft(item)
    return !isDamageDetailComplete(
      damageDraft.reason,
      getSavedDamageEvidence(item).length + damageDraft.evidence.length
    )
  }

  // Chỉ lưu các dòng có số đếm hợp lệ và khác giá trị đã lưu trên server.
  const dirtyEntries: CycleCountRecordEntry[] = items.flatMap((item) => {
    const draft = getDraft(item)
    if (!isRecordable(item) || parseCountQuantity(draft) === null) return []
    if (isDamagedInvalid(item) || isDamageIncomplete(item)) return []
    const note = getNoteDraft(item).trim() || null
    const damagedQuantity = getLiveDamaged(item)
    const hasDamage = (damagedQuantity ?? 0) > 0
    const damageDraft = getDamageDraft(item)
    const damageReason = hasDamage ? damageDraft.reason.trim() : null
    const isDamageUnchanged =
      !hasDamage ||
      (damageReason === (item.damageReason ?? '') && damageDraft.evidence.length === 0)
    return Number(draft) === item.countedQuantity &&
      note === item.note &&
      (damagedQuantity ?? 0) === (item.countedDamagedQuantity ?? 0) &&
      isDamageUnchanged
      ? []
      : [
          {
            itemId: item.id,
            quantity: Number(draft),
            damagedQuantity,
            note,
            countMethod: 'Manual',
            scannedBarcode: null,
            damageReason,
            damageEvidenceIds: hasDamage ? damageDraft.evidence.map((file) => file.id) : [],
          },
        ]
  })

  const incompleteDamageCount = items.filter(
    (item) => isRecordable(item) && getDraft(item) !== '' && isDamageIncomplete(item)
  ).length
  const damageDialogItem = items.find((item) => item.id === damageDialogItemId) ?? null

  // Kiểm kê mù ẩn số sổ sách nên không có số để điền; điền sẵn chỉ cho dòng chưa đếm và chưa gõ gì.
  const canFillFromBook = canRecord && !mustStart && !hasHiddenQuantity
  const fillableItems = items.filter(
    (item) =>
      isRecordable(item) &&
      item.countedQuantity === null &&
      item.systemQuantity !== null &&
      getDraft(item) === ''
  )

  function fillFromBook() {
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(fillableItems.map((item) => [item.id, String(item.systemQuantity)])),
    }))
  }

  // Nháp đã giữ trên máy, nhưng vẫn nhắc trước khi rời trang vì kết quả chưa về server.
  const hasUnsavedDrafts = dirtyEntries.length > 0
  useEffect(() => {
    if (!hasUnsavedDrafts) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [hasUnsavedDrafts])

  async function saveAll() {
    if (await onSaveItems(dirtyEntries)) discardDrafts()
  }

  // Enter nhảy sang dòng kế tiếp còn đếm được để nhập liên tục bằng bàn phím.
  function focusNext(rowIndex: number) {
    const nextItem = rows.slice(rowIndex + 1).find(isRecordable)
    if (nextItem) inputRefs.current[nextItem.id]?.focus()
  }

  const rowModels: CycleCountItemRowModel[] = rows.map((item) => {
    const draft = getDraft(item)
    return {
      item,
      state: getItemState(item, detail),
      recordable: isRecordable(item),
      selected: selectedItemIds.includes(item.id),
      quantity: draft,
      quantityInvalid: draft !== '' && parseCountQuantity(draft) === null,
      damaged: getDamagedDraft(item),
      damagedInvalid: isDamagedInvalid(item),
      hasDamage: (getLiveDamaged(item) ?? 0) > 0,
      damageIncomplete: isDamageIncomplete(item),
      note: getNoteDraft(item),
      liveDifference: getLiveDifference(item),
      hasVariance: item.difference !== null && item.difference !== 0,
      recountBlockReason: getRecountBlockReason(item, detail.status),
    }
  })

  return (
    <OperationalListPanel aria-label="Dòng kiểm kê">
      <Item size="xs" className="border-b-border shrink-0 p-3">
        <h2 className="mr-2 text-sm font-semibold">Chi tiết kiểm đếm</h2>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(parseFilter(value))}
          className="max-w-full min-w-0 overflow-x-auto overflow-y-hidden px-1 pt-1 pb-2"
        >
          <TabsList variant="line" className="h-auto min-h-8 shrink-0">
            {FILTERS.map((option) => {
              const hasVarianceTab = option.value === 'variance' && counts.variance > 0
              return (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="h-8 shrink-0 data-[state=active]:font-semibold max-md:h-11 pointer-coarse:h-11"
                >
                  {hasVarianceTab ? (
                    <TriangleAlert className="text-destructive" aria-hidden="true" />
                  ) : null}
                  {option.label}
                  <span
                    className={cn(
                      'tabular-nums',
                      hasVarianceTab
                        ? 'text-destructive font-semibold'
                        : counts[option.value] === 0
                          ? 'text-muted-foreground/50'
                          : 'text-muted-foreground'
                    )}
                  >
                    {counts[option.value]}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        {mustStart ? (
          <p className="text-muted-foreground text-xs">
            Bấm &quot;Bắt đầu kiểm kê&quot; để chốt tồn sổ sách và nhập số đếm.
          </p>
        ) : null}
        {isBeforeSchedule ? (
          <p className="text-muted-foreground text-xs">
            Phiếu chưa đến thời gian kiểm kê nên chưa thể nhập số đếm.
          </p>
        ) : null}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          {canFillFromBook ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="max-sm:h-11 max-sm:flex-1"
              disabled={isPending || fillableItems.length === 0}
              onClick={fillFromBook}
            >
              <ClipboardCheck aria-hidden="true" />
              Điền đủ theo sổ sách
              {fillableItems.length > 0 ? ` (${fillableItems.length})` : ''}
            </Button>
          ) : null}
          {canScan ? (
            <Button
              type="button"
              size="sm"
              className="max-sm:h-11 max-sm:flex-1"
              disabled={isPending}
              onClick={() => setIsScanOpen(true)}
            >
              <ScanBarcode aria-hidden="true" />
              Quét mã
            </Button>
          ) : null}
        </div>
        <InputGroup className="w-full max-sm:h-11 sm:w-64">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Tìm vật tư trong phiếu"
            className="max-sm:text-base"
            placeholder="Mã, tên VTHH hoặc số lô"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </InputGroup>
      </Item>
      {isMobile ? (
        <>
          <dl
            aria-label={`Tổng hợp ${items.length} dòng kiểm kê`}
            className="text-muted-foreground bg-muted/40 grid shrink-0 grid-cols-2 gap-x-4 gap-y-2 border-b px-3 py-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <dt>Sổ sách</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {hasHiddenQuantity ? 'Đã ẩn' : formatCount(totalSystem)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Số đếm</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {formatCount(totalCounted)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Trong đó hỏng</dt>
              <dd
                className={cn('font-medium tabular-nums', totalDamaged > 0 && 'text-destructive')}
              >
                {formatCount(totalDamaged)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Chênh lệch</dt>
              <dd
                className={cn(
                  'font-medium tabular-nums',
                  (totalDifference ?? 0) < 0 && 'text-destructive'
                )}
              >
                {hasHiddenQuantity ? 'Đã ẩn' : formatCountDifference(totalDifference)}
              </dd>
            </div>
          </dl>
          <CycleCountItemCards
            rows={rowModels}
            isPending={isPending}
            canSelect={canSelect}
            canCreateAdjustment={canCreateAdjustment}
            isCompleted={detail.status === 'Completed'}
            onQuantityChange={(itemId, value) =>
              setDrafts((current) => ({ ...current, [itemId]: value }))
            }
            onDamagedChange={(itemId, value) =>
              setDamagedDrafts((current) => ({ ...current, [itemId]: value }))
            }
            onNoteChange={(itemId, value) =>
              setNoteDrafts((current) => ({ ...current, [itemId]: value }))
            }
            onOpenDamage={setDamageDialogItemId}
            onToggleSelect={onToggleSelect}
            onCreateAdjustment={onCreateAdjustment}
          />
        </>
      ) : (
        <Table aria-label="Dòng kiểm kê" className="min-w-[1280px] text-sm">
          <TableHeader>
            <TableRow>
              {canSelect ? (
                <TableHead className="bg-card w-10">
                  <span className="sr-only">Chọn dòng kiểm đếm lại</span>
                </TableHead>
              ) : null}
              <TableHead className="bg-card w-12">#</TableHead>
              <TableHead className="bg-card min-w-56">Vật tư · Mã · ĐVT</TableHead>
              <TableHead className="bg-card w-44">Vị trí · Lô / HSD</TableHead>
              <TableHead className="bg-card w-40">Tình trạng · Phẩm chất</TableHead>
              <TableHead className="bg-card w-28 text-right">Theo sổ sách</TableHead>
              <TableHead className="bg-card w-32 text-right">Theo kiểm kê</TableHead>
              <TableHead className="bg-card w-36 text-right">Trong đó hỏng</TableHead>
              <TableHead className="bg-card w-28 text-right">Chênh lệch</TableHead>
              <TableHead className="bg-card min-w-56">Ghi chú</TableHead>
              <TableHead className="bg-card w-36">Lịch sử</TableHead>
              <TableHead className="bg-card w-44">Xử lý</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-muted-foreground h-24 text-center">
                  Không có dòng kiểm kê phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item, rowIndex) => {
                const recordable = isRecordable(item)
                const draft = getDraft(item)
                const hasVariance = item.difference !== null && item.difference !== 0
                const liveDifference = getLiveDifference(item)
                const state = getItemState(item, detail)
                return (
                  <TableRow key={item.id}>
                    {canSelect ? (
                      <TableCell>
                        <Checkbox
                          aria-label={`Chọn ${item.productName} để kiểm đếm lại`}
                          checked={selectedItemIds.includes(item.id)}
                          // Phiếu đã hoàn tất chỉ đếm lại dòng lệch chưa điều chỉnh và chưa có hồ sơ hỏng.
                          disabled={getRecountBlockReason(item, detail.status) !== null}
                          title={getRecountBlockReason(item, detail.status) ?? undefined}
                          onCheckedChange={(checked) => onToggleSelect(item.id, checked === true)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-muted-foreground tabular-nums">
                      {rowIndex + 1}
                    </TableCell>
                    <TableCell className="min-w-0 whitespace-normal">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        <span className="font-mono" translate="no">
                          {item.productSku}
                        </span>
                        {item.unitName ? ` · ${item.unitName}` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <p className="font-mono font-semibold" translate="no">
                        {formatStockLocation(item)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        <span className="font-mono" translate="no">
                          {item.lotNumber ?? 'Theo số lượng'}
                        </span>
                        {item.expiryDate ? ` · HSD ${formatCycleCountDay(item.expiryDate)}` : ''}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={state.variant}>{state.label}</Badge>
                        {item.countedQuantity !== null && item.countMethod === 'Scanned' ? (
                          <ScanBarcode
                            className="text-muted-foreground size-4"
                            aria-label="Đã quét mã"
                          />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          item.qualityStatus === 'Good'
                            ? 'text-muted-foreground'
                            : 'text-destructive font-medium'
                        )}
                      >
                        Phẩm chất:{' '}
                        {CYCLE_COUNT_QUALITY_LABELS[item.qualityStatus] ?? item.qualityStatus}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {item.systemQuantity === null ? (
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <LockKeyhole className="size-3" aria-hidden="true" />
                          Đã ẩn
                        </span>
                      ) : (
                        formatCount(item.systemQuantity)
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        ref={(element) => {
                          inputRefs.current[item.id] = element
                        }}
                        aria-label={`Số đếm thực tế của ${item.productName} tại ${formatStockLocation(item)}`}
                        className="ml-auto block h-9 w-full text-right font-mono"
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft}
                        disabled={!recordable || isPending}
                        aria-invalid={draft !== '' && parseCountQuantity(draft) === null}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') focusNext(rowIndex)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {recordable ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            aria-label={`Số lượng hỏng của ${item.productName} tại ${formatStockLocation(item)}`}
                            className="ml-auto block h-9 w-full min-w-0 text-right font-mono"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={getDamagedDraft(item)}
                            disabled={isPending || draft === ''}
                            aria-invalid={isDamagedInvalid(item)}
                            title={
                              isDamagedInvalid(item)
                                ? 'Số hỏng phải từ 0 và không vượt số đếm'
                                : undefined
                            }
                            onChange={(event) =>
                              setDamagedDrafts((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') focusNext(rowIndex)
                            }}
                          />
                          {(getLiveDamaged(item) ?? 0) > 0 && !isDamagedInvalid(item) ? (
                            // Icon cạnh ô nhập để dòng không cao thêm; chấm đỏ báo còn thiếu ảnh/lý do.
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="relative shrink-0"
                              aria-label={
                                isDamageIncomplete(item)
                                  ? `Thêm ảnh và lý do hàng hỏng của ${item.productName}`
                                  : `Xem ảnh và lý do hàng hỏng của ${item.productName}`
                              }
                              title={isDamageIncomplete(item) ? 'Thêm ảnh & lý do' : 'Ảnh & lý do'}
                              onClick={() => setDamageDialogItemId(item.id)}
                            >
                              <ImagePlus aria-hidden="true" />
                              {isDamageIncomplete(item) ? (
                                <span
                                  aria-hidden="true"
                                  className="bg-destructive absolute -top-0.5 -right-0.5 size-2 rounded-full"
                                />
                              ) : null}
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'block text-right font-mono tabular-nums',
                            (item.countedDamagedQuantity ?? 0) > 0
                              ? 'text-destructive font-semibold'
                              : 'text-muted-foreground'
                          )}
                        >
                          {item.countedDamagedQuantity === null
                            ? '—'
                            : formatCount(item.countedDamagedQuantity)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono font-semibold tabular-nums',
                        (liveDifference ?? 0) < 0 && 'text-destructive'
                      )}
                    >
                      {formatCountDifference(liveDifference)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {recordable ? (
                        <Input
                          aria-label={`Ghi chú của ${item.productName} tại ${formatStockLocation(item)}`}
                          className="h-9 w-full"
                          maxLength={CYCLE_COUNT_NOTE_MAX_LENGTH}
                          placeholder="Ghi chú (nếu có)"
                          value={getNoteDraft(item)}
                          disabled={isPending}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') focusNext(rowIndex)
                          }}
                        />
                      ) : (
                        <span>{item.note ?? '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {item.countHistory.length ? (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="link" size="sm" className="h-auto p-0">
                              <History aria-hidden="true" />
                              {item.countHistory.length} lần trước
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="text-muted-foreground mt-2 space-y-1 text-xs">
                            {item.countHistory.map((history) => (
                              <p key={history.id}>
                                Vòng {history.recountRound}:{' '}
                                <b>{formatCount(history.countedQuantity)}</b>
                                {history.systemQuantity !== null
                                  ? ` / sổ sách ${formatCount(history.systemQuantity)}`
                                  : ''}
                                {history.countedByName ? ` · ${history.countedByName}` : ''}
                                {history.countMethod === 'Scanned' ? ' · quét mã' : ''} ·{' '}
                                {history.recountReason}
                              </p>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <span className="text-muted-foreground">Chưa có</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.activeAdjustmentId && item.activeAdjustmentStatus ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={APP_ROUTES.stockAdjustmentDetail(item.activeAdjustmentId)}>
                            <StockAdjustmentStatusBadge status={item.activeAdjustmentStatus} />
                            Xem điều chỉnh
                          </Link>
                        </Button>
                      ) : detail.status === 'Completed' && hasVariance && canCreateAdjustment ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCreateAdjustment(item.id)}
                        >
                          <SlidersHorizontal />
                          Điều chỉnh dòng này
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={canSelect ? 5 : 4} className="font-semibold">
                Tổng cộng ({items.length} dòng)
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatCount(totalSystem)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatCount(totalCounted)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                <span className={cn(totalDamaged > 0 && 'text-destructive')}>
                  {totalDamaged > 0 ? formatCount(totalDamaged) : '—'}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                <span className={cn((totalDifference ?? 0) < 0 && 'text-destructive')}>
                  {formatCountDifference(totalDifference)}
                </span>
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      )}
      {canRecord ? (
        // Chừa khoảng dưới nút trên điện thoại để chatbot và vùng an toàn không che thao tác.
        <Item
          size="xs"
          className="bg-card border-t-border shrink-0 p-3 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pr-16 md:pb-3"
        >
          <ItemContent className="w-full md:w-auto">
            <ItemDescription aria-live="polite">
              {dirtyEntries.length > 0
                ? `${dirtyEntries.length} dòng chưa lưu. Lưu trước khi hoàn thành kiểm kê.`
                : incompleteDamageCount > 0
                  ? `${incompleteDamageCount} dòng hàng hỏng cần thêm ảnh và lý do trước khi lưu.`
                  : canSubmit
                    ? 'Mọi thay đổi đã được lưu.'
                    : 'Mọi thay đổi đã được lưu. Nhập đủ số đếm tất cả dòng để hoàn thành.'}
            </ItemDescription>
          </ItemContent>
          <ItemActions className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap">
            <Button
              variant="ghost"
              className="h-11 min-w-0 px-2 md:h-8"
              disabled={dirtyEntries.length === 0 || isPending}
              onClick={discardDrafts}
            >
              <RotateCcw />
              Hoàn tác
            </Button>
            <Button asChild variant="outline" className="h-11 min-w-0 px-2 md:h-8">
              <Link
                href={APP_ROUTES.cycleCounts}
                onClick={(event) => {
                  if (
                    dirtyEntries.length > 0 &&
                    !window.confirm('Có dòng chưa lưu. Thoát và bỏ các thay đổi này?')
                  )
                    event.preventDefault()
                }}
              >
                <LogOut />
                Thoát
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 min-w-0 px-2 md:h-8"
              disabled={dirtyEntries.length === 0 || isPending}
              onClick={() => void saveAll()}
            >
              <Save />
              Lưu{dirtyEntries.length > 0 ? ` (${dirtyEntries.length})` : ''}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="col-span-3 h-auto min-h-11 w-full whitespace-normal md:h-8 md:min-h-8 md:w-auto"
                  disabled={
                    !canSubmit || dirtyEntries.length > 0 || incompleteDamageCount > 0 || isPending
                  }
                >
                  <Send />
                  Gửi kết quả cho quản lý
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gửi kết quả kiểm kê cho quản lý?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {items.length} dòng
                    {hasHiddenQuantity ? '' : `, ${counts.variance} dòng lệch`}
                    {totalDamaged > 0 ? `, ${formatCount(totalDamaged)} hàng hỏng` : ''}. Phiếu sẽ
                    chuyển sang Chờ duyệt; bạn không sửa được số đếm nữa trừ khi quản lý yêu cầu đếm
                    lại.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Quay lại</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void onSubmit()}>Gửi kết quả</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ItemActions>
        </Item>
      ) : null}
      {damageDialogItem ? (
        <CycleCountDamageDialog
          open
          productName={damageDialogItem.productName}
          draft={getDamageDraft(damageDialogItem)}
          savedEvidence={getSavedDamageEvidence(damageDialogItem)}
          evidenceActions={evidenceActions}
          onChange={(next) =>
            setDamageDrafts((current) => ({ ...current, [damageDialogItem.id]: next }))
          }
          onOpenChange={(open) => {
            if (!open) setDamageDialogItemId(null)
          }}
        />
      ) : null}
      {canScan ? (
        <CycleCountScanDialog
          open={isScanOpen}
          items={items.filter(isRecordable)}
          isPending={isPending}
          onOpenChange={setIsScanOpen}
          evidenceActions={evidenceActions}
          onSave={onSaveItems}
        />
      ) : null}
    </OperationalListPanel>
  )
}
