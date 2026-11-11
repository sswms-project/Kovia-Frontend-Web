'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'

const subscribeToYear = () => () => undefined
const getClientYear = () => new Date().getFullYear()
const getServerYear = () => null

export function HomeFooter({ showCallToAction = true }: { readonly showCallToAction?: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  const currentYear = useSyncExternalStore(subscribeToYear, getClientYear, getServerYear)

  return (
    <footer id="contact" className="border-border/60 scroll-mt-14 border-t">
      <div className="mx-auto w-full max-w-(--container-landing) px-4 md:px-6">
        {showCallToAction && (
          <motion.div
            className="border-border/60 flex flex-col items-center gap-6 border-b py-16 text-center lg:py-20"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h2 className="max-w-xl text-2xl font-bold tracking-tight md:text-3xl">
              Sẵn sàng đưa kho của bạn lên một chuẩn vận hành mới?
            </h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed md:text-base">
              Khởi tạo workspace trong vài phút. Không cần thẻ tín dụng.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href={APP_ROUTES.auth.register}>
                  Tạo tài khoản miễn phí
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href={APP_ROUTES.auth.login}>Tôi đã có tài khoản</Link>
              </Button>
            </div>
          </motion.div>
        )}

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-3 py-6 text-xs sm:flex-row">
          <span className="flex items-center gap-2">
            <Logo href={null} size="sm" /> — Smart SaaS Warehouse Management System
          </span>
          <span>© {currentYear ?? ''} KOVIA. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
