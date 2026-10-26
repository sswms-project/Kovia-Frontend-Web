'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { USER_ROLES } from '@/config/roles'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth.store'
import { getVisibleNavSections } from '../nav-config'
import { SidebarNavigation, type SidebarAppearance } from './SidebarNavigation'

export function AppSidebar() {
  const user = useAuthStore((state) => state.user)
  const meQuery = useMeQuery()
  const pathname = usePathname()
  const { isMobile, setOpenMobile, open, setOpen } = useSidebar()
  const [, setStoredOpen] = useLocalStorage('sidebar_state', true)
  const reportEntryRef = useRef<string | null>(null)
  const isReportDetail = /^\/reports\/(?!forecast(?:\/|$))[^/]+$/.test(pathname)
  const hoverOpenRef = useRef(false)
  const pointerInsideRef = useRef(false)
  const [catalogOpenScope, setCatalogOpenScope] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const skipInitialPersistRef = useRef(true)
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const hasPermissionData = meQuery.data !== undefined
  const sections =
    user?.role && hasPermissionData ? getVisibleNavSections(user.role, permissions) : []
  const appearance: SidebarAppearance = user?.role === USER_ROLES.TenantOwner ? 'tenant' : 'default'
  const catalogScope = JSON.stringify([
    user?.id,
    user?.tenantId,
    user?.role,
    pathname,
    isMobile,
    sections.find((section) => section.presentation === 'catalog')?.items.map((item) => item.href),
  ])
  const isCatalogOpen = catalogOpenScope === catalogScope

  // A previous route/session must not reopen its overlay when revisited.
  if (catalogOpenScope !== null && catalogOpenScope !== catalogScope) {
    setCatalogOpenScope(null)
  }

  useEffect(() => {
    if (initializedRef.current) return
    const storedOpen = localStorage.getItem('sidebar_state')
    if (storedOpen !== null) setOpen(storedOpen === 'true')
    initializedRef.current = true
  }, [setOpen])

  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false
      return
    }
    if (!hoverOpenRef.current) setStoredOpen(open)
  }, [open, setStoredOpen])

  useEffect(() => {
    if (!isReportDetail) {
      reportEntryRef.current = null
      return
    }
    if (reportEntryRef.current === pathname) return
    reportEntryRef.current = pathname
    hoverOpenRef.current = false
    setOpen(false)
    setOpenMobile(false)
  }, [isReportDetail, pathname, setOpen, setOpenMobile])

  useEffect(() => {
    if (!meQuery.isError) return

    logger.error(meQuery.error)
    toast.error('Không thể tải quyền điều hướng. Vui lòng thử lại.')
  }, [meQuery.error, meQuery.isError])

  const handleMouseEnter = () => {
    pointerInsideRef.current = true
    if (!open && !isMobile && !isReportDetail) {
      hoverOpenRef.current = true
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    pointerInsideRef.current = false
    if (hoverOpenRef.current && !isCatalogOpen) {
      hoverOpenRef.current = false
      setOpen(false)
    }
  }

  const handleCatalogOpenChange = (nextOpen: boolean) => {
    setCatalogOpenScope(nextOpen ? catalogScope : null)
    if (!nextOpen && hoverOpenRef.current && !pointerInsideRef.current) {
      hoverOpenRef.current = false
      setOpen(false)
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border min-w-0 overflow-hidden border-r-0"
    >
      <SidebarContent
        className="min-w-0 overscroll-contain py-3"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SidebarNavigation
          pathname={pathname}
          sections={sections}
          isPending={meQuery.isPending}
          isError={meQuery.isError}
          hasPermissionData={hasPermissionData}
          onRetry={() => void meQuery.refetch()}
          onNavigate={() => {
            handleCatalogOpenChange(false)
            if (isMobile) setOpenMobile(false)
          }}
          appearance={appearance}
          catalogMenu={{ open: isCatalogOpen, onOpenChange: handleCatalogOpenChange }}
        />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border shrink-0 border-t p-2">
        <SidebarTrigger
          className="w-full"
          onClick={() => {
            hoverOpenRef.current = false
            handleCatalogOpenChange(false)
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
