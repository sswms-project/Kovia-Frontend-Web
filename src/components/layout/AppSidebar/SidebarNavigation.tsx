'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { isNavItemActive, isNavSectionActive, type NavItem, type NavSection } from '../nav-config'
import { CatalogNavigation, type CatalogNavigationControl } from './CatalogNavigation'

export type SidebarAppearance = 'default' | 'tenant'

interface SidebarNavigationProps {
  readonly pathname: string
  readonly sections: readonly NavSection[]
  readonly isPending: boolean
  readonly isError: boolean
  readonly hasPermissionData: boolean
  readonly onRetry: () => void
  readonly onNavigate: () => void
  readonly appearance: SidebarAppearance
  readonly catalogMenu: CatalogNavigationControl
}

interface SidebarNavigationItemProps {
  readonly item: NavItem
  readonly isActive: boolean
  readonly isNested?: boolean
  readonly onNavigate: () => void
  readonly appearance: SidebarAppearance
}

interface SidebarNavigationSectionProps {
  readonly pathname: string
  readonly section: NavSection
  readonly onNavigate: () => void
  readonly appearance: SidebarAppearance
  readonly catalogMenu: CatalogNavigationControl
}

interface PlannedNavigationTooltipProps {
  readonly children: ReactNode
}

const NAVIGATION_SKELETON_ITEMS = [
  'dashboard',
  'organization',
  'warehouse',
  'catalog',
  'operations',
]

