import type { ReactNode } from 'react'
import { HomeFooter } from '@/features/landing/components/HomePage/HomeFooter'
import { HomeHeader } from '@/features/landing/components/HomePage/HomeHeader'

export default function PublicLegalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="theme-home bg-background text-foreground flex min-h-dvh flex-col">
      <HomeHeader />
      {children}
      <HomeFooter showCallToAction={false} />
    </div>
  )
}
