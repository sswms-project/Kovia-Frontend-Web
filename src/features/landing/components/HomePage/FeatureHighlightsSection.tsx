'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  LayoutGrid,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FeatureTile = {
  icon: LucideIcon
  title: string
  description: string
  points: readonly string[]
  iconClassName: string
  className?: string
  preview?: ReactNode
}

/* Decorative bin map: a few occupied/alert cells hint at the layout designer */
const binStates = [
  'full',
  'full',
  'half',
  'empty',
  'full',
  'half',
  'half',
  'full',
  'full',
  'full',
  'alert',
  'empty',
  'full',
  'empty',
  'half',
  'full',
  'full',
  'half',
] as const

const binClassNames: Record<(typeof binStates)[number], string> = {
  full: 'bg-primary',
  half: 'bg-primary-container',
  empty: 'bg-surface-container-high',
  alert: 'bg-destructive/80',
}

function BinMapPreview() {
  return (
    <div
      aria-hidden="true"
      className="border-border bg-surface-container-low mt-auto rounded-lg border p-3"
    >
      <div className="text-muted-foreground mb-2 flex items-center justify-between font-mono text-[10px]">
        <span>KHO A · DÃY 04</span>
        <span>18 BIN</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {binStates.map((state, index) => (
          <span key={index} className={cn('h-6 rounded-sm lg:h-8', binClassNames[state])} />
        ))}
      </div>
      <div className="text-muted-foreground mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="bg-primary size-2 rounded-full" /> Đầy
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary-container size-2 rounded-full" /> Còn chỗ
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-destructive/80 size-2 rounded-full" /> Cần kiểm tra
        </span>
      </div>
    </div>
  )
}

const auditEntries = [
  { actor: 'Quản lý kho', action: 'Duyệt phiếu xuất', code: 'PXK-1187', time: '09:42' },
  { actor: 'Nhân viên kho', action: 'Hoàn tất cất hàng', code: 'PNK-0518', time: '09:15' },
  { actor: 'Chủ doanh nghiệp', action: 'Cập nhật vai trò', code: 'Thủ kho', time: '08:30' },
] as const

