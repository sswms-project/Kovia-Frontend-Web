'use client'

import { Boxes, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { AppHeaderActions } from './AppHeaderActions'

export function AppHeader() {
  const { state, toggleSidebar } = useSidebar()

  return (
    <header className="bg-sidebar border-sidebar-border sticky top-0 z-10 flex h-14 shrink-0 items-center border-b [--accent-foreground:var(--color-sidebar-accent-foreground)] [--accent:var(--color-sidebar-accent)] [--border:var(--color-sidebar-border)] [--foreground:rgb(255,255,255)] [--muted-foreground:rgba(255,255,255,0.55)] [--muted:var(--color-sidebar-accent)]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-sidebar-foreground ml-1 shrink-0 md:hidden"
        aria-label="Mở menu điều hướng"
        onClick={toggleSidebar}
      >
        <Menu aria-hidden="true" />
      </Button>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2.5 px-3 transition-[width] duration-200 ease-linear sm:px-4',
          state === 'expanded'
            ? 'md:w-(--sidebar-width) md:px-4'
            : 'md:w-(--sidebar-width-icon) md:justify-center md:px-0'
        )}
      >
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Boxes className="size-4" aria-hidden="true" />
        </span>
        <div className={cn('hidden min-w-0 sm:block', state === 'collapsed' && 'md:hidden')}>
          <p
            className="text-sidebar-foreground truncate text-sm leading-5 font-bold"
            translate="no"
          >
            KOVIA
          </p>
          <p className="text-sidebar-foreground/55 truncate text-[11px] leading-4">
            Hệ thống vận hành kho
          </p>
        </div>
      </div>
      <div className="ml-auto shrink-0 px-3 sm:px-4">
        <AppHeaderActions />
      </div>
    </header>
  )
}
