'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OpeningStockRecord } from '../../types/inventory.types'
import { inventoryService } from '../../services/inventory.service'
import {
  formatInventoryDate,
  formatInventoryQuantity,
  formatQualityStatus,
  formatEligibilityStatus,
} from '../../utils/inventory-format'

interface OpeningStockDetailProps {
  readonly item: OpeningStockRecord
  readonly status: string
  readonly actions: ReactNode
}

export function OpeningStockDetail({ item, status, actions }: OpeningStockDetailProps) {
  return (
    <>
      <section
        aria-label="Thông tin chứng từ"
        className="bg-card grid shrink-0 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <p className="text-muted-foreground text-xs">Kho ghi nhận</p>
          <p className="text-sm font-medium">{item.warehouseName}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Ngày ghi nhận</p>
          <p className="text-sm">
            {item.effectiveDate ?? 'Theo lịch sử'}
            {item.isLegacyDate ? ' (phiếu cũ)' : ''}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Trạng thái</p>
          <Badge variant="outline">{status}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Người lập</p>
          <p className="text-sm">
            {item.createdByName} · {formatInventoryDate(item.createdAt)}
          </p>
        </div>
        {item.submittedAt ? (
          <p className="text-xs">Gửi duyệt: {formatInventoryDate(item.submittedAt)}</p>
        ) : null}
        {item.approvedAt ? (
          <p className="text-xs">Ghi sổ: {formatInventoryDate(item.approvedAt)}</p>
        ) : null}
        {item.decisionReason ? (
          <p className="text-sm sm:col-span-2">Lý do quyết định: {item.decisionReason}</p>
        ) : null}
        {item.evidence.length ? (
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            Tài liệu đính kèm:
            {item.evidence.map((file) => (
              <button
                key={file.id}
                type="button"
                className="text-primary underline"
                onClick={() => void inventoryService.downloadEvidence(file.id, file.fileName)}
              >
                {file.fileName}
              </button>
            ))}
          </div>
        ) : null}
      </section>
      <OperationalListPanel aria-label="Dòng hàng chứng từ tồn đầu kỳ">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <h2 className="text-sm font-semibold">Dòng hàng ({item.lines.length})</h2>
          {actions}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hàng hóa</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Lô</TableHead>
              <TableHead className="text-right">Số lượng nhập</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Hệ số</TableHead>
              <TableHead className="text-right">SL đơn vị chính</TableHead>
              <TableHead>Tình trạng</TableHead>
              <TableHead>Điều kiện sử dụng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-muted-foreground font-mono">{line.sku}</p>
                </TableCell>
                <TableCell>{line.slotCode}</TableCell>
                <TableCell>
                  {line.lotNumber ?? line.lotNumberSnapshot ?? '—'}
                  {line.lotNumberSnapshot ? (
                    <p className="text-muted-foreground text-xs">
                      NSX {line.manufacturedDateSnapshot ?? '—'} · HSD{' '}
                      {line.expiryDateSnapshot ?? '—'}
                      {!line.lotId ? ' · Tạo lô khi duyệt' : ''}
                    </p>
                  ) : null}
                  {line.sourceRowNumber ? (
                    <p className="text-muted-foreground text-xs">
                      Nguồn {line.sourceSheetName}:{line.sourceRowNumber}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInventoryQuantity(line.enteredQuantity)}
                </TableCell>
                <TableCell>{line.enteredUnitName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.conversionFactorSnapshot.toLocaleString('vi-VN', {
                    maximumFractionDigits: 6,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInventoryQuantity(line.baseQuantity)}
                </TableCell>
                <TableCell>{formatQualityStatus(line.qualityStatus)}</TableCell>
                <TableCell>{formatEligibilityStatus(line.eligibilityStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </OperationalListPanel>
    </>
  )
}
