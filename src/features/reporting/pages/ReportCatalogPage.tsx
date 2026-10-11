'use client'

import { useState } from 'react'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { ReportCatalogView } from '../components/ReportCatalog'
import { useWarehouseReportCatalog } from '../hooks/use-warehouse-report'
import { useReportFavorites } from '../hooks/use-report-favorites'

export default function ReportCatalogPage() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const favorites = useReportFavorites()
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const canView = permissions.includes(P.REPORTS_VIEW)
  const catalog = useWarehouseReportCatalog(canView, [...permissions].sort().join('|'))
  return (
    <ReportCatalogView
      canForecast={permissions.includes(P.INVENTORY_VIEW)}
      reports={canView ? (catalog.data ?? []) : []}
      search={search}
      group={group}
      onGroupChange={setGroup}
      favorites={favorites.favorites}
      onToggleFavorite={favorites.toggle}
      onSearchChange={setSearch}
      isPending={me.isPending || (canView && catalog.isPending)}
      errorMessage={
        me.isError
          ? getApiErrorMessage(me.error)
          : !me.isPending && !canView
            ? 'Bạn không có quyền xem báo cáo kho.'
            : catalog.isError
              ? getApiErrorMessage(catalog.error)
              : undefined
      }
    />
  )
}
