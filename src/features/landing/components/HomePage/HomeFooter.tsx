'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'

const subscribeToYear = () => () => undefined
const getClientYear = () => new Date().getFullYear()
const getServerYear = () => null

const footerColumns = [
  {
    title: 'Sản phẩm',
    links: [
      { href: '/#features', label: 'Tính năng' },
      { href: '/#roles', label: 'Theo vai trò' },
      { href: '/#insights', label: 'Dữ liệu vận hành' },
      { href: APP_ROUTES.pricing, label: 'Bảng giá' },
    ],
  },
  {
    title: 'Tài nguyên',
    links: [
      { href: '/#faq', label: 'Câu hỏi thường gặp' },
      { href: APP_ROUTES.legalDocuments, label: 'Điều khoản & chính sách' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { href: APP_ROUTES.auth.login, label: 'Đăng nhập' },
      { href: APP_ROUTES.auth.register, label: 'Tạo tài khoản' },
      { href: APP_ROUTES.auth.forgotPassword, label: 'Quên mật khẩu' },
    ],
  },
] as const

function CallToActionBand() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-6 py-12 md:px-12 lg:py-16"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Soft lime glow + grid texture keep the band on-brand without imagery */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,color-mix(in_oklab,var(--primary-container)_35%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--primary-foreground)_12%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--primary-foreground)_12%,transparent)_1px,transparent_1px)] [mask-image:radial-gradient(70%_90%_at_100%_0%,black,transparent)] bg-[size:40px_40px]"
      />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sẵn sàng đưa kho của bạn lên một chuẩn vận hành mới?
          </h2>
          <p className="text-primary-foreground/75 mt-3 text-sm leading-relaxed md:text-base">
            Khởi tạo workspace trong vài phút. Không cần thẻ tín dụng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="bg-primary-container text-on-primary-container hover:bg-primary-container/90 h-12 rounded-full pr-2 pl-6 font-semibold"
            asChild
          >
            <Link href={APP_ROUTES.auth.register}>
              Tạo tài khoản miễn phí
              <span className="bg-primary text-primary-foreground ml-2 flex size-8 items-center justify-center rounded-full">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-12 rounded-full px-5"
            asChild
          >
            <Link href={APP_ROUTES.auth.login}>Tôi đã có tài khoản</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function HomeFooter({ showCallToAction = true }: { readonly showCallToAction?: boolean }) {
  const currentYear = useSyncExternalStore(subscribeToYear, getClientYear, getServerYear)

  return (
    <footer id="contact" className="scroll-mt-14">
      <div className="mx-auto w-full max-w-(--container-landing) px-4 md:px-6">
        {showCallToAction && (
          <div className="pt-4 pb-16 lg:pb-20">
            <CallToActionBand />
          </div>
        )}

        <div className="border-border/60 grid gap-10 border-t py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Hệ thống quản lý kho thông minh dạng SaaS — tồn kho, chứng từ và nhân sự trên một nền
              tảng.
            </p>
          </div>
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href as Route}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-border/60 text-muted-foreground flex flex-col items-center justify-between gap-2 border-t py-6 text-xs sm:flex-row">
          <span>Smart SaaS Warehouse Management System</span>
          <span>© {currentYear ?? ''} KOVIA. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
