'use client'

import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import {
  formatCycleCountDate,
  formatCycleCountDay,
  hasCountResults,
  isUrgentOpen,
} from '../../utils/cycle-count-format'
import { CycleCountPriorityBadge } from '../CycleCountUrgency'

type InfoRow = readonly [label: string, value: ReactNode]

interface CycleCountInfoSectionProps {
  readonly detail: CycleCountDetail
  readonly countedCount: number
  // null khi tồn hệ thống đang bị ẩn (kiểm kê mù) nên không tính được số dòng lệch.
  readonly varianceCount: number | null
}

function withPerson(date: string | null, name: string | null): string {
  if (!date) return '—'
  return name ? `${formatCycleCountDate(date)} · ${name}` : formatCycleCountDate(date)
}

function InfoGrid({ rows }: { readonly rows: readonly InfoRow[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CycleCountInfoSection({
  detail,
  countedCount,
  varianceCount,
}: CycleCountInfoSectionProps) {
  const isMobile = useIsMobile()
  // Mặc định mở trên máy tính, gập trên điện thoại; người dùng đổi tay thì giữ lựa chọn đó.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const isOpen = manualOpen ?? !isMobile
  const showResults = hasCountResults(detail.status)
  const scopeRows: readonly InfoRow[] = [
    ['Mục đích', detail.purpose || '—'],
    ['Kho kiểm kê', detail.warehouseName],
    ['Phạm vi', detail.zoneName || 'Toàn kho'],
    ['Phụ trách', detail.assignedToName || 'Chưa phân công'],
    ['Phương thức', detail.isBlindCount ? 'Kiểm kê mù (ẩn tồn)' : 'Kiểm kê thường (hiện tồn)'],
  ]
  const scheduleRows: readonly InfoRow[] = [
    ['Số phiếu', detail.code],
    ['Ngày lập', withPerson(detail.createdAt, detail.createdByName)],
    ['Lịch kiểm kê', formatCycleCountDate(detail.scheduledDate)],
    ['Kiểm kê đến ngày', detail.dueDate ? formatCycleCountDay(detail.dueDate) : '—'],
    [
      'Mức ưu tiên',
      isUrgentOpen(detail.priority, detail.status) ? (
        <CycleCountPriorityBadge priority={detail.priority} status={detail.status} />
      ) : detail.priority === 'Urgent' ? (
        'Khẩn'
      ) : (
        'Bình thường'
      ),
    ],
  ]
  const trackingRows: readonly InfoRow[] = [
    ['Vòng đếm', String(detail.recountRound + 1)],
    ['Tiến độ', showResults ? `${countedCount}/${detail.items.length} dòng` : '—'],
    [
      'Dòng chênh lệch',
      !showResults ? '—' : varianceCount === null ? 'Đã ẩn' : String(varianceCount),
    ],
    ['Gửi kết quả', withPerson(detail.submittedAt, detail.submittedByName)],
    ['Chốt phiếu', withPerson(detail.finalizedAt ?? detail.completedAt, detail.finalizedByName)],
  ]

  const summary = [
    detail.code,
    detail.assignedToName || 'Chưa phân công',
    showResults ? `${countedCount}/${detail.items.length} dòng` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setManualOpen}
      className="bg-card shrink-0 border"
      aria-label="Thông tin phiếu"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-9 w-full justify-between px-3">
          <span className="text-sm font-semibold">Thông tin phiếu</span>
          <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs font-normal">
            {isOpen ? null : <span className="truncate">{summary}</span>}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 transition-transform motion-reduce:transition-none',
                isOpen && 'rotate-180'
              )}
            />
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[50dvh] overflow-y-auto border-t">
        <InfoGrid rows={[...scopeRows, ...scheduleRows, ...trackingRows]} />
      </CollapsibleContent>
    </Collapsible>
  )
}
