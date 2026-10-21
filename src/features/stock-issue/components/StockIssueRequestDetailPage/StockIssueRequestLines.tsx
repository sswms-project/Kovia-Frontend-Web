import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import type { StockIssueRequestItem } from '../../types/stock-issue.types'
import {
  formatStockIssueDate,
  formatStockIssueQuantity,
  formatStockIssueUnitQuantity,
  stockIssueItemFactor,
  stockIssuePickedEntered,
} from '../../utils/stock-issue-format'

interface StockIssueRequestLinesProps {
  readonly items: readonly StockIssueRequestItem[]
  readonly canRemovePick: boolean
  readonly isRemovingPick: boolean
  readonly onRemovePickDetail: (pickDetailId: string) => void
}

function formatExpiry(value: string | null): string | null {
  const date = value ? isoDateStringToDate(value.slice(0, 10)) : undefined
  return date ? `HSD ${formatDisplayDate(date)}` : null
}

/** Quy ra đơn vị cơ sở khi dòng được đặt theo thùng/kiện, để người đọc đối chiếu được với tồn kho. */
function BaseEquivalent({ item, quantity }: { item: StockIssueRequestItem; quantity: number }) {
  if (stockIssueItemFactor(item) === 1) return null
  return (
    <span className="text-muted-foreground block text-xs">
      = {formatStockIssueQuantity(quantity)} đơn vị cơ sở
    </span>
  )
}

interface LineLocationsProps {
  readonly item: StockIssueRequestItem
  readonly canRemovePick: boolean
  readonly isRemovingPick: boolean
  readonly onRemovePickDetail: (pickDetailId: string) => void
}

