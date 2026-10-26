import type { Metadata } from 'next'
import { SupplierResponsePage } from '@/features/inbound-request/pages'

export const metadata: Metadata = {
  title: 'Phản hồi đơn đặt hàng | KOVIA',
  description: 'Nhà cung cấp xác nhận, từ chối hoặc đề xuất ngày giao cho đơn đặt hàng',
  // The token in the URL is a credential; keep these pages out of search results and referrers.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

interface SupplierResponseRoutePageProps {
  readonly params: Promise<{ token: string }>
}

export default async function SupplierResponseRoutePage({
  params,
}: SupplierResponseRoutePageProps) {
  const { token } = await params
  return <SupplierResponsePage token={token.trim() || undefined} />
}
