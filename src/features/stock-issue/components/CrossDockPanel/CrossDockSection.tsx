'use client'

import { useCrossDock } from '../../hooks/use-cross-dock'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { CrossDockPanel } from './CrossDockPanel'

interface Props {
  readonly order: StockIssueRequestSummary
}
// This subdomain owns its queries independently of the order's existing manual workflow.
export function CrossDockSection({ order }: Props) {
  const state = useCrossDock(order)
  return <CrossDockPanel state={state} />
}
