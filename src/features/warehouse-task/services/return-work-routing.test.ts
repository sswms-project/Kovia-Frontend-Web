import { expect, it } from 'vitest'
import { getNotificationReferenceRoute } from '@/features/platform-services/utils/platform-services-format'
import { APP_ROUTES } from '@/routes/app-routes'

it.each([
  ['CustomerReturnWork', 'ViewCustomerReturnTask', APP_ROUTES.customerReturnTask],
  ['SupplierReturnWork', 'ViewSupplierReturnTask', APP_ROUTES.supplierReturnTask],
] as const)('opens the exact %s task from its notification', (referenceType, action, route) => {
  const id = '15a631ed-1456-426a-95dd-e23827533282'
  expect(
    getNotificationReferenceRoute({ type: 'TaskAssigned', referenceType, referenceId: id, action })
  ).toBe(route(id))
})
