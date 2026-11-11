'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardList,
  PackageOpen,
  PackageSearch,
  ScanBarcode,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

type FlowStage = {
  icon: LucideIcon
  title: string
  description: string
}

/* The document lifecycle every Kovia warehouse runs, in operating order */
const flowStages: FlowStage[] = [
  { icon: ClipboardList, title: 'Yêu cầu nhập', description: 'Lập & duyệt theo nhà cung cấp' },
  { icon: PackageOpen, title: 'Nhận hàng', description: 'Đối chiếu số lượng thực nhận' },
  { icon: ScanBarcode, title: 'Cất hàng', description: 'Quét mã vị trí Kho › Dãy › Bin' },
  { icon: PackageSearch, title: 'Kiểm kê', description: 'Chu kỳ, chênh lệch, bất thường' },
  { icon: Truck, title: 'Xuất & điều chuyển', description: 'Lấy hàng, giao, nhận liên kho' },
  { icon: Undo2, title: 'Hoàn hàng', description: 'Khách trả & trả nhà cung cấp' },
]

export function WarehouseFlowSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      className="border-border/60 bg-surface-container-low/70 border-y"
      aria-labelledby="flow-heading"
    >
      <div className="mx-auto w-full max-w-(--container-landing) px-4 py-10 md:px-6">
        <h2
          id="flow-heading"
          className="text-muted-foreground mb-6 text-center text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Trọn vòng đời hàng hóa trong kho — trên cùng một hệ thống
        </h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0">
          {flowStages.map((stage, index) => {
            const StageIcon = stage.icon
            const isLast = index === flowStages.length - 1
            return (
              <motion.li
                key={stage.title}
                className="relative flex flex-col items-center gap-2 px-2 text-center"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
              >
                <span className="border-border bg-card text-primary relative flex size-11 items-center justify-center rounded-full border">
                  <StageIcon className="size-5" aria-hidden="true" />
                  <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full font-mono text-[10px] font-semibold">
                    {index + 1}
                  </span>
                </span>
                <span className="text-sm font-semibold tracking-tight">{stage.title}</span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {stage.description}
                </span>
                {!isLast && (
                  <ArrowRight
                    className="text-outline absolute top-3 -right-2 hidden size-4 lg:block"
                    aria-hidden="true"
                  />
                )}
              </motion.li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
