'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { WarehouseScene } from '@/components/WarehouseScene'
import { APP_ROUTES } from '@/routes/app-routes'

const trustPoints = [
  {
    label: 'Bảo mật đa tầng',
    desc: 'Xác minh email và quản trị truy cập theo từng doanh nghiệp',
  },
  {
    label: 'Triển khai nhanh',
    desc: 'Khởi tạo workspace và owner trong một lần đăng ký',
  },
  {
    label: 'Vận hành tập trung',
    desc: 'Kiểm soát tồn kho, vận chuyển và nhân sự trong một giao diện',
  },
]

interface BenefitsPanelProps {
  readonly logoHref?: string
}

export function BenefitsPanel({ logoHref = APP_ROUTES.auth.login }: BenefitsPanelProps) {
  return (
    <div className="bg-inverse-surface relative flex h-full flex-col overflow-hidden">
      {/* Brand 3D warehouse visual as backdrop */}
      <div
        className="absolute inset-x-0 bottom-0 scale-90 [mask-image:linear-gradient(to_top,black_55%,transparent)] opacity-60"
        aria-hidden="true"
      >
        <WarehouseScene />
      </div>
      {/* Subtle radial ambient light — top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_oklab,var(--primary-fixed-dim)_10%,transparent),transparent)]" />
      {/* Bottom fade */}
      <div className="from-inverse-surface absolute right-0 bottom-0 left-0 h-1/2 bg-gradient-to-t to-transparent" />

      <div className="relative flex h-full flex-col p-8 xl:p-12">
        {/* Logo */}
        <Logo href={logoHref} tone="inverse" />

        {/* Hero text */}
        <div className="flex flex-1 flex-col justify-center">
          <span className="text-inverse-on-surface/75 mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Operational Intelligence
          </span>
          <h2 className="text-inverse-on-surface text-3xl leading-[1.2] font-semibold tracking-tight xl:text-[2.6rem]">
            Quản trị kho bãi
            <br />
            <span className="text-inverse-on-surface/85">thế hệ mới</span>
          </h2>
          <p className="text-inverse-on-surface/80 mt-5 max-w-xs text-sm leading-relaxed">
            Nền tảng vận hành tập trung giúp kiểm soát tồn kho, vận chuyển và nhân sự trong một giao
            diện thống nhất.
          </p>
        </div>

        {/* Trust points */}
        <footer className="mt-auto">
          <div className="bg-inverse-on-surface/20 mb-7 h-px" />
          <ul className="space-y-5">
            {trustPoints.map((point, i) => (
              <motion.li
                key={point.label}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.12, ease: 'easeOut' }}
              >
                <div className="bg-inverse-on-surface/75 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                <div>
                  <p className="text-inverse-on-surface text-sm font-medium">{point.label}</p>
                  <p className="text-inverse-on-surface/80 mt-0.5 text-xs leading-relaxed">
                    {point.desc}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  )
}
