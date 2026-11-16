'use client'

import { useMemo } from 'react'
import type { AiCard } from '../../../types/ai-assistant.types'
import {
  formatAiOutcomeTimestamp,
  layoutAiOutcomeReport,
  readAiOutcomeReport,
} from '../../../utils/ai-outcome-report'
import { splitOutcomeFindings } from '../../../utils/ai-outcome-view'
import { EvidenceDetails } from './EvidenceDetails'
import { MetricStrip } from './MetricStrip'
import { NextActions } from './NextActions'
import { OutcomeFindingList } from './OutcomeFindingList'
import { OutcomeOkGroup } from './OutcomeOkGroup'
import { OutcomeSummary } from './OutcomeSummary'
import { RelatedDocuments } from './RelatedDocuments'

interface OutcomeReportCardProps {
  readonly card: AiCard
  /** Closes the panel after an in-app link is followed. */
  readonly onNavigate: () => void
  /** Latest message only: sends a chat message (kind reply and draft). Without it those actions are not drawn. */
  readonly onSend?: (message: string) => void
  /** Latest message only: asks the previous question again (kind retry). Without it that action is not drawn. */
  readonly onRetry?: () => void
}

/**
 * Response Design System V3: the outcome first, then the findings that need action (each with its documents
 * and actions), next steps, what needs nothing and supporting data, and the basis on demand. Draws what the BE verified and decides nothing itself. Expand and
 * collapse state lives in the leaf Collapsibles, so opening a section re-renders nothing else.
 */
export function OutcomeReportCard({ card, onNavigate, onSend, onRetry }: OutcomeReportCardProps) {
  const report = useMemo(() => readAiOutcomeReport(card), [card])
  if (!report) return null

  const handlers = { onNavigate, onSend, onRetry }
  const layout = layoutAiOutcomeReport(report, {
    canSend: Boolean(onSend),
    canRetry: Boolean(onRetry),
  })
  const { attention, ok } = splitOutcomeFindings(layout.findings)

  return (
    <section aria-label={report.outcome.headline} className="@container min-w-0 rounded-lg border">
      <OutcomeSummary
        outcome={report.outcome}
        partialData={report.partialData}
        timestamp={formatAiOutcomeTimestamp(report.dataTimestamp)}
      />
      <MetricStrip metrics={report.metrics} />
      {attention.length > 0 ? (
        <OutcomeFindingList views={attention} handlers={handlers} className="border-t" />
      ) : null}
      <NextActions actions={layout.actions} handlers={handlers} />
      <OutcomeOkGroup views={ok} handlers={handlers} />
      {layout.relatedGroups.length > 0 ? (
        <div className="space-y-1 border-t px-3 py-1.5">
          {layout.relatedGroups.map((group) => (
            <RelatedDocuments key={group.key} group={group} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
      <EvidenceDetails evidence={report.evidence} />
    </section>
  )
}
