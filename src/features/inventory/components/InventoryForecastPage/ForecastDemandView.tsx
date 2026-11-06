import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DemandForecastDiagnostics, ForecastRun } from '../../types/inventory.types'
import { buildDemandChartData } from '../../utils/forecast-chart'
import { forecastModelLabel } from '../../utils/forecast-overview'
import { formatInventoryDateOnly, formatInventoryQuantity } from '../../utils/inventory-format'
import { ForecastExplanation } from './ForecastExplanation'

const METHOD_HELP: Record<string, string> = {
  'naive-average': 'Lấy nhu cầu trung bình mỗi ngày trong lịch sử làm mức dự báo cho các ngày tới.',
  'weekday-average':
    'Tính mức trung bình riêng cho từng thứ trong tuần, ví dụ so thứ Hai với các thứ Hai trước đó.',
  'holt-winters-weekly':
    'Holt-Winters: tính cả xu hướng tăng/giảm và nhịp lặp lại theo chu kỳ 7 ngày.',
  'croston-sba':
    'Croston: dành cho mặt hàng xuất không đều, có nhiều ngày không phát sinh nhu cầu.',
  'lightgbm-global':
    'LightGBM: dùng mô hình học máy nhận diện các đặc điểm trong dữ liệu lịch sử để dự báo nhu cầu.',
}

export function ForecastDemandView({
  run,
  productId,
  onProductChange,
}: {
  readonly run: Pick<ForecastRun, 'details' | 'results'>
  readonly productId: string
  readonly onProductChange: (id: string) => void
}) {
  const products = run.details?.products ?? []
  const product = products.find((item) => item.productId === productId) ?? products[0]
  const results = run.results.filter((item) => item.productId === product?.productId)
  const data = buildDemandChartData(product?.history ?? [], results)
  const hasRange = data.some((point) => point.range !== null)
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
            {product.basis === 'Forecast' ? (
              <span>Cách dự báo: {forecastModelLabel(product.method)}</span>
            ) : null}
          </div>
          {product.warning ? (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>
                  {product.stockoutDays > 0
                    ? 'Có ngày hết hàng, nên một phần nhu cầu được ước tính.'
                    : 'Có lưu ý về dữ liệu dùng dự báo.'}
                </span>
                <ForecastExplanation label="Lưu ý về dữ liệu dự báo" text={product.warning} />
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Metric
              label="Sai lệch trung bình/ngày"
              value={product.holdoutMae}
              unit={product.unitName}
              help="MAE: mức chênh lệch tuyệt đối trung bình mỗi ngày giữa dự báo và số lượng thực tế khi kiểm tra trên dữ liệu quá khứ. Cùng đơn vị với mặt hàng. Số càng thấp càng tốt."
            />
            <Metric
              label="Sai lệch cách tính cơ bản"
              value={product.baselineMae}
              unit={product.unitName}
              help="MAE của cách lấy nhu cầu trung bình các ngày. Đây là mốc so sánh để biết cách dự báo được chọn có giảm sai lệch hay không, không phải lượng hàng cần nhập."
            />
            <Metric
              label="Tỷ lệ sai lệch"
              value={product.holdoutWape}
              unit="%"
              help="WAPE: tổng chênh lệch tuyệt đối chia cho tổng nhu cầu thực tế, nhân 100%. Số càng thấp càng tốt; đây không phải phần trăm độ chính xác. Không tính được khi chưa đủ dữ liệu hoặc tổng nhu cầu thực tế bằng 0."
            />
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <p>Sai lệch càng thấp, dự báo càng sát dữ liệu đã kiểm tra.</p>
            <ForecastExplanation
              label="Cách đánh giá dự báo"
              text="Hệ thống thử dự báo lại tối đa 3 giai đoạn 7 ngày gần nhất, dùng dữ liệu trước mỗi giai đoạn để dự báo và so với số thực tế. Cách có sai lệch trung bình thấp nhất được chọn. Đây là kết quả kiểm tra quá khứ, không bảo đảm độ chính xác tương tự trong tương lai."
            />
          </div>
          <CandidateTable product={product} />
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
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
              {hasRange ? (
                <Area
                  dataKey="range"
                  name="Khoảng dao động 80%"
                  type="linear"
                  stroke="none"
                  fill="var(--chart-2)"
                  fillOpacity={0.15}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ) : null}
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
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-muted-foreground text-xs">
            {mae === null
              ? 'Chưa có ngày dự báo đã kết thúc để đối chiếu thực tế.'
              : `Sai lệch so với thực tế: ${formatInventoryQuantity(mae)} ${product.unitName}/ngày, trên ${evaluated.length} ngày.`}
          </p>
        </>
      )}
    </div>
  )
}

function CandidateTable({ product }: { readonly product: DemandForecastDiagnostics }) {
  if (!product.candidates?.length) return null
  return (
    <Table aria-label="So sánh cách dự báo">
      <TableHeader>
        <TableRow>
          <TableHead>Cách dự báo đã thử</TableHead>
          <TableHead className="text-right">Sai lệch/ngày ({product.unitName})</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {product.candidates.map((candidate) => {
          const methodHelp = METHOD_HELP[candidate.modelName]
          return (
            <TableRow key={candidate.modelName}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{forecastModelLabel(candidate.modelName)}</span>
                  {methodHelp ? (
                    <ForecastExplanation
                      label={`Giải thích cách ${forecastModelLabel(candidate.modelName).toLowerCase()}`}
                      text={methodHelp}
                    />
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInventoryQuantity(candidate.mae)}
              </TableCell>
              <TableCell>
                {candidate.modelName === product.method ? <Badge>Đang dùng</Badge> : null}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function Metric({
  label,
  value,
  unit,
  help,
}: {
  readonly label: string
  readonly value: number | null
  readonly unit: string
  readonly help: string
}) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <p>{label}</p>
        <ForecastExplanation label={`Giải thích ${label.toLowerCase()}`} text={help} />
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value === null ? 'Chưa tính được' : `${formatInventoryQuantity(value)} ${unit}`}
      </p>
    </div>
  )
}
