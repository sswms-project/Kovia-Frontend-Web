import { TrendingUp } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { InventoryFilterOption } from '../../types/inventory.types'
import type { ForecastChartPoint } from '../../utils/forecast-chart'
import { formatInventoryDateOnly, formatInventoryQuantity } from '../../utils/inventory-format'

const HORIZON_OPTIONS = [7, 14, 30, 60, 90]

interface InventoryForecastDirectoryProps {
  readonly permissions: readonly string[]
  readonly productId: string
  readonly productOptions: readonly InventoryFilterOption[]
  readonly warehouseId: string
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly horizonDays: number
  readonly chartData: readonly ForecastChartPoint[]
  readonly modelName?: string
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly areProductsLoading: boolean
  readonly areWarehousesLoading: boolean
  readonly onProductChange: (value: string) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onHorizonChange: (value: number) => void
  readonly onRetry: () => void
}

export function InventoryForecastDirectory({
  productId,
  productOptions,
  warehouseId,
  warehouseOptions,
  horizonDays,
  chartData,
  modelName,
  isLoading,
  isFetching,
  isError,
  areProductsLoading,
  areWarehousesLoading,
  onProductChange,
  onWarehouseChange,
  onHorizonChange,
  onRetry,
}: InventoryForecastDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <TrendingUp aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Báo cáo & phân tích</p>
            <h1 className="mt-0.5 text-xl font-semibold">Dự báo tồn kho</h1>
          </div>
        </div>
      </header>
      <section
        className="bg-card flex min-h-0 flex-1 flex-col border"
        aria-labelledby="forecast-title"
      >
        <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="forecast-title" className="text-sm font-semibold">
              Biểu đồ dự báo
            </h2>
            <p className="text-muted-foreground text-xs">
              {modelName ? `Mô hình: ${modelName}` : 'Chọn sản phẩm để xem dự báo.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              aria-label="Chọn sản phẩm"
              className="h-11 min-w-52 sm:h-8"
              value={productId}
              disabled={areProductsLoading}
              onChange={(event) => onProductChange(event.target.value)}
            >
              <NativeSelectOption value="">Chọn sản phẩm</NativeSelectOption>
              {productOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc dự báo theo kho"
              className="h-11 min-w-44 sm:h-8"
              value={warehouseId}
              disabled={areWarehousesLoading}
              onChange={(event) => onWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {warehouseOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Số ngày dự báo"
              className="h-11 min-w-28 sm:h-8"
              value={String(horizonDays)}
              onChange={(event) => onHorizonChange(Number(event.target.value))}
            >
              {HORIZON_OPTIONS.map((days) => (
                <NativeSelectOption key={days} value={days}>
                  {days} ngày
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {isFetching ? 'Đang cập nhật dự báo' : 'Dự báo đã cập nhật'}
        </p>
        {!productId ? (
          <OperationalEmptyState
            title="Chưa chọn sản phẩm"
            description="Chọn một sản phẩm ở trên để xem dự báo tồn kho."
          />
        ) : isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải dự báo tồn kho" onRetry={onRetry} />
        ) : chartData.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có dữ liệu"
            description="Sản phẩm này chưa có đủ lịch sử biến động để dự báo."
          />
        ) : (
          <div className="min-h-0 flex-1 p-3">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={[...chartData]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  tickFormatter={formatInventoryDateOnly}
                />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  labelFormatter={(value) => formatInventoryDateOnly(String(value))}
                  formatter={(value) =>
                    typeof value === 'number' ? formatInventoryQuantity(value) : value
                  }
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Thực tế"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Dự báo"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
