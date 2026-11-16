'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useAiFormFlow } from '../../../hooks/use-ai-form-flow'
import type { AiFormCardData } from '../../../schemas/ai-form-card.schema'
import type { AiFormFieldKey } from '../../../types/ai-form.types'
import { AI_FORM_FLOWS } from '../../../utils/ai-form-flows'
import { AiFormActions } from './AiFormActions'
import { AiFormContextRow } from './AiFormContextRow'
import { AiFormPartiesStep } from './AiFormPartiesStep'
import { AiFormProductsStep } from './AiFormProductsStep'
import { AiFormSummary } from './AiFormSummary'

interface AiFormCardProps {
  readonly form: AiFormCardData
  /** Sends a chat message; only offered for the newest answer, so older cards cannot restart. */
  readonly onRestart?: (message: string) => void
}

/**
 * The in-chat form for a stock issue draft. Nothing is sent without the user pressing "Xem bản nháp",
 * and even then the BE only prepares a draft: the document is created by the confirmation card.
 */
export function AiFormCard({ form, onRestart }: AiFormCardProps) {
  const idPrefix = useId()
  const { state, dispatch, limits, goNext, submit, isSubmitting } = useAiFormFlow(form)
  const { values, step, status, errors, compactKeys } = state
  const flow = AI_FORM_FLOWS[form.flowType]

  // The button that was pressed disappears with its step: keep keyboard focus on the new step.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    headingRef.current?.focus()
  }, [step])

  // A form restored already closed must not take focus; one closed while in use leaves focus on nothing.
  const [wasOpenOnMount] = useState(status === 'open')

  if (status !== 'open') {
    return (
      <AiFormSummary
        values={values}
        status={status}
        focusOnMount={wasOpenOnMount}
        onRestart={onRestart ? () => onRestart(flow.startMessage) : undefined}
      />
    )
  }

  const labelOf = (key: AiFormFieldKey) =>
    form.fields.find((field) => field.key === key)?.label ?? ''

  return (
    <section
      aria-label={`Biểu mẫu ${flow.title.toLowerCase()}`}
      data-ai-motion="card"
      className="border-tertiary/40 bg-tertiary/5 flex min-w-0 flex-col gap-3 rounded-md border p-3"
    >
      <header className="flex flex-col gap-0.5">
        <h3 ref={headingRef} tabIndex={-1} className="text-sm font-medium outline-none">
          {flow.title}
        </h3>
        <p aria-live="polite" className="text-muted-foreground text-xs">
          Bước {step}/{flow.steps.length} · {flow.steps[step - 1]?.hint}
        </p>
      </header>

      {step === 2 ? (
        <AiFormContextRow
          warehouse={values.warehouse}
          recipient={values.recipient}
          onEdit={() => dispatch({ type: 'goToStep', step: 1 })}
        />
      ) : null}

      {/* A disabled fieldset locks every control while the draft is being prepared. */}
      <fieldset
        key={step}
        disabled={isSubmitting}
        data-ai-motion="step"
        className="flex min-w-0 flex-col gap-3"
      >
        {step === 1 ? (
          <AiFormPartiesStep
            idPrefix={idPrefix}
            values={values}
            errors={errors}
            compactKeys={compactKeys}
            labelOf={labelOf}
            dispatch={dispatch}
          />
        ) : (
          <AiFormProductsStep
            idPrefix={idPrefix}
            values={values}
            errors={errors}
            limits={limits}
            labelOf={labelOf}
            dispatch={dispatch}
          />
        )}
      </fieldset>

      <AiFormActions
        step={step}
        isSubmitting={isSubmitting}
        onCancel={() => dispatch({ type: 'finish', status: 'cancelled' })}
        onBack={() => dispatch({ type: 'goToStep', step: 1 })}
        onNext={goNext}
        onSubmit={submit}
      />
    </section>
  )
}
