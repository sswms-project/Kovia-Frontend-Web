// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { createPdfFontFamily } from './WarehousePdf'
import { mkdir, writeFile } from 'node:fs/promises'
import { StockIssuePdfDocument } from '@/features/stock-issue/components/StockIssueRequestDetailPage/StockIssuePdfDocument'
import { CycleCountPdfDocument } from '@/features/cycle-count/components/CycleCountDetailPage/CycleCountPdfDocument'
import type { StockIssueRequestSummary } from '@/features/stock-issue/types/stock-issue.types'
import type { CycleCountDetail } from '@/features/cycle-count/types/cycle-count.types'

describe('warehouse PDF rendering', () => {
  it('renders Vietnamese documents over multiple pages from authorized snapshots', async () => {
    const order = {
      status: 'Picking',
      stockIssueRequestCode: 'XK-MAU',
      createdAt: '2026-11-04T20:00:00Z',
      dispatchedAt: null,
      warehouseName: 'Kho Đà Nẵng',
      recipientName: 'Công ty thử nghiệm',
      recipientAddress: 'Đà Nẵng',
      purpose: 'Xuất hàng theo yêu cầu',
      items: Array.from({ length: 55 }, (_, i) => ({
        id: String(i),
        productName: 'Vật tư tiếng Việt — hàng hóa cần giao',
        sku: `SKU-${i}`,
        enteredUnitName: 'Hộp',
        enteredQuantity: 2,
        quantity: 20,
        conversionFactor: 10,
        pickDetails: [{ pickedQuantity: 10, issuedAt: '2026-11-04T00:00:00Z' }],
      })),
    } as unknown as StockIssueRequestSummary
    const detail = {
      status: 'Counting',
      code: 'KK-MAU',
      warehouseName: 'Kho Đà Nẵng',
      createdAt: '2026-11-04T20:00:00Z',
      recountRound: 1,
      items: Array.from({ length: 35 }, (_, i) => ({
        id: String(i),
        productName: 'Vật tư tiếng Việt',
        productSku: `SKU-${i}`,
        unitName: 'Cái',
        zoneCode: 'K01',
        rackCode: 'A04',
        isSystemDefaultSlot: true,
        slotCode: '__SYSTEM_DEFAULT__',
        systemQuantity: null,
        countedQuantity: 3,
        difference: null,
        countedDamagedQuantity: 1,
      })),
    } as unknown as CycleCountDetail
    const issue = await renderToBuffer(
      <StockIssuePdfDocument order={order} fontFamily={createPdfFontFamily()} />
    )
    const count = await renderToBuffer(
      <CycleCountPdfDocument detail={detail} fontFamily={createPdfFontFamily()} />
    )
    expect(issue.subarray(0, 4).toString()).toBe('%PDF')
    expect(count.subarray(0, 4).toString()).toBe('%PDF')
    expect(() => StockIssuePdfDocument({ order: { ...order, status: 'Dispatched' } })).toThrow(
      'Chưa đủ chi tiết'
    )
    expect(() => StockIssuePdfDocument({ order: { ...order, status: 'Cancelled' } })).toThrow()
    expect(() => CycleCountPdfDocument({ detail: { ...detail, status: 'Cancelled' } })).toThrow()
    if (process.env.KOVIA_PDF_REVIEW) {
      await mkdir('outputs/pdf-implementation', { recursive: true })
      await writeFile('outputs/pdf-implementation/issue.pdf', issue)
      await writeFile('outputs/pdf-implementation/count.pdf', count)
      await writeFile(
        'outputs/pdf-implementation/issue-complete.pdf',
        await renderToBuffer(
          <StockIssuePdfDocument
            fontFamily={createPdfFontFamily()}
            order={{
              ...order,
              status: 'Dispatched',
              dispatchedAt: order.createdAt,
              items: order.items.slice(0, 1).map((item) => ({
                ...item,
                pickDetails: item.pickDetails.map((pick) => ({ ...pick, pickedQuantity: 20 })),
              })),
            }}
          />
        )
      )
      await writeFile(
        'outputs/pdf-implementation/count-complete.pdf',
        await renderToBuffer(
          <CycleCountPdfDocument
            fontFamily={createPdfFontFamily()}
            detail={{
              ...detail,
              status: 'Completed',
              finalizedAt: detail.createdAt,
              items: detail.items
                .slice(0, 1)
                .map((item) => ({ ...item, systemQuantity: 5, difference: -2 })),
            }}
          />
        )
      )
    }
  }, 60000)
})
