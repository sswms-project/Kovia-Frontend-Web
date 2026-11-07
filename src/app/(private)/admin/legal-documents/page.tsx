import { Suspense } from 'react'
import { OperationalLoadingState } from '@/components/operations/OperationalState'
import AdminLegalDocumentsPage from '@/features/legal-documents/pages/AdminLegalDocumentsPage'

export default function AdminLegalDocumentsRoute() {
  return (
    <Suspense fallback={<OperationalLoadingState />}>
      <AdminLegalDocumentsPage />
    </Suspense>
  )
}
