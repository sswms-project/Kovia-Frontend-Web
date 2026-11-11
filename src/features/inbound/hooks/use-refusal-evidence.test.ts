import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { REFUSAL_EVIDENCE_REQUIRED, useRefusalEvidence } from './use-refusal-evidence'

vi.mock('../services/inbound.service', () => ({ inboundService: {} }))

describe('useRefusalEvidence.payload', () => {
  it('returns an empty payload when no refusal is involved', () => {
    const { result } = renderHook(() => useRefusalEvidence('w1', 'r1'))
    expect(result.current.payload(false)).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('shows the validation inline instead of throwing when evidence is missing', () => {
    const { result } = renderHook(() => useRefusalEvidence('w1', 'r1'))
    let value: unknown
    act(() => {
      value = result.current.payload(true)
    })
    expect(value).toBeNull()
    expect(result.current.error).toBe(REFUSAL_EVIDENCE_REQUIRED)
  })

  it('clears the inline message once the user acknowledges the hand-back', () => {
    const { result } = renderHook(() => useRefusalEvidence('w1', 'r1'))
    act(() => {
      result.current.payload(true)
    })
    act(() => result.current.toggle())
    expect(result.current.error).toBeNull()
    expect(result.current.acknowledged).toBe(true)
  })
})
