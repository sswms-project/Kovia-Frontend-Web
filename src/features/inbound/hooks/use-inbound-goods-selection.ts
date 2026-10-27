'use client'

import { useGoodsPreviewSelection } from '@/hooks/use-goods-preview-selection'

export function useInboundGoodsSelection(
  tab: string,
  context: string,
  ids: readonly string[],
  ready: boolean
) {
  return useGoodsPreviewSelection(`inbound-goods-detail:${tab}:v1`, context, ids, ready)
}
