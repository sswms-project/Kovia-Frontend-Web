import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InboundRequestLine } from '../../types/inbound-request.types'
import { formatQuantity } from '../../utils/inbound-request-format'
import { InboundColumnLabel } from '@/features/inbound/components/InboundWorkspace'

export function InboundRequestLines({ lines }: { readonly lines: readonly InboundRequestLine[] }) {
  return (
    <section className="bg-card border" aria-labelledby="inbound-request-lines">
      <div className="border-b p-4">
        <h2 id="inbound-request-lines" className="text-sm font-semibold">
          Chi tiết sản phẩm
        </h2>
        <p className="text-muted-foreground text-xs">{lines.length} dòng sản phẩm</p>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL yêu cầu (đơn vị nhập)"
                  description="Số lượng yêu cầu theo đơn vị được chọn khi lập yêu cầu. Ví dụ: 4 Thùng."
                />
              </TableHead>
              <TableHead>
                <InboundColumnLabel
                  label="ĐVQĐ"
                  description="Đơn vị quy đổi. Ví dụ: 1 Thùng = 24 Lon."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL yêu cầu (ĐVT)"
                  description="Số lượng yêu cầu quy đổi về đơn vị tính chính. Ví dụ: 4 Thùng = 96 Lon."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL thực nhận"
                  description="Số lượng đã thực nhận, tính theo đơn vị tính chính."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL đã đóng"
                  description="Số lượng đã đóng không nhận tiếp, tính theo đơn vị tính chính."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL còn nhận"
                  description="Số lượng yêu cầu còn phải nhận sau khi trừ phần đã nhận và đã đóng, tính theo đơn vị tính chính."
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-muted-foreground font-mono text-xs">{line.productSKU}</p>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.enteredQuantity)} {line.enteredUnitName ?? line.unitName}
                  {line.conversionFactorSnapshot !== 1 ? (
                    <span className="text-muted-foreground block text-xs">
                      ×{formatQuantity(line.conversionFactorSnapshot)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {line.enteredUnitName &&
                  (line.baseUnitId
                    ? line.enteredUnitId !== line.baseUnitId
                    : line.enteredUnitName !== line.unitName)
                    ? `1 ${line.enteredUnitName} = ${formatQuantity(line.conversionFactorSnapshot)} ${line.unitName}`
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.quantity)} {line.unitName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.receivedQuantity)} {line.unitName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.closedQuantity)} {line.unitName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.remainingQuantity)} {line.unitName}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y md:hidden">
        {lines.map((line) => (
          <div key={line.id} className="p-4">
            <p className="font-medium">{line.productName}</p>
            <p className="text-muted-foreground font-mono text-xs">{line.productSKU}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatQuantity(line.enteredQuantity)} {line.enteredUnitName ?? line.unitName} →{' '}
              {formatQuantity(line.quantity)} {line.unitName}
              {line.conversionFactorSnapshot !== 1
                ? ` (×${formatQuantity(line.conversionFactorSnapshot)})`
                : ''}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 min-[480px]:grid-cols-4">
              <Metadata
                label="SL yêu cầu"
                value={`${formatQuantity(line.quantity)} ${line.unitName ?? ''}`}
              />
              <Metadata
                label="SL thực nhận"
                value={`${formatQuantity(line.receivedQuantity)} ${line.unitName ?? ''}`}
              />
              <Metadata
                label="SL đã đóng"
                value={`${formatQuantity(line.closedQuantity)} ${line.unitName ?? ''}`}
              />
              <Metadata
                label="SL còn nhận"
                value={`${formatQuantity(line.remainingQuantity)} ${line.unitName ?? ''}`}
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

function Metadata({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}
