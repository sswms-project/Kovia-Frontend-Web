import { describe, expect, it } from 'vitest'
import { parseTransferStage, transferStatusOptions } from './transfer-stage'

describe('parseTransferStage', () => {
  it('falls back to the request tab for a missing or unknown value', () => {
    expect(parseTransferStage(null)).toBe('request')
    expect(parseTransferStage('nonsense')).toBe('request')
    expect(parseTransferStage('transfer')).toBe('transfer')
    expect(parseTransferStage('discrepancy')).toBe('discrepancy')
  })
})

describe('transferStatusOptions', () => {
  it('only offers draft and cancelled on the request tab', () => {
    const values = (stage: 'request' | 'transfer') =>
      transferStatusOptions(stage).map((option) => option.value)
    expect(values('request')).toEqual(expect.arrayContaining(['Draft', 'Cancelled']))
    expect(values('transfer')).not.toContain('Draft')
    expect(values('transfer')).not.toContain('Cancelled')
  })

  it('has no status filter on the discrepancy tab', () => {
    expect(transferStatusOptions('discrepancy')).toEqual([])
  })
})
