'use client'

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowUpRight, CheckCircle2, PackageCheck, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WarehouseScene } from '@/components/WarehouseScene'
import { APP_ROUTES } from '@/routes/app-routes'

/* WebGL scene is landing-only and heavy — load it lazily with the CSS scene as fallback */
const WarehouseScene3D = dynamic(
  () => import('./WarehouseScene3D').then((module) => module.WarehouseScene3D),
  { ssr: false, loading: () => <WarehouseScene /> }
)

const heroProofPoints = [
  'Đa kho, đa tổ chức',
  'Quét mã vạch bằng điện thoại',
  'Không cần thẻ tín dụng',
] as const

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion() === true

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const backdropY = useTransform(scrollYProgress, [0, 1], [0, 130])
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, -70])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15])

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothPointerX = useSpring(pointerX, { stiffness: 55, damping: 14 })
  const smoothPointerY = useSpring(pointerY, { stiffness: 55, damping: 14 })

  const frontLayerX = useTransform(smoothPointerX, (value) => value * 28)
  const frontLayerY = useTransform(smoothPointerY, (value) => value * 20)

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5)
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }

  const handlePointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Parallax backdrop: moves slower than scroll to create depth */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={prefersReducedMotion ? undefined : { y: backdropY }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_72%_30%,color-mix(in_oklab,var(--primary-container)_28%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--color-outline-variant)_45%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-outline-variant)_45%,transparent)_1px,transparent_1px)] [mask-image:radial-gradient(75%_60%_at_50%_20%,black,transparent)] bg-[size:56px_56px]" />
      </motion.div>

      <div className="relative mx-auto grid w-full max-w-(--container-landing) items-center gap-12 px-4 pt-16 pb-20 md:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20 lg:pb-24">
        <motion.div
          style={prefersReducedMotion ? undefined : { opacity: headingOpacity }}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <Badge className="bg-primary-container text-on-primary-container mb-5 gap-1.5 border-transparent">
            <Sparkles className="size-3" aria-hidden="true" />
            Smart SaaS Warehouse Management
          </Badge>
          <h1
            id="hero-heading"
            className="text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl lg:text-[3.5rem]"
          >
            Kho vận thông minh,
            <br />
            vận hành trong suốt.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-lg text-base leading-relaxed md:text-lg">
            KOVIA hợp nhất tồn kho, vận chuyển và nhân sự trong một nền tảng — dữ liệu trực quan
            theo thời gian thực để mọi quyết định đều rõ ràng.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" className="h-12 rounded-full pr-2 pl-6" asChild>
              <Link href={APP_ROUTES.auth.register}>
                Bắt đầu miễn phí
                <span className="bg-primary-container text-on-primary-container ml-2 flex size-8 items-center justify-center rounded-full">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full" asChild>
              <Link href={APP_ROUTES.auth.login}>Đăng nhập hệ thống</Link>
            </Button>
          </div>
          <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {heroProofPoints.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <CheckCircle2 className="text-primary size-4" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* CSS-3D warehouse scene with mouse + scroll parallax */}
        <motion.div
          aria-hidden="true"
          className="relative hidden lg:block"
          style={prefersReducedMotion ? undefined : { y: sceneY }}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          <WarehouseScene3D />

          {/* Fluted-glass refraction strip, like light through a prism panel */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 [mask-image:repeating-linear-gradient(90deg,black_0_14px,transparent_14px_24px)] backdrop-blur-[3px]" />

          {/* Floating status cards: fastest layer = closest to viewer */}
          <motion.div
            className="absolute bottom-2 -left-4"
            style={prefersReducedMotion ? undefined : { x: frontLayerX, y: frontLayerY }}
          >
            <Card className="border-border gap-0 py-0 shadow-lg">
              <CardContent className="flex items-center gap-3 p-3.5">
                <div className="bg-secondary-container text-on-secondary-container rounded-md p-2">
                  <PackageCheck className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Đơn WH-20481 đã xuất</p>
                  <p className="text-muted-foreground text-[11px]">Kho A · Dãy 4 · Bin 12</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="absolute top-4 right-2"
            style={prefersReducedMotion ? undefined : { x: frontLayerX, y: frontLayerY }}
          >
            <Card className="border-border gap-0 py-0 shadow-lg">
              <CardContent className="flex items-center gap-3 p-3.5">
                <div className="bg-tertiary-container text-on-tertiary-container rounded-md p-2">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold">AI dự báo nhập kho</p>
                  <p className="text-muted-foreground text-[11px]">Đề xuất +1.200 SKU tuần tới</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