function AuditLogPreview() {
  return (
    <ul
      aria-hidden="true"
      className="border-border bg-surface-container-low divide-border/70 mt-auto divide-y rounded-lg border"
    >
      {auditEntries.map((entry) => (
        <li key={entry.code} className="flex items-center gap-3 px-3 py-2 text-xs">
          <span className="text-muted-foreground font-mono text-[10px]">{entry.time}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold">{entry.actor}</span> · {entry.action}
          </span>
          <span className="bg-card text-primary rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold">
            {entry.code}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ForecastPreview() {
  return (
    <div
      aria-hidden="true"
      className="border-tertiary-container/60 bg-tertiary-fixed/40 mt-auto flex flex-col gap-2 rounded-lg border p-3"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono">SKU-TP-0192</span>
        <Badge className="bg-tertiary-container text-on-tertiary-container border-transparent">
          Sắp thiếu
        </Badge>
      </div>
      <div className="flex h-12 items-end gap-1">
        {[38, 52, 44, 61, 58, 72, 80].map((height, index) => (
          <span
            key={index}
            className={cn(
              'flex-1 rounded-t-sm',
              index > 4 ? 'bg-tertiary/50 border-tertiary border border-dashed' : 'bg-tertiary'
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-[11px]">
        Đề xuất nhập thêm 1.200 đơn vị trước 18/11
      </p>
    </div>
  )
}

const featureTiles: FeatureTile[] = [
  {
    icon: LayoutGrid,
    title: 'Sơ đồ kho trực quan',
    description:
      'Vẽ mặt bằng kho, khai báo khu vực, dãy kệ và bin. In mã vạch vị trí để nhân viên quét khi cất và lấy hàng.',
    points: ['Thiết kế kéo – thả', 'Mã vạch cho từng vị trí'],
    iconClassName: 'bg-primary text-primary-foreground',
    className: 'sm:col-span-2 lg:row-span-2',
    preview: <BinMapPreview />,
  },
  {
    icon: PackageOpen,
    title: 'Nhập kho & cất hàng',
    description:
      'Yêu cầu nhập có phê duyệt, nhận hàng đối chiếu số lượng và gợi ý vị trí cất phù hợp.',
    points: ['Duyệt yêu cầu nhập', 'Quét mã khi cất'],
    iconClassName: 'bg-secondary-container text-on-secondary-container',
  },
  {
    icon: Boxes,
    title: 'Tồn kho theo vị trí',
    description:
      'Biết chính xác mỗi SKU nằm ở đâu, đang giữ chỗ cho đơn nào và đã biến động ra sao.',
    points: ['Lịch sử biến động', 'Phân loại ABC'],
    iconClassName: 'bg-secondary-container text-on-secondary-container',
  },
  {
    icon: ArrowLeftRight,
    title: 'Xuất kho & điều chuyển',
    description:
      'Phiếu xuất có in ấn, điều chuyển liên kho theo từng chuyến: lấy hàng, giao, nhận, cất.',
    points: ['In phiếu xuất', 'Theo dõi từng chuyến'],
    iconClassName: 'bg-secondary-container text-on-secondary-container',
  },
  {
    icon: ClipboardCheck,
    title: 'Kiểm kê & bất thường',
    description:
      'Lập đợt kiểm kê, ghi nhận chênh lệch, hàng hư hỏng và điều chỉnh tồn có phê duyệt.',
    points: ['Kiểm kê chu kỳ', 'Phiếu điều chỉnh'],
    iconClassName: 'bg-secondary-container text-on-secondary-container',
  },
  {
    icon: ShieldCheck,
    title: 'Phân quyền & nhật ký',
    description:
      'Vai trò tùy chỉnh theo tổ chức, mọi chứng từ đều có nhật ký thao tác để truy vết.',
    points: ['Vai trò tùy chỉnh', 'Audit log chứng từ'],
    iconClassName: 'bg-secondary-container text-on-secondary-container',
    className: 'sm:col-span-2',
    preview: <AuditLogPreview />,
  },
  {
    icon: Sparkles,
    title: 'AI dự báo nhu cầu',
    description: 'Dự báo lượng xuất từ lịch sử của chính kho bạn và cảnh báo trước khi hàng cạn.',
    points: ['Dự báo theo SKU', 'Cảnh báo thiếu hàng'],
    iconClassName: 'bg-tertiary-container text-on-tertiary-container',
    className: 'sm:col-span-2',
    preview: <ForecastPreview />,
  },
]

function FeatureCard({ tile, index }: { tile: FeatureTile; index: number }) {
  const prefersReducedMotion = useReducedMotion()
  const FeatureIcon = tile.icon

  return (
    <motion.div
      className={cn('h-full', tile.className)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.07, ease: 'easeOut' }}
    >
      <Card className="border-border/70 hover:border-primary/40 h-full gap-0 py-0 transition-colors">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className={cn('w-fit rounded-lg p-2.5', tile.iconClassName)}>
            <FeatureIcon className="size-5" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold tracking-tight">{tile.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{tile.description}</p>
          <ul className="flex flex-wrap gap-1.5">
            {tile.points.map((point) => (
              <li
                key={point}
                className="border-border bg-muted text-on-surface-variant rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
              >
                {point}
              </li>
            ))}
          </ul>
          {tile.preview}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function FeatureHighlightsSection() {
  return (
    <section id="features" className="scroll-mt-14" aria-labelledby="features-heading">
      <div className="mx-auto w-full max-w-(--container-landing) px-4 py-16 md:px-6 lg:py-24">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
              Một nền tảng, đủ mọi nghiệp vụ
            </p>
            <h2
              id="features-heading"
              className="mt-3 text-2xl font-bold tracking-tight md:text-3xl"
            >
              Được thiết kế cho đội vận hành kho làm việc cả ngày trên màn hình
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            Từ mặt bằng kho đến từng chứng từ — mọi thao tác đều được ghi nhận, phân quyền và cập
            nhật tồn ngay lập tức.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureTiles.map((tile, index) => (
            <FeatureCard key={tile.title} tile={tile} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
