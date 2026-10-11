import { Fragment } from 'react'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import {
  formatCycleCountDate,
  formatCycleCountDay,
  hasCountResults,
} from '../../utils/cycle-count-format'

type InfoRow = readonly [label: string, value: string]

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

function InfoList({ rows }: { readonly rows: readonly InfoRow[] }) {
  return (
    <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 p-4 text-sm">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

export function CycleCountInfoSection({
  detail,
  countedCount,
  varianceCount,
}: CycleCountInfoSectionProps) {
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
    ['Mức ưu tiên', detail.priority === 'Urgent' ? 'Khẩn' : 'Bình thường'],
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

  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="bg-card border" aria-label="Thông tin chung">
        <h2 className="border-b px-4 py-2 text-sm font-semibold">Thông tin chung</h2>
        <div className="grid md:grid-cols-2">
          <InfoList rows={scopeRows} />
          <InfoList rows={scheduleRows} />
        </div>
      </section>
      <section className="bg-card border" aria-label="Theo dõi tình trạng">
        <h2 className="border-b px-4 py-2 text-sm font-semibold">Theo dõi tình trạng</h2>
        <InfoList rows={trackingRows} />
      </section>
    </div>
  )
}
