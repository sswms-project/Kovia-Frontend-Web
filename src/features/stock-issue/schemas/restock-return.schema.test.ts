import { describe, expect, it } from 'vitest'
import { restockReturnSchema } from './restock-return.schema'

// SQL Server sequential GUIDs often carry a non-RFC variant nibble (here 'e'), which z.uuid() rejects.
const SQL_SERVER_SLOT_ID = 'db75ce14-0cd9-48ca-e47a-08df331a3ff0'
const RETURN_ITEM_ID = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('restockReturnSchema', () => {
  it('accepts backend GUIDs with a non-RFC variant', () => {
    const result = restockReturnSchema.safeParse({
      items: [
        {
          returnItemId: RETURN_ITEM_ID,
          condition: 'Good',
          restockSlotId: SQL_SERVER_SLOT_ID,
          scannedSlotCode: 'A-01-06',
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a malformed slot id with a Vietnamese message', () => {
    const result = restockReturnSchema.safeParse({
      items: [
        {
          returnItemId: RETURN_ITEM_ID,
          condition: 'Good',
          restockSlotId: 'not-a-guid',
          scannedSlotCode: 'A-01-06',
        },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Vị trí nhập kho không hợp lệ.')
  })
})
