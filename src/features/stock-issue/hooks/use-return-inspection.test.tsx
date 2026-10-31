import { act, renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { expect, it } from 'vitest'
import { useReturnInspection } from './use-return-inspection'
import type { RestockReturnFormValues } from '../schemas/restock-return.schema'

it('preserves inspected damage and isolation slot on background refresh and replaces only on explicit reload', () => {
  const initial = {
    id: 'source',
    version: 'old',
    items: [{ id: 'line', condition: 'Good' as const, restockSlotId: 'rack' }],
  }
  const hook = renderHook(
    ({ document }) => {
      const form = useForm<RestockReturnFormValues>({ defaultValues: { items: [] } })
      return { form, inspection: useReturnInspection(form, document, 'source') }
    },
    { initialProps: { document: initial } }
  )
  act(() => {
    hook.result.current.form.setValue('items.0.condition', 'Damaged', { shouldDirty: true })
    hook.result.current.form.setValue('items.0.restockSlotId', 'isolation', { shouldDirty: true })
  })
  const refreshed = { ...initial, version: 'new' }
  hook.rerender({ document: refreshed })
  expect(hook.result.current.form.getValues('items.0')).toMatchObject({
    condition: 'Damaged',
    restockSlotId: 'isolation',
  })
  expect(hook.result.current.inspection.version).toBe('old')
  expect(hook.result.current.inspection.isConflict).toBe(true)
  act(() => hook.result.current.inspection.reload(refreshed))
  expect(hook.result.current.inspection.version).toBe('new')
  expect(hook.result.current.form.getValues('items.0.condition')).toBe('Good')
})
