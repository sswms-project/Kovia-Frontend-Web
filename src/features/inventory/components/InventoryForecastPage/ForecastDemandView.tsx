import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ForecastRun } from '../../types/inventory.types'
import { formatInventoryDateOnly, formatInventoryQuantity } from '../../utils/inventory-format'

export function ForecastDemandView({
  run,
  productId,
  onProductChange,
}: {
  readonly run: ForecastRun
  readonly productId: string
  readonly onProductChange: (id: string) => void
}) {
  const products = run.details?.products ?? []
  const product = products.find((item) => item.productId === productId) ?? products[0]
  const results = run.results.filter((item) => item.productId === product?.productId)
  // No invented connecting point: both series represent daily external issue quantity in base units.
  const data = [
    ...(product?.history ?? []).map((point) => ({
      date: point.date,
      actual: point.quantity,
      forecast: null,
    })),
    ...results.map((point) => ({
      date: point.forecastDate,
      actual: point.actualQuantity,
      forecast: point.forecastQuantity,
    })),
  ]
  const evaluated = results.filter((item) => item.actualQuantity !== null)
  const mae = evaluated.length
    ? evaluated.reduce(
        (sum, item) => sum + Math.abs(item.forecastQuantity - (item.actualQuantity ?? 0)),
        0
      ) / evaluated.length
    : null
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <NativeSelect
        aria-label="Mặt hàng phân tích nhu cầu"
        value={product?.productId ?? ''}
        onChange={(event) => onProductChange(event.target.value)}
      >
        <NativeSelectOption value="">Chọn mặt hàng</NativeSelectOption>
        {products.map((item) => (
          <NativeSelectOption key={item.productId} value={item.productId}>
            {item.sku} · {item.productName} ·{' '}
            {item.basis === 'Forecast'
              ? 'Đủ lịch sử'
              : item.basis === 'PolicyFallback'
                ? 'Chính sách tồn'
                : 'Không thể tính'}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {!product ? (
        <p className="text-muted-foreground py-8 text-center">
          Kho chưa có chính sách tồn đang hoạt động, hoặc phiên cũ chưa lưu căn cứ. Cấu hình chính
          sách rồi tính lại.
        </p>
      ) : product.basis === 'Unavailable' ? (
        <Alert>
          <AlertDescription>
            {product.warning ?? 'Không thể tính với dữ liệu hiện tại.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span>
              Lịch sử: {formatInventoryDateOnly(product.historyFrom)} –{' '}
              {formatInventoryDateOnly(product.historyTo)} ({product.observationDays} ngày)
            </span>
            <span>ĐVT: {product.unitName || 'Cơ sở'}</span>
            <span>Phương pháp: {product.method}</span>
          </div>
          {product.warning ? (
            <Alert>
              <AlertDescription>{product.warning}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Metric label="MAE holdout (ngoài mẫu)" value={product.holdoutMae} />
            <Metric label="MAE baseline trung bình" value={product.baselineMae} />
            <Metric label="WAPE holdout (%)" value={product.holdoutWape} />
          </div>
          <p className="text-muted-foreground text-xs">
            Sai số càng thấp càng tốt. Holdout dùng tối đa 7 ngày cuối (20% cửa sổ); baseline là
            trung bình của tập huấn luyện. Không phải xác suất hoặc cam kết độ chính xác.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatInventoryDateOnly}
                stroke="var(--muted-foreground)"
              />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                labelFormatter={(value) => formatInventoryDateOnly(String(value))}
                contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              />
              <Legend />
              <Line
                dataKey="actual"
                name="Xuất thực tế"
                type="linear"
                stroke="var(--chart-1)"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="forecast"
                name="Nhu cầu dự báo"
                type="linear"
                stroke="var(--chart-2)"
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-muted-foreground text-xs">
            {mae === null
              ? 'Chưa có ngày dự báo đã kết thúc để đối chiếu thực tế.'
              : `MAE đối chiếu: ${formatInventoryQuantity(mae)} ${product.unitName}, trên ${evaluated.length} ngày.`}
          </p>
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: number | null }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value === null ? 'Không đủ mẫu' : formatInventoryQuantity(value)}
      </p>
    </div>
  )
}
