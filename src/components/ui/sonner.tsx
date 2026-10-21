'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const isMobile = useIsMobile()
  const mobileOffset = props.mobileOffset ?? {
    top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)',
    left: 'max(env(safe-area-inset-left, 0px), 16px)',
    right: 'max(env(safe-area-inset-right, 0px), 16px)',
  }

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
      position={isMobile ? 'top-center' : (props.position ?? 'bottom-right')}
      // Sonner's mobile breakpoint is narrower than the app's 768px workspace breakpoint.
      offset={isMobile ? mobileOffset : props.offset}
      mobileOffset={mobileOffset}
    />
  )
}

export { Toaster }