function PlannedNavigationTooltip({ children }: PlannedNavigationTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block w-full cursor-not-allowed">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Chức năng đang phát triển
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarNavigationLoadingState() {
  return (
    <SidebarGroup className="px-2 py-2">
      <p role="status" className="sr-only">
        Đang tải điều hướng…
      </p>
      <SidebarMenu className="gap-1.5">
        {NAVIGATION_SKELETON_ITEMS.map((item) => (
          <SidebarMenuItem key={item}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SidebarNavigationErrorState({ onRetry }: Pick<SidebarNavigationProps, 'onRetry'>) {
  return (
    <SidebarGroup className="px-2 py-2">
      <div
        role="alert"
        className="text-sidebar-foreground border-sidebar-border bg-sidebar-accent/30 flex flex-col gap-2 rounded-lg border px-3 py-3 text-xs"
      >
        <p>Không thể tải quyền điều hướng.</p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" onClick={onRetry} className="touch-manipulation">
              <RefreshCw aria-hidden="true" />
              <span>Thử lại</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </SidebarGroup>
  )
}

function SidebarNavigationItem({
  item,
  isActive,
  isNested = false,
  onNavigate,
  appearance,
}: SidebarNavigationItemProps) {
  const Icon = item.icon

  if (!item.href || item.status === 'planned') {
    const unavailableLabel = `${item.label} - Chức năng đang phát triển`
    const button = (
      <button type="button" disabled aria-label={unavailableLabel} className="opacity-45">
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
      </button>
    )

    return isNested ? (
      <SidebarMenuSubItem>
        <PlannedNavigationTooltip>
          <SidebarMenuSubButton asChild className="min-h-10 touch-manipulation text-sm md:min-h-8">
            {button}
          </SidebarMenuSubButton>
        </PlannedNavigationTooltip>
      </SidebarMenuSubItem>
    ) : (
      <SidebarMenuItem>
        <PlannedNavigationTooltip>
          <SidebarMenuButton asChild className="h-10 touch-manipulation text-sm">
            {button}
          </SidebarMenuButton>
        </PlannedNavigationTooltip>
      </SidebarMenuItem>
    )
  }

  if (isNested) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className="text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground min-h-10 touch-manipulation gap-2.5 rounded-md px-2 text-sm data-[active=true]:font-semibold md:min-h-8"
        >
          <Link
            href={item.href as Route}
            aria-current={isActive ? 'page' : undefined}
            onNavigate={onNavigate}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground h-10 min-w-0 touch-manipulation gap-3 rounded-md px-3 text-sm font-medium',
          appearance === 'tenant'
            ? 'data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground'
            : 'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground'
        )}
      >
        <Link
          href={item.href as Route}
          aria-current={isActive ? 'page' : undefined}
          onNavigate={onNavigate}
        >
          <Icon aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function CollapsibleNavigationSection({
  pathname,
  section,
  onNavigate,
  appearance,
}: SidebarNavigationSectionProps) {
  if (!section.label || !section.icon) return null

  const Icon = section.icon
  const isActive = isNavSectionActive(pathname, section)

  return (
    <Collapsible
      key={`${section.id}-${isActive ? 'active' : 'inactive'}`}
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarGroup className="px-2 py-1">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={isActive}
                  className="text-sidebar-foreground/90 hover:text-sidebar-foreground/90 data-[active=true]:text-sidebar-foreground/90 h-11 touch-manipulation gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold hover:bg-transparent data-[active=true]:bg-transparent"
                >
                  <Icon aria-hidden="true" />
                  <span className="group-data-[collapsible=icon]:hidden">{section.label}</span>
                  <ChevronDown
                    className="text-sidebar-foreground/50 ml-auto size-4 transition-transform duration-150 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 animation-duration-200 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none">
                <SidebarMenuSub className="border-sidebar-border/80 mx-3 gap-0.5 px-3 py-1.5">
                  {section.items.map((item) => (
                    <SidebarNavigationItem
                      key={item.href ?? `${section.id}-${item.label}`}
                      item={item}
                      isActive={isNavItemActive(pathname, item)}
                      isNested
                      onNavigate={onNavigate}
                      appearance={appearance}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function StandardNavigationSection({
  pathname,
  section,
  onNavigate,
  appearance,
}: SidebarNavigationSectionProps) {
  return (
    <SidebarGroup className="px-2 py-1">
      {section.label ? (
        <SidebarGroupLabel className="text-sidebar-foreground/45 h-7 px-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
          {section.label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent className="min-w-0">
        <SidebarMenu className="gap-1.5">
          {section.items.map((item) => (
            <SidebarNavigationItem
              key={item.href ?? `${section.id}-${item.label}`}
              item={item}
              isActive={isNavItemActive(pathname, item)}
              onNavigate={onNavigate}
              appearance={appearance}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SidebarNavigationSection(props: SidebarNavigationSectionProps) {
  if (props.section.presentation === 'catalog') {
    return (
      <CatalogNavigation
        section={props.section}
        pathname={props.pathname}
        control={props.catalogMenu}
        onNavigate={props.onNavigate}
      />
    )
  }
  return props.section.collapsible ? (
    <CollapsibleNavigationSection {...props} />
  ) : (
    <StandardNavigationSection {...props} />
  )
}

export function SidebarNavigation({
  pathname,
  sections,
  isPending,
  isError,
  hasPermissionData,
  onRetry,
  onNavigate,
  appearance,
  catalogMenu,
}: SidebarNavigationProps) {
  return (
    <nav aria-label="Điều hướng chính" className="flex min-w-0 shrink-0 flex-col">
      {isPending && !hasPermissionData ? <SidebarNavigationLoadingState /> : null}
      {isError && !hasPermissionData ? <SidebarNavigationErrorState onRetry={onRetry} /> : null}
      {hasPermissionData
        ? sections.map((section) => (
            <div
              key={section.id}
              className={cn('min-w-0 shrink-0', section.presentation === 'catalog' && 'pt-3')}
            >
              {section.presentation === 'catalog' ? <SidebarSeparator className="mb-2" /> : null}
              <SidebarNavigationSection
                pathname={pathname}
                section={section}
                onNavigate={onNavigate}
                appearance={appearance}
                catalogMenu={catalogMenu}
              />
              {section.separatorAfter ? <SidebarSeparator className="my-2" /> : null}
            </div>
          ))
        : null}
    </nav>
  )
}