/** Vị trí cần lấy và các lần đã lấy của một dòng; dùng chung cho bảng và thẻ trên mobile. */
function LineLocations({
  item,
  canRemovePick,
  isRemovingPick,
  onRemovePickDetail,
}: LineLocationsProps) {
  const factor = stockIssueItemFactor(item)
  return (
    <>
      {item.pickLocations.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Cần lấy tại">
          {item.pickLocations.map((location) => (
            <li key={location.inventoryStockId} className="flex items-start gap-1.5 text-xs">
              <MapPin className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-mono font-medium" translate="no">
                  {location.slotCode}
                </span>{' '}
                <span className="text-muted-foreground">
                  ({location.zoneCode} / {location.rackCode})
                </span>
                {location.directFromReceiving && (
                  <span className="text-primary block font-medium">
                    Đi thẳng từ khu nhận đến khu xuất
                  </span>
                )}
                {location.allocationReason && (
                  <span className="text-muted-foreground block">{location.allocationReason}</span>
                )}
                {location.lotNumber ? (
                  <>
                    {' '}
                    · Lô{' '}
                    <span className="font-mono" translate="no">
                      {location.lotNumber}
                    </span>
                    {formatExpiry(location.expiryDate)
                      ? ` · ${formatExpiry(location.expiryDate)}`
                      : ''}
                  </>
                ) : null}
                {' · '}
                <span className="font-medium">
                  lấy{' '}
                  {formatStockIssueUnitQuantity(
                    location.reservedQuantity / factor,
                    item.enteredUnitName
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {item.pickDetails.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2" aria-label="Đã lấy">
          {item.pickDetails.map((detail) => (
            <li key={detail.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-xs">
                <p>
                  Đã lấy tại{' '}
                  <span className="font-mono font-medium" translate="no">
                    {detail.slotCode}
                  </span>
                  {detail.lotNumber ? (
                    <>
                      {' '}
                      · Lô{' '}
                      <span className="font-mono" translate="no">
                        {detail.lotNumber}
                      </span>
                    </>
                  ) : null}{' '}
                  ·{' '}
                  {formatStockIssueUnitQuantity(
                    detail.pickedQuantity / factor,
                    item.enteredUnitName
                  )}
                </p>
                <p className="text-muted-foreground">
                  {detail.pickedByName} · {formatStockIssueDate(detail.pickedAt)}
                  {detail.stagingSlotCode && detail.stagingSlotCode !== detail.slotCode
                    ? ` · Chờ xuất tại ${detail.stagingSlotCode}`
                    : ''}
                </p>
                <p className="text-muted-foreground">
                  {detail.issuedAt
                    ? `Đã xuất ${formatStockIssueDate(detail.issuedAt)}`
                    : 'Chưa xuất kho'}
                </p>
              </div>
              {canRemovePick && !detail.issuedAt ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isRemovingPick}
                  onClick={() => onRemovePickDetail(detail.id)}
                >
                  Bỏ phân bổ
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {item.pickLocations.length === 0 && item.pickDetails.length === 0 ? (
        <span className="text-muted-foreground text-xs">
          Chưa giữ hàng — vị trí hiện sau khi giao việc lấy hàng.
        </span>
      ) : null}
    </>
  )
}

export function StockIssueRequestLines({
  items,
  canRemovePick,
  isRemovingPick,
  onRemovePickDetail,
}: StockIssueRequestLinesProps) {
  return (
    <section className="bg-card border" aria-labelledby="stock-issue-request-lines">
      <div className="border-b p-4">
        <h2 id="stock-issue-request-lines" className="text-sm font-semibold">
          Chi tiết sản phẩm
        </h2>
        <p className="text-muted-foreground text-xs">{items.length} dòng sản phẩm</p>
      </div>
      <ul className="divide-y md:hidden" aria-label="Chi tiết sản phẩm">
        {items.map((item, index) => {
          const factor = stockIssueItemFactor(item)
          const remainingBase = Math.max(0, item.quantity - item.pickedQuantity)
          return (
            <li key={item.id} className="flex flex-col gap-2 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                  {item.productName}
                </p>
                <p className="text-muted-foreground font-mono text-xs" translate="no">
                  {item.sku}
                </p>
                {item.note ? (
                  <p className="text-muted-foreground mt-1 text-xs">Ghi chú: {item.note}</p>
                ) : null}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Yêu cầu</dt>
                  <dd className="font-medium tabular-nums">
                    {formatStockIssueUnitQuantity(item.enteredQuantity, item.enteredUnitName)}
                    <BaseEquivalent item={item} quantity={item.quantity} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Đã lấy</dt>
                  <dd className="font-medium tabular-nums">
                    {formatStockIssueUnitQuantity(
                      stockIssuePickedEntered(item),
                      item.enteredUnitName
                    )}
                    <BaseEquivalent item={item} quantity={item.pickedQuantity} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Còn lại</dt>
                  <dd className="font-medium tabular-nums">
                    {formatStockIssueUnitQuantity(remainingBase / factor, item.enteredUnitName)}
                  </dd>
                </div>
              </dl>
              <div>
                <LineLocations
                  item={item}
                  canRemovePick={canRemovePick}
                  isRemovingPick={isRemovingPick}
                  onRemovePickDetail={onRemovePickDetail}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">SL yêu cầu</TableHead>
              <TableHead className="text-right">Đã lấy</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead>Vị trí lấy hàng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const factor = stockIssueItemFactor(item)
              const pickedEntered = stockIssuePickedEntered(item)
              const remainingBase = Math.max(0, item.quantity - item.pickedQuantity)
              return (
                <TableRow key={item.id} className="align-top">
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="min-w-0">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground font-mono text-xs" translate="no">
                      {item.sku}
                    </p>
                    {item.note ? (
                      <p className="text-muted-foreground mt-1 text-xs">Ghi chú: {item.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStockIssueUnitQuantity(item.enteredQuantity, item.enteredUnitName)}
                    <BaseEquivalent item={item} quantity={item.quantity} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStockIssueUnitQuantity(pickedEntered, item.enteredUnitName)}
                    <BaseEquivalent item={item} quantity={item.pickedQuantity} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStockIssueUnitQuantity(remainingBase / factor, item.enteredUnitName)}
                  </TableCell>
                  <TableCell>
                    <LineLocations
                      item={item}
                      canRemovePick={canRemovePick}
                      isRemovingPick={isRemovingPick}
                      onRemovePickDetail={onRemovePickDetail}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
