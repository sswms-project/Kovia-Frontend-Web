'use client'

import Link from 'next/link'
import {
  History,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react'
import { useRef, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  CYCLE_COUNT_NOTE_MAX_LENGTH,
  recordCycleCountItemSchema,
} from '../../schemas/cycle-count.schema'
import type { CycleCountDetail, CycleCountItem } from '../../types/cycle-count.types'
import {
  CYCLE_COUNT_QUALITY_LABELS,
  formatCount,
  formatCycleCountDay,
} from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { StockAdjustmentStatusBadge } from '../CycleCountStatusBadge'
import type { CycleCountItemFilter, CycleCountRecordEntry } from './types'

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

function formatDifference(value: number | null): string {
  if (value === null) return '—'
  return value < 0 ? `(${formatCount(-value)})` : formatCount(value)
}

interface CycleCountItemsTableProps {
  readonly detail: CycleCountDetail
  readonly allowedActions: readonly string[]
  readonly isPending: boolean
  readonly canCreateAdjustment: boolean
  readonly selectedItemIds: readonly string[]
  readonly onToggleSelect: (itemId: string, checked: boolean) => void
  readonly canSubmit: boolean
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
  onSaveItems,
  onSubmit,
  onCreateAdjustment,
}: CycleCountItemsTableProps) {
  const [filter, setFilter] = useState<CycleCountItemFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [damagedDrafts, setDamagedDrafts] = useState<Record<string, string>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const canRecord = allowedActions.includes('Record')
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
  const columnCount = canSelect ? 16 : 15
  const mustStart = allowedActions.includes('Start')

  function isRecordable(item: CycleCountItem): boolean {
    return (
      canRecord &&
      (detail.status !== 'Recount' || item.requestedRecountRound === detail.recountRound)
    )
  }

  // Tính chênh lệch ngay trên FE theo số đang nhập; server chỉ chốt khi lưu.
  function getLiveCounted(item: CycleCountItem): number | null {
    const draft = getDraft(item)
    return recordCycleCountItemSchema.safeParse(draft).success ? Number(draft) : null
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
    return recordCycleCountItemSchema.safeParse(draft).success ? Number(draft) : null
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

  // Chỉ lưu các dòng có số đếm hợp lệ và khác giá trị đã lưu trên server.
  const dirtyEntries: CycleCountRecordEntry[] = items.flatMap((item) => {
    const draft = getDraft(item)
    if (!isRecordable(item) || !recordCycleCountItemSchema.safeParse(draft).success) return []
    if (isDamagedInvalid(item)) return []
    const note = getNoteDraft(item).trim() || null
    const damagedQuantity = getLiveDamaged(item)
    return Number(draft) === item.countedQuantity &&
      note === item.note &&
      (damagedQuantity ?? 0) === (item.countedDamagedQuantity ?? 0)
      ? []
      : [{ itemId: item.id, quantity: Number(draft), damagedQuantity, note }]
  })

  function discardDrafts() {
    setDrafts({})
    setDamagedDrafts({})
    setNoteDrafts({})
  }

  async function saveAll() {
    if (await onSaveItems(dirtyEntries)) discardDrafts()
  }

  // Enter nhảy sang dòng kế tiếp còn đếm được để nhập liên tục bằng bàn phím.
  function focusNext(rowIndex: number) {
    const nextItem = rows.slice(rowIndex + 1).find(isRecordable)
    if (nextItem) inputRefs.current[nextItem.id]?.focus()
  }

  return (
    <OperationalListPanel aria-label="Dòng kiểm kê">
      <Item size="xs" className="border-b-border shrink-0 p-3">
        <h2 className="mr-2 text-sm font-semibold">Chi tiết kiểm đếm</h2>
        <Tabs value={filter} onValueChange={(value) => setFilter(parseFilter(value))}>
          <TabsList variant="line">
            {FILTERS.map((option) => {
              const hasVarianceTab = option.value === 'variance' && counts.variance > 0
              return (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="data-[state=active]:font-semibold"
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
        <InputGroup className="ml-auto w-full sm:w-64">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Tìm vật tư trong phiếu"
            placeholder="Mã, tên VTHH hoặc số lô"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </InputGroup>
      </Item>
      <Table
        aria-label="Dòng kiểm kê"
        className="[&_td]:border-border [&_th]:border-border min-w-[1200px] [&_td]:border [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:h-7 [&_th]:border [&_th]:px-1.5 [&_th]:text-center"
      >
        <TableHeader>
          <TableRow>
            {canSelect ? (
              <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-10">
                <span className="sr-only">Chọn dòng kiểm đếm lại</span>
              </TableHead>
            ) : null}
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-10">
              #
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10">
              Mã VTHH
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10">
              Tên VTHH
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-px">
              ĐVT
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-px">
              Vị trí
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10">
              Lô / HSD
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-px">
              Chất lượng sổ sách
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 w-px">
              Tình trạng kiểm kê
            </TableHead>
            <TableHead colSpan={4} className="bg-muted sticky top-0 z-10 text-center">
              Số lượng
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10 min-w-48">
              Ghi chú
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10">
              Lịch sử
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted sticky top-0 z-10">
              Xử lý
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="bg-muted sticky top-7 z-10 w-24">Theo sổ sách</TableHead>
            <TableHead className="bg-muted sticky top-7 z-10 w-24">Theo kiểm kê</TableHead>
            <TableHead className="bg-muted sticky top-7 z-10 w-24">Trong đó hỏng</TableHead>
            <TableHead className="bg-muted sticky top-7 z-10 w-24">Chênh lệch</TableHead>
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
                        // Dòng đang có phiếu điều chỉnh chờ duyệt/đã duyệt không được đếm lại.
                        disabled={detail.status === 'Completed' && Boolean(item.activeAdjustmentId)}
                        onCheckedChange={(checked) => onToggleSelect(item.id, checked === true)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground tabular-nums">
                    {rowIndex + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.productSku}</TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.unitName ?? '—'}</TableCell>
                  <TableCell className="text-center font-mono">
                    {formatStockLocation(item)}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">{item.lotNumber ?? 'Theo số lượng'}</p>
                    {item.expiryDate ? (
                      <p className="text-muted-foreground text-xs">
                        HSD {formatCycleCountDay(item.expiryDate)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.qualityStatus === 'Good' ? 'secondary' : 'outline'}>
                      {CYCLE_COUNT_QUALITY_LABELS[item.qualityStatus] ?? item.qualityStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={state.variant}>{state.label}</Badge>
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
                      className="ml-auto block h-6 w-full text-right font-mono"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft}
                      disabled={!recordable || isPending}
                      aria-invalid={
                        draft !== '' && !recordCycleCountItemSchema.safeParse(draft).success
                      }
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
                      <Input
                        aria-label={`Số lượng hỏng của ${item.productName} tại ${formatStockLocation(item)}`}
                        className="ml-auto block h-6 w-full text-right font-mono"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={getDamagedDraft(item)}
                        disabled={isPending || draft === ''}
                        aria-invalid={isDamagedInvalid(item)}
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
                    {formatDifference(liveDifference)}
                  </TableCell>
                  <TableCell>
                    {recordable ? (
                      <Input
                        aria-label={`Ghi chú của ${item.productName} tại ${formatStockLocation(item)}`}
                        className="h-6 w-full"
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
                      <span className="text-xs">{item.note ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.countHistory.length ? (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="link" size="xs" className="h-auto p-0 text-xs">
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
                              {history.countedByName ? ` · ${history.countedByName}` : ''} ·{' '}
                              {history.recountReason}
                            </p>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa có</span>
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
            <TableCell colSpan={canSelect ? 9 : 8} className="font-semibold">
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
                {formatDifference(totalDifference)}
              </span>
            </TableCell>
            <TableCell colSpan={3} />
          </TableRow>
        </TableFooter>
      </Table>
      {canRecord ? (
        // pr-16 chừa chỗ cho nút chatbot nổi ở góc phải dưới, tránh che nút hành động.
        <Item size="xs" className="bg-card border-t-border shrink-0 p-3 pr-16">
          <ItemContent>
            <ItemDescription aria-live="polite">
              {dirtyEntries.length > 0
                ? `${dirtyEntries.length} dòng chưa lưu. Lưu trước khi hoàn thành kiểm kê.`
                : canSubmit
                  ? 'Mọi thay đổi đã được lưu.'
                  : 'Mọi thay đổi đã được lưu. Nhập đủ số đếm tất cả dòng để hoàn thành.'}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              disabled={dirtyEntries.length === 0 || isPending}
              onClick={discardDrafts}
            >
              <RotateCcw />
              Hoàn tác
            </Button>
            <Button asChild variant="outline">
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
              disabled={dirtyEntries.length === 0 || isPending}
              onClick={() => void saveAll()}
            >
              <Save />
              Lưu{dirtyEntries.length > 0 ? ` (${dirtyEntries.length})` : ''}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canSubmit || dirtyEntries.length > 0 || isPending}>
                  <Send />
                  Hoàn thành kiểm kê
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cảnh báo!</AlertDialogTitle>
                  <AlertDialogDescription>
                    Khi chuyển trạng thái hoàn thành kiểm kê sẽ không thể sửa lại kết quả kiểm kê,
                    bạn có chắc chắn không?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Không</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void onSubmit()}>Đã kiểm kê</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ItemActions>
        </Item>
      ) : null}
    </OperationalListPanel>
  )
}
