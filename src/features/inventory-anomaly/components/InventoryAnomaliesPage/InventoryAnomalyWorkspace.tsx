'use client'

import { useEffect, useState, type ComponentProps, type CSSProperties } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { clampSidePanelWidth } from '@/components/operations/SidePanelResizeHandle'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { InventoryWorkspaceNavigation } from '@/features/inventory/components/InventoryWorkspaceNavigation'
import { cn } from '@/lib/utils'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import type {
  AnomalyReviewStatus,
  AnomalySeverity,
  InventoryAnomaly,
} from '../../types/inventory-anomaly.types'
import { ANOMALY_REVIEW_STATUS_LABELS, ANOMALY_SEVERITY_LABELS } from '../../utils/anomaly-reasons'
import { AnomalyScanOverview } from './AnomalyScanOverview'
import { InventoryAnomalyDetailSheet } from './InventoryAnomalyDetailSheet'
import { InventoryAnomalyDesktopTable, InventoryAnomalyMobileList } from './InventoryAnomalyResults'

interface InventoryAnomalyWorkspaceProps {
  readonly permissions: readonly string[]
  readonly overview: ComponentProps<typeof AnomalyScanOverview>
  readonly detail: Omit<
    ComponentProps<typeof InventoryAnomalyDetailSheet>,
    'width' | 'minWidth' | 'rightOffset' | 'onResize' | 'onResizeEnd'
  >
  readonly warehouseOptions: readonly { value: string; label: string }[]
  readonly warehouseId: string
  readonly severity: AnomalySeverity | ''
  readonly reviewStatus: AnomalyReviewStatus | ''
  readonly items: readonly InventoryAnomaly[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onSeverityChange: (value: AnomalySeverity | '') => void
  readonly onReviewStatusChange: (value: AnomalyReviewStatus | '') => void
  readonly onSelect: (anomaly: InventoryAnomaly) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
}

const PANEL_MIN_WIDTH = 380
const PANEL_DEFAULT_WIDTH = 480
const PANEL_WIDTH_STORAGE_KEY = 'kovia-anomaly-panel-width'

function getStoredPanelWidth() {
  const stored = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY))
  return clampSidePanelWidth(
    Number.isFinite(stored) && stored > 0 ? stored : PANEL_DEFAULT_WIDTH,
    PANEL_MIN_WIDTH
  )
}

export function InventoryAnomalyWorkspace(props: InventoryAnomalyWorkspaceProps) {
  const { items, isLoading, isFetching, isError, reviewStatus, severity } = props
  const isFiltered = Boolean(severity) || reviewStatus !== 'Open'
  const isPanelOpen = Boolean(props.detail.anomaly)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  // Trợ lý AI mở thì đã chiếm mép phải (trang đã nhường chỗ cho nó); khung cảnh báo đứng ngay bên trái.
  const isAiPanelOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const aiPanelWidth = useAiAssistantPanelStore((state) => state.width)
  const rightOffset = isAiPanelOpen ? aiPanelWidth : 0

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setPanelWidth(getStoredPanelWidth()))
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4',
        // Như khung trợ lý AI: khung cảnh báo nằm cạnh danh sách thay vì đè lên nó.
        !isResizing &&
          'transition-[padding-right] duration-300 ease-out motion-reduce:transition-none',
        isPanelOpen && 'sm:pr-(--anomaly-panel-width)'
      )}
      // Biến CSS tùy biến không nằm trong kiểu CSSProperties của React nên cần ép kiểu.
      style={{ '--anomaly-panel-width': `${panelWidth}px` } as CSSProperties}
    >
      <h1 className="sr-only">Bất thường tồn kho</h1>
      <InventoryWorkspaceNavigation currentView="anomalies" permissions={props.permissions} />
      <AnomalyScanOverview {...props.overview} />
      <OperationalListPanel aria-labelledby="anomaly-list-title">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
          <h2 id="anomaly-list-title" className="mr-auto text-sm font-semibold">
            Cảnh báo bất thường
          </h2>
          <NativeSelect
            aria-label="Kho"
            className="h-11 sm:h-8"
            value={props.warehouseId}
            onChange={(event) => props.onWarehouseChange(event.target.value)}
          >
            {props.warehouseOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Mức độ"
            className="h-11 sm:h-8"
            value={severity}
            onChange={(event) => props.onSeverityChange(event.target.value as AnomalySeverity | '')}
          >
            <NativeSelectOption value="">Mọi mức độ</NativeSelectOption>
            <NativeSelectOption value="High">{ANOMALY_SEVERITY_LABELS.High}</NativeSelectOption>
            <NativeSelectOption value="Medium">{ANOMALY_SEVERITY_LABELS.Medium}</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Trạng thái xem xét"
            className="h-11 sm:h-8"
            value={reviewStatus}
            onChange={(event) =>
              props.onReviewStatusChange(event.target.value as AnomalyReviewStatus | '')
            }
          >
            <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
            {(['Open', 'Confirmed', 'Dismissed'] as const).map((status) => (
              <NativeSelectOption key={status} value={status}>
                {ANOMALY_REVIEW_STATUS_LABELS[status]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 sm:size-8"
            disabled={isFetching}
            aria-label="Làm mới cảnh báo"
            onClick={props.onRetry}
          >
            <RefreshCw
              className={isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
              aria-hidden="true"
            />
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {isFetching ? 'Đang cập nhật cảnh báo' : 'Cảnh báo đã cập nhật'}
        </p>
        {isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : isError && items.length === 0 ? (
          <OperationalErrorState
            title="Không thể tải cảnh báo bất thường"
            onRetry={props.onRetry}
          />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title={isFiltered ? 'Không có cảnh báo phù hợp' : 'Không có cảnh báo cần xem xét'}
            description={
              isFiltered
                ? 'Thử đổi mức độ hoặc trạng thái xem xét.'
                : 'Mô hình chưa thấy biến động nào bất thường ở kho này.'
            }
          />
        ) : (
          <>
            <InventoryAnomalyMobileList items={items} onSelect={props.onSelect} />
            <InventoryAnomalyDesktopTable items={items} onSelect={props.onSelect} />
            <OperationalPagination
              page={props.page}
              pageSize={props.pageSize}
              totalCount={props.totalCount}
              isPending={isFetching}
              onPageChange={props.onPageChange}
              onPageSizeChange={props.onPageSizeChange}
            />
          </>
        )}
      </OperationalListPanel>
      <InventoryAnomalyDetailSheet
        {...props.detail}
        width={panelWidth}
        minWidth={PANEL_MIN_WIDTH}
        rightOffset={rightOffset}
        onResize={(width) => {
          setIsResizing(true)
          setPanelWidth(width)
        }}
        onResizeEnd={(width) => {
          setPanelWidth(width)
          setIsResizing(false)
          window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(Math.round(width)))
        }}
      />
    </div>
  )
}
