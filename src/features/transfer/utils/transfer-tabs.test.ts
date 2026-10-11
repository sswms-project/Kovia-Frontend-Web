import { describe, expect, it } from 'vitest'
import { transferTabIds } from './transfer-tabs'

describe('transferTabIds', () => {
  it('links every tab to one panel and the panel to the active tab', () => {
    const ids = transferTabIds('t', 'goods')
    expect(ids.tabId('goods')).toBe('t-tab-goods')
    expect(ids.tabId('shipments')).toBe('t-tab-shipments')
    expect(ids.panelProps).toEqual({
      id: 't-panel',
      role: 'tabpanel',
      'aria-labelledby': 't-tab-goods',
    })
    expect(ids.panelId).toBe(ids.panelProps.id)
  })
})
