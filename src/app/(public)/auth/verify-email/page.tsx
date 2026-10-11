import type { Metadata } from 'next'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'

export const metadata: Metadata = {
  title: 'Xác minh email | KOVIA',
  description:
    'Xác minh email đăng ký doanh nghiệp owner cho Smart SaaS Warehouse Management System',
}

interface PageProps {
  readonly searchParams: Promise<{
    readonly token?: string | readonly string[]
  }>
}

function normalizeToken(token?: string | readonly string[]) {
  const value = Array.isArray(token) ? token[0] : token
  const normalizedValue = value?.trim()
  return normalizedValue || undefined
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const token = normalizeToken(params.token)
  return <VerifyEmailPage token={token} />
}
