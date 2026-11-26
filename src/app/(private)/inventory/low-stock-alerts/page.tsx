import { Suspense } from 'react'
import LowStockAlertsPage from '@/features/inventory/pages/LowStockAlertsPage'
export default function LowStockAlertsRoutePage() {
  return (
    <Suspense fallback={<p role="status">Đang tải cảnh báo tồn thấp…</p>}>
      <LowStockAlertsPage />
    </Suspense>
  )
}
