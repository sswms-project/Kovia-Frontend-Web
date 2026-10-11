'use client'

import type { ReactNode } from 'react'

interface PageTransitionProps {
  readonly children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  // App Router owns page lifecycles; a pathname key remounts its live router slot.
  return <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
}
