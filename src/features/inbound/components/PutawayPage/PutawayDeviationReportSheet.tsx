'use client'

import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { PutAwayDeviationReport } from '../../types/inbound.types'

export const PUTAWAY_REPORT_RANGES = [7, 30, 90] as const
export type PutawayReportRange = (typeof PUTAWAY_REPORT_RANGES)[number]

interface PutawayDeviationReportSheetProps {
  readonly open: boolean
  readonly rangeDays: PutawayReportRange
  readonly report: PutAwayDeviationReport | undefined
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRangeChange: (days: PutawayReportRange) => void
  readonly onRetry: () => void
}

const percent = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '0%'

/** Thống kê các lần cất khác vị trí được khuyến nghị để quản lý tìm nguyên nhân lặp lại. */
export function PutawayDeviationReportSheet({
  open,
  rangeDays,
  report,
  isLoading,
  isError,
  onOpenChange,
  onRangeChange,
  onRetry,
}: PutawayDeviationReportSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw]">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Báo cáo cất khác khuyến nghị</SheetTitle>
          <SheetDescription>
            Các lần nhân viên cất khác kế hoạch hoặc dùng vị trí đang chừa cho hàng sắp về, trong
            những kho bạn được xem.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          <Field className="sm:max-w-48">
            <FieldLabel htmlFor="putaway-report-range">Khoảng thời gian</FieldLabel>
            <NativeSelect
              id="putaway-report-range"
              className="w-full"
              value={rangeDays}
              onChange={(event) => onRangeChange(Number(event.target.value) as PutawayReportRange)}
            >
              {PUTAWAY_REPORT_RANGES.map((days) => (
                <NativeSelectOption key={days} value={days}>
                  {days} ngày gần nhất
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          {isLoading ? (
            <OperationalLoadingState rows={6} />
          ) : isError || !report ? (
            <OperationalErrorState title="Không tải được báo cáo" onRetry={onRetry} />
          ) : report.totalLines === 0 ? (
            <OperationalEmptyState
              title="Chưa có lần cất hàng nào"
              description="Không có dòng cất hàng trong khoảng thời gian này."
            />
          ) : (
            <ReportBody report={report} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ReportBody({ report }: { readonly report: PutAwayDeviationReport }) {
  const maxReasonCount = Math.max(1, ...report.byReason.map((entry) => entry.count))
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 border p-4 lg:grid-cols-4">
        <Metric label="Dòng cất hàng" value={report.totalLines.toLocaleString('vi-VN')} />
        <Metric
          label="Khác khuyến nghị"
          value={report.deviatedLines.toLocaleString('vi-VN')}
          hint={percent(report.deviatedLines, report.totalLines)}
        />
        <Metric
          label="Dùng vị trí đang chừa"
          value={report.heldSlotLines.toLocaleString('vi-VN')}
        />
        <Metric
          label="Xác nhận bằng mã vị trí"
          value={percent(report.codeConfirmedLines, report.totalLines)}
          hint={`${report.codeConfirmedLines.toLocaleString('vi-VN')} dòng`}
        />
      </dl>

      {report.deviatedLines === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          Mọi lần cất trong khoảng này đều theo khuyến nghị.
        </p>
      ) : (
        <>
          <section aria-labelledby="putaway-report-reasons">
            <h3 id="putaway-report-reasons" className="mb-2 text-sm font-semibold">
              Theo nhóm lý do
            </h3>
            <ul className="flex flex-col gap-2">
              {report.byReason.map((entry) => (
                <li key={entry.reasonCode ?? 'none'} className="text-xs">
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{entry.label}</span>
                    <span className="tabular-nums">
                      {entry.count} · {percent(entry.count, report.deviatedLines)}
                    </span>
                  </div>
                  <div className="bg-muted h-2" aria-hidden="true">
                    <div
                      className="bg-primary h-2"
                      style={{ width: `${(entry.count / maxReasonCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section aria-labelledby="putaway-report-staff">
              <h3 id="putaway-report-staff" className="mb-2 text-sm font-semibold">
                Theo nhân viên
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead className="text-right">Khác / tổng dòng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byStaff.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell className="break-words">{entry.fullName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.deviatedLines} / {entry.totalLines} ·{' '}
                        {percent(entry.deviatedLines, entry.totalLines)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
            <section aria-labelledby="putaway-report-slots">
              <h3 id="putaway-report-slots" className="mb-2 text-sm font-semibold">
                Vị trí hay được cất khác khuyến nghị
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vị trí</TableHead>
                    <TableHead className="text-right">Số dòng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.bySlot.map((entry) => (
                    <TableRow key={entry.slotId}>
                      <TableCell className="font-mono">{entry.slotCode}</TableCell>
                      <TableCell className="text-right tabular-nums">{entry.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>

          <section aria-labelledby="putaway-report-recent">
            <h3 id="putaway-report-recent" className="mb-2 text-sm font-semibold">
              Gần đây
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phiếu · sản phẩm</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.recent.map((entry, index) => (
                  <TableRow key={`${entry.goodsReceiptId}-${entry.putAwayAt}-${index}`}>
                    <TableCell>
                      <p className="font-mono text-xs">{entry.receiptCode}</p>
                      <p className="text-muted-foreground text-xs break-words">
                        {entry.sku} · {formatQuantity(entry.quantity)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono">{entry.slotCode}</p>
                      {entry.usedHeldSlot ? (
                        <Badge variant="outline" className="border-warning text-warning mt-1">
                          Vị trí đang chừa
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-56 text-xs break-words whitespace-normal">
                      {entry.reason}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>{entry.performedByName}</p>
                      <p className="text-muted-foreground">
                        {formatOperationalDate(entry.putAwayAt)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">
        {value}
        {hint ? (
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">{hint}</span>
        ) : null}
      </dd>
    </div>
  )
}
