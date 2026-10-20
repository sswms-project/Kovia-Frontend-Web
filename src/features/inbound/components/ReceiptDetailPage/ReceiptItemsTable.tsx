import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatQuantity,
  formatOperationalDate,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptItem } from '../../types/inbound.types'
import { InboundColumnLabel } from '../InboundWorkspace'

interface ReceiptItemsTableProps {
  readonly items: readonly GoodsReceiptItem[]
}

export function ReceiptItemsTable({ items }: ReceiptItemsTableProps) {
  return (
    <>
      <ul className="divide-y md:hidden" aria-label="Hàng hóa thực nhận">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 p-4">
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-muted-foreground font-mono text-xs">{item.productSKU}</p>
              {item.exceptionReason ? (
                <p className="text-destructive mt-1 text-xs">{item.exceptionReason}</p>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs min-[480px]:grid-cols-4">
              <ReceiptItemMetric
                label="SL yêu cầu"
                value={formatQuantity(item.orderedQuantity)}
                unit={item.baseUnitName}
              />
              <ReceiptItemMetric
                label="SL thực nhận"
                value={formatQuantity(item.receivedQuantity)}
                unit={item.baseUnitName}
              />
              <ReceiptItemMetric
                label="SL hỏng"
                value={formatQuantity(item.damagedQuantity)}
                unit={item.baseUnitName}
              />
              <ReceiptItemMetric
                label="SL cần cất"
                value={formatQuantity(item.remainingPutAwayQuantity)}
                unit={item.baseUnitName}
              />
            </dl>
            <p className="text-muted-foreground text-xs">
              Từ chối trước nhận: {formatQuantity(item.rejectedQuantity ?? 0)} · Hỏng còn cần cách
              biệt: {formatQuantity(item.remainingDamageIsolationQuantity ?? 0)} {item.baseUnitName}
            </p>
            {item.enteredUnitId &&
            item.enteredUnitId !== item.baseUnitId &&
            item.enteredUnitName ? (
              <p className="text-muted-foreground text-xs">
                1 {item.enteredUnitName} = {formatQuantity(item.conversionFactorSnapshot)}{' '}
                {item.baseUnitName}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {(item.keptAtReceivingQuantity ?? 0) > 0 && (
                <>
                  Giữ tại khu nhận: {formatQuantity(item.keptAtReceivingQuantity ?? 0)}{' '}
                  {item.baseUnitName}.{' '}
                </>
              )}
              Vị trí cất:{' '}
              {item.putAwayDetails.length
                ? item.putAwayDetails
                    .map(
                      (detail) =>
                        `${detail.isSystemDefaultSlot ? `Kệ ${detail.rackCode}` : detail.slotCode} · ${formatQuantity(detail.quantity)} ${item.baseUnitName}`
                    )
                    .join('; ')
                : 'Chưa cất hàng'}
            </p>
            {item.lotNumber || item.expiryDate ? (
              <p className="text-muted-foreground text-xs">
                Lô <span className="font-mono">{item.lotNumber ?? '—'}</span>
                {item.manufacturedDate
                  ? ` · SX ${formatOperationalDate(item.manufacturedDate)}`
                  : ''}
                {item.expiryDate ? ` · HSD ${formatOperationalDate(item.expiryDate)}` : ''}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-card sticky top-0 z-10">
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL yêu cầu"
                  description="Số lượng yêu cầu nhập kho, tính theo đơn vị tính chính (ĐVT)."
                />
              </TableHead>
              <TableHead>
                <InboundColumnLabel
                  label="ĐVT"
                  description="Đơn vị tính chính dùng cho các cột số lượng. Ví dụ: Lon."
                />
              </TableHead>
              <TableHead>
                <InboundColumnLabel
                  label="ĐVQĐ"
                  description="Đơn vị quy đổi theo yêu cầu nhập. Ví dụ: 1 Thùng = 24 Lon."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL thực nhận"
                  description="Số lượng thực nhận trên phiếu này, bao gồm hàng hỏng, tính theo ĐVT."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL hỏng"
                  description="Số lượng hàng hỏng trong số thực nhận, tính theo ĐVT."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL đạt"
                  description="Số lượng hàng đạt để cất: số thực nhận trừ số hỏng, tính theo ĐVT."
                />
              </TableHead>
              <TableHead className="text-right">
                <InboundColumnLabel
                  label="SL cần cất"
                  description="Số lượng hàng đạt còn phải cất vào vị trí, tính theo ĐVT."
                />
              </TableHead>
              <TableHead>Vị trí cất</TableHead>
              <TableHead>Số lô</TableHead>
              <TableHead>Hạn sử dụng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-muted-foreground font-mono text-xs">{item.productSKU}</p>
                  <p className="text-muted-foreground text-xs">
                    Từ chối trước nhận: {formatQuantity(item.rejectedQuantity ?? 0)} · Hỏng còn cần
                    cách biệt: {formatQuantity(item.remainingDamageIsolationQuantity ?? 0)}{' '}
                    {item.baseUnitName}
                  </p>
                  {item.exceptionReason ? (
                    <p className="text-destructive mt-1 text-xs">{item.exceptionReason}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.orderedQuantity)}
                </TableCell>
                <TableCell>{item.baseUnitName}</TableCell>
                <TableCell>
                  {item.enteredUnitId &&
                  item.enteredUnitId !== item.baseUnitId &&
                  item.enteredUnitName
                    ? `1 ${item.enteredUnitName} = ${formatQuantity(item.conversionFactorSnapshot)} ${item.baseUnitName}`
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.receivedQuantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.damagedQuantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.usableQuantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.remainingPutAwayQuantity)}
                </TableCell>
                <TableCell>
                  {(item.keptAtReceivingQuantity ?? 0) > 0 && (
                    <p className="font-medium">
                      Giữ tại khu nhận: {formatQuantity(item.keptAtReceivingQuantity ?? 0)}{' '}
                      {item.baseUnitName}
                    </p>
                  )}
                  {item.putAwayDetails.length ? (
                    <ul className="flex flex-col gap-1">
                      {item.putAwayDetails.map((detail) => (
                        <li key={detail.id}>
                          {detail.isSystemDefaultSlot ? `Kệ ${detail.rackCode}` : detail.slotCode} ·{' '}
                          {formatQuantity(detail.quantity)} {item.baseUnitName}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Chưa cất hàng'
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-mono">{item.lotNumber ?? '—'}</p>
                  {item.manufacturedDate ? (
                    <p className="text-muted-foreground text-xs">
                      SX {formatOperationalDate(item.manufacturedDate)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {item.expiryDate ? formatOperationalDate(item.expiryDate) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function ReceiptItemMetric({
  label,
  value,
  unit,
}: {
  readonly label: string
  readonly value: string
  readonly unit: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {value} {unit}
      </dd>
    </div>
  )
}
