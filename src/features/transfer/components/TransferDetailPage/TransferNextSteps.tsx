import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferNextStep, TransferNextStepAction } from '../../utils/transfer-next-steps'

interface TransferNextStepsProps {
  readonly transferId: string
  readonly steps: readonly TransferNextStep[]
  readonly onAction: (action: TransferNextStepAction) => void
}

function linkOf(transferId: string, action: TransferNextStepAction) {
  if (action.type === 'openPick') return APP_ROUTES.transferPickTask(transferId, action.shipmentId)
  if (action.type === 'openReceive')
    return APP_ROUTES.transferReceiveTask(transferId, action.shipmentId)
  if (action.type === 'openPutAway')
    return APP_ROUTES.transferPutAwayTask(transferId, action.shipmentId)
  return null
}

/** Dải "Việc tiếp theo" ở đầu phiếu: nói rõ ai cần làm gì và cho bấm thẳng. */
export function TransferNextSteps({ transferId, steps, onAction }: TransferNextStepsProps) {
  if (steps.length === 0) return null
  return (
    <section
      aria-labelledby="transfer-next-steps"
      className="bg-card border-primary/40 relative m-3 min-w-0 shrink-0 rounded-lg border border-l-4"
    >
      <h2 id="transfer-next-steps" className="px-3 pt-2 text-sm font-semibold">
        Việc tiếp theo
      </h2>
      <ul className="divide-y">
        {steps.map((step) => {
          const href = linkOf(transferId, step.action)
          return (
            <li
              key={step.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0 flex-1 basis-48 break-words">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-muted-foreground text-xs">{step.description}</p>
              </div>
              {href ? (
                <Button asChild size="sm" className="min-h-11 max-sm:w-full">
                  <Link href={href}>
                    {step.actionLabel}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 max-sm:w-full"
                  onClick={() => onAction(step.action)}
                >
                  {step.actionLabel}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
