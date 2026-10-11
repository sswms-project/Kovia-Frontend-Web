import { describe, expect, it } from 'vitest'
import { transferGoodsRows } from './transfer-goods-rows'
import { buildTransfer, buildTransferItem } from './transfer-test-fixtures'

describe('transferGoodsRows', () => {
  it('returns no rows without a transfer', () => {
    expect(transferGoodsRows(null)).toEqual([])
    expect(transferGoodsRows(undefined)).toEqual([])
  })

  it('shows quantities in the base unit and a conversion note for other units', () => {
    const rows = transferGoodsRows(
      buildTransfer({
        items: [
          buildTransferItem({
            id: 'i1',
            unitId: 'unit-carton',
            unitName: 'Thùng',
            baseUnitId: 'unit-box',
            baseUnitName: 'Hộp',
            conversionFactor: 12,
            quantity: 24,
            dispatchedQuantity: 12,
          }),
          buildTransferItem({ id: 'i2' }),
        ],
      })
    )
    expect(rows[0]).toMatchObject({
      unit: 'Hộp',
      requested: 24,
      dispatched: 12,
      conversion: '1 Thùng = 12 Hộp',
    })
    expect(rows[1]?.conversion).toBeNull()
  })

  it('hides removed lines and tracks the discrepancy state per line', () => {
    const detail = buildTransfer({
      items: [
        buildTransferItem({ id: 'removed', quantity: 0 }),
        buildTransferItem({ id: 'open' }),
        buildTransferItem({ id: 'done' }),
        buildTransferItem({ id: 'clean' }),
      ],
      discrepancies: [
        {
          id: 'd1',
          itemId: 'open',
          shipmentId: 's',
          sku: '',
          productName: '',
          type: 'Missing',
          quantity: 1,
          resolvedQuantity: 0,
          reasonCode: null,
          note: null,
          isOpen: true,
          resolution: null,
          createdAt: '',
          resolvedAt: null,
        },
        {
          id: 'd2',
          itemId: 'done',
          shipmentId: 's',
          sku: '',
          productName: '',
          type: 'Damaged',
          quantity: 1,
          resolvedQuantity: 1,
          reasonCode: null,
          note: null,
          isOpen: false,
          resolution: 'DamageCase',
          createdAt: '',
          resolvedAt: '',
        },
      ],
    })
    const rows = transferGoodsRows(detail)
    expect(rows.map((row) => row.id)).toEqual(['open', 'done', 'clean'])
    expect(rows.map((row) => row.discrepancy)).toEqual(['open', 'resolved', 'none'])
  })
})
