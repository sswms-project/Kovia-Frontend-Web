'use client'

import { useEffect, useId, useRef } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ChevronRight, Tags } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { CATALOG_GROUPS, isNavItemActive, isNavSectionActive, type NavSection } from '../nav-config'

export interface CatalogNavigationControl {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

interface CatalogNavigationProps {
  readonly section: NavSection
  readonly pathname: string
  readonly control: CatalogNavigationControl
  readonly onNavigate: () => void
}

interface CatalogGroupsProps {
  readonly groups: readonly CatalogGroup[]
  readonly pathname: string
  readonly onNavigate: () => void
  readonly appearance: 'popover' | 'sidebar'
}

interface CatalogGroup {
  readonly id: string
  readonly label: string
  readonly icon: (typeof CATALOG_GROUPS)[number]['icon']
  readonly items: NavSection['items']
}

const CATALOG_CLOSE_DELAY_MS = 400

function CatalogGroups({ groups, pathname, onNavigate, appearance }: CatalogGroupsProps) {
  const headingId = useId()

  return (
    <nav
      aria-label="Danh mục dữ liệu"
      className={cn(
        'grid gap-x-6 gap-y-4 p-4',
        appearance === 'popover'
          ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]'
          : 'grid-cols-1'
      )}
    >
      {groups.map((group) => {
        const Icon = group.icon
        const labelId = `${headingId}-${group.id}`

        return (
          <section key={group.id} aria-labelledby={labelId} className="flex min-w-0 flex-col gap-2">
            <h2 id={labelId} className="flex items-center gap-2 px-3 text-sm font-semibold">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {group.label}
            </h2>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                if (!item.href || item.status === 'planned') return null
                const isActive = isNavItemActive(pathname, item)

                return (
                  <li key={item.href}>
                    <Link
                      // Centralized navigation also contains dynamic route prefixes.
                      href={item.href as Route}
                      aria-current={isActive ? 'page' : undefined}
                      onNavigate={onNavigate}
                      className={cn(
                        'focus-visible:ring-ring flex min-h-10 touch-manipulation items-center rounded-md px-3 py-2 text-sm break-words outline-hidden focus-visible:ring-2 focus-visible:ring-inset',
                        appearance === 'popover'
                          ? 'hover:bg-accent hover:text-accent-foreground'
                          : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground min-h-11',
                        isActive &&
                          (appearance === 'popover'
                            ? 'bg-accent text-accent-foreground font-semibold'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold')
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </nav>
  )
}

export function CatalogNavigation({
  section,
  pathname,
  control,
  onNavigate,
}: CatalogNavigationProps) {
  const { isMobile } = useSidebar()
  const navigatingRef = useRef(false)
  const openedPathRef = useRef(pathname)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const hoveredRef = useRef(false)
  const autoFocusRef = useRef(false)
  const restoreFocusRef = useRef(false)
  const suppressFocusOpenRef = useRef(false)
  const groups = CATALOG_GROUPS.map((group) => ({
    ...group,
    items: section.items.filter((item) => item.catalogGroup === group.id),
  })).filter((group) => group.items.length > 0)

  useEffect(() => {
    // An unmounted panel may never emit pointerleave when it closes.
    if (!control.open || isMobile) hoveredRef.current = false

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [control.open, isMobile, pathname])

  if (groups.length === 0) return null

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const handleOpenChange = (open: boolean) => {
    cancelClose()
    if (open) {
      restoreFocusRef.current = false
      navigatingRef.current = false
      openedPathRef.current = pathname
    }
    control.onOpenChange(open)
  }

  const scheduleClose = () => {
    cancelClose()
    if (isMobile || !control.open || hoveredRef.current) return
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      const activeElement = document.activeElement
      if (
        !hoveredRef.current &&
        !triggerRef.current?.contains(activeElement) &&
        !panelRef.current?.contains(activeElement)
      ) {
        control.onOpenChange(false)
      }
    }, CATALOG_CLOSE_DELAY_MS)
  }

  const handleNavigate = () => {
    navigatingRef.current = true
    cancelClose()
    control.onOpenChange(false)
    onNavigate()
  }

  const trigger = (
    <SidebarMenuButton
      ref={triggerRef}
      type="button"
      aria-label="Danh mục"
      isActive={isNavSectionActive(pathname, section)}
      tooltip="Danh mục"
      onPointerEnter={(event) => {
        if (isMobile || event.pointerType === 'touch') return
        hoveredRef.current = true
        if (!control.open) autoFocusRef.current = false
        handleOpenChange(true)
      }}
      onPointerLeave={(event) => {
        if (isMobile || event.pointerType === 'touch') return
        hoveredRef.current = false
        scheduleClose()
      }}
      onPointerDown={(event) => {
        // Opening by mouse must not pin the menu through incidental focus.
        if (!isMobile && event.pointerType === 'mouse' && event.button === 0) event.preventDefault()
      }}
      onFocus={() => {
        if (isMobile || suppressFocusOpenRef.current) return
        autoFocusRef.current = true
        handleOpenChange(true)
      }}
      onBlur={scheduleClose}
      onClick={(event) => {
        if (isMobile) return
        // Hover/focus already opened it; a following click should not toggle it shut.
        event.preventDefault()
        if (!control.open) autoFocusRef.current = event.detail === 0
        handleOpenChange(true)
      }}
      className="text-sidebar-foreground/90 h-11 touch-manipulation gap-3 rounded-md px-3 text-sm font-semibold"
    >
      <Tags aria-hidden="true" />
      <span className="group-data-[collapsible=icon]:hidden">Danh mục</span>
      <ChevronRight
        aria-hidden="true"
        className={cn(
          'ml-auto transition-transform group-data-[collapsible=icon]:hidden motion-reduce:transition-none',
          control.open && 'rotate-90'
        )}
      />
    </SidebarMenuButton>
  )

  return (
    <SidebarGroup className="px-2 py-1">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            {isMobile ? (
              <Collapsible open={control.open} onOpenChange={handleOpenChange}>
                <CollapsibleTrigger asChild>{trigger}</CollapsibleTrigger>
                <CollapsibleContent className="text-sidebar-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 animation-duration-200 motion-reduce:animate-none">
                  <CatalogGroups
                    groups={groups}
                    pathname={pathname}
                    onNavigate={handleNavigate}
                    appearance="sidebar"
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Popover open={control.open} onOpenChange={handleOpenChange} modal={false}>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent
                  ref={panelRef}
                  aria-label="Danh mục"
                  side="right"
                  align="start"
                  sideOffset={4}
                  collisionPadding={12}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'touch') return
                    hoveredRef.current = true
                    cancelClose()
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'touch') return
                    hoveredRef.current = false
                    scheduleClose()
                  }}
                  onFocusCapture={cancelClose}
                  onBlurCapture={scheduleClose}
                  onFocusOutside={(event) => {
                    event.preventDefault()
                    scheduleClose()
                  }}
                  onOpenAutoFocus={(event) => {
                    if (!autoFocusRef.current) event.preventDefault()
                  }}
                  onEscapeKeyDown={() => {
                    restoreFocusRef.current = Boolean(
                      triggerRef.current?.contains(document.activeElement) ||
                      panelRef.current?.contains(document.activeElement)
                    )
                  }}
                  onCloseAutoFocus={(event) => {
                    // Passive hover dismissal must never move focus from the working page.
                    event.preventDefault()
                    if (
                      restoreFocusRef.current &&
                      !navigatingRef.current &&
                      openedPathRef.current === pathname
                    ) {
                      suppressFocusOpenRef.current = true
                      triggerRef.current?.focus({ preventScroll: true })
                      suppressFocusOpenRef.current = false
                    }
                    restoreFocusRef.current = false
                  }}
                  className={cn(
                    'border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 animation-duration-200 max-w-(--radix-popover-content-available-width) overflow-hidden rounded-xl border p-0 ring-0 motion-reduce:animate-none',
                    groups.length === 1 ? 'w-64' : groups.length === 2 ? 'w-[30rem]' : 'w-[45rem]'
                  )}
                >
                  <ScrollArea className="min-h-0 [&>[data-slot=scroll-area-viewport]]:max-h-(--radix-popover-content-available-height)">
                    <CatalogGroups
                      groups={groups}
                      pathname={pathname}
                      onNavigate={handleNavigate}
                      appearance="popover"
                    />
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
