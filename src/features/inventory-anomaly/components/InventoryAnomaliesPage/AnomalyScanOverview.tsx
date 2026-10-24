import { Radar, RefreshCw, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatInventoryDate } from '@/features/inventory/utils/inventory-format'
import type { InventoryAnomalySummary } from '../../types/inventory-anomaly.types'
import { ANOMALY_SCAN_STATUS_LABELS } from '../../utils/anomaly-reasons'

interface AnomalyScanOverviewProps {
  readonly summary: InventoryAnomalySummary | undefined
  readonly isLoading: boolean
  readonly isError: boolean
  readonly hasWarehouse: boolean
  readonly canScan: boolean
  readonly isStarting: boolean
  readonly onScan: () => void
  readonly onRetry: () => void
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-card min-w-0 rounded-lg border px-3 py-2">
      <p className="text-muted-foreground truncate text-xs">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function LatestScanText({ summary }: { readonly summary: InventoryAnomalySummary }) {
  const scan = summary.latestScan
  if (!scan) return <>Kho chưa được quét lần nào. Lượt quét tự động chạy mỗi đêm sau 02:00.</>
  const when = formatInventoryDate(scan.completedAt ?? scan.createdAt)
  const status = ANOMALY_SCAN_STATUS_LABELS[scan.status]
  switch (scan.status) {
    case 'Running':
      return <>Đang quét các biến động mới của kho…</>
    case 'Completed':
      return (
        <>
          Lần quét gần nhất {when}: {scan.movementsScored} biến động mới, {scan.anomaliesFound} cảnh
          báo.
        </>
      )
    case 'InsufficientData':
      return (
        <>
          {status} ({when}): kho cần ít nhất 30 ngày và 500 biến động để mô hình có chuẩn so sánh.
        </>
      )
    case 'Failed':
      return (
        <>
          Lần quét {when} thất bại: {scan.failureReason ?? 'không rõ nguyên nhân'}
        </>
      )
  }
}

export function AnomalyScanOverview({
  summary,
  isLoading,
  isError,
  hasWarehouse,
  canScan,
  isStarting,
  onScan,
  onRetry,
}: AnomalyScanOverviewProps) {
  if (isLoading) return <Skeleton className="h-24 w-full shrink-0" aria-label="Đang tải tóm tắt" />
  if (isError || !summary)
    return (
      <Alert variant="destructive" className="shrink-0">
        <AlertTitle>Không thể tải tóm tắt bất thường</AlertTitle>
        <AlertDescription>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )

  const isRunning = summary.latestScan?.status === 'Running'
  const precision =
    summary.precision30Days === null ? '—' : `${Math.round(summary.precision30Days * 100)}%`
  return (
    <section aria-label="Tóm tắt phát hiện bất thường" className="flex shrink-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Mức cao đang mở" value={String(summary.openHigh)} />
        <Metric label="Mức trung bình đang mở" value={String(summary.openMedium)} />
        <Metric label="Đã xem xét (30 ngày)" value={String(summary.reviewed30Days)} />
        <Metric label="Tỷ lệ xác nhận đúng (30 ngày)" value={precision} />
      </div>
      <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
        <Sparkles className="text-tertiary hidden size-4 shrink-0 sm:block" aria-hidden="true" />
        <p className="text-muted-foreground min-w-0 flex-1 text-sm" aria-live="polite">
          {hasWarehouse ? (
            <LatestScanText summary={summary} />
          ) : (
            'Chọn một kho để xem lượt quét gần nhất.'
          )}
        </p>
        {canScan && hasWarehouse ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 sm:h-8"
            disabled={isRunning || isStarting}
            onClick={onScan}
          >
            {isRunning || isStarting ? (
              <Spinner aria-hidden="true" />
            ) : (
              <Radar aria-hidden="true" />
            )}
            {isRunning ? 'Đang quét' : 'Quét ngay'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
