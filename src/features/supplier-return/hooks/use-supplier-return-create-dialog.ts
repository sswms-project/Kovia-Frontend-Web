import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { AI_DRAFT_SEARCH_PARAM } from '@/features/ai-assistant/utils/ai-draft-links'
import { formatInventoryLocation } from '@/features/inventory/utils/inventory-format'
import { useSaveReturnDocument } from '@/hooks/use-return-document-editing'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  createSupplierReturnSchema,
  type CreateSupplierReturnFormValues,
} from '../schemas/supplier-return.schema'
import type { SupplierReturn } from '../types/supplier-return.types'
import { useSupplierReturnAiDraft } from './use-supplier-return-ai-draft'
import {
  useCreateSupplierReturnMutation,
  useSupplierReturnSourcesQuery,
  useSupplierReturnSourceStocksQuery,
} from './use-supplier-returns'

// Giới hạn trang của GET /inventory; quá số này thì phân trang trong hộp chọn.
const STOCK_PAGE_SIZE = 100

const EMPTY_CREATE_VALUES: CreateSupplierReturnFormValues = {
  warehouseId: '',
  supplierId: '',
  sourceGoodsReceiptId: '',
  reason: '',
  negotiationNote: '',
  lines: [],
}

interface UseSupplierReturnCreateDialogOptions {
  readonly returnId?: string
  /** Phiếu đang xem ở trang chi tiết; là nguồn dữ liệu khi sửa. */
  readonly detail: SupplierReturn | undefined
}

/** Hộp thoại lập/sửa phiếu trả hàng NCC: form, tra cứu phiếu nhận và tồn nguồn, điền sẵn từ Trợ lý AI. */
export function useSupplierReturnCreateDialog({
  returnId,
  detail,
}: UseSupplierReturnCreateDialogOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [editingDocument, setEditingDocument] = useState<SupplierReturn | null>(null)
  const isOpen = Boolean(editingDocument) || (!returnId && searchParams.get('create') === '1')
  const saveMutation = useSaveReturnDocument('supplierReturns')
  const createMutation = useCreateSupplierReturnMutation()
  const [stockSearch, setStockSearch] = useState('')
  const [receiptSearch, setReceiptSearch] = useState('')
  const [receiptPaging, setReceiptPaging] = useState({ key: '', page: 1 })
  const debouncedStockSearch = useDebouncedValue(stockSearch.trim(), 350)
  const debouncedReceiptSearch = useDebouncedValue(receiptSearch.trim(), 350)

  const form = useForm<CreateSupplierReturnFormValues>({
    resolver: zodResolver(createSupplierReturnSchema),
    defaultValues: EMPTY_CREATE_VALUES,
  })
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const supplierId = useWatch({ control: form.control, name: 'supplierId' })
  const sourceGoodsReceiptId = useWatch({ control: form.control, name: 'sourceGoodsReceiptId' })
  const receiptPageKey = `${warehouseId}|${supplierId}|${debouncedReceiptSearch}`
  const receiptPage = receiptPaging.key === receiptPageKey ? receiptPaging.page : 1
  const receiptsQuery = useSupplierReturnSourcesQuery(
    { warehouseId, supplierId, search: debouncedReceiptSearch, page: receiptPage },
    isOpen
  )
  // Trang tồn quay về 1 khi đổi kho hoặc từ khoá tìm (không cần effect).
  const stockPageKey = `${warehouseId}|${supplierId}|${sourceGoodsReceiptId}|${debouncedStockSearch}`
  const [stockPaging, setStockPaging] = useState({ key: stockPageKey, page: 1 })
  const stockPage = stockPaging.key === stockPageKey ? stockPaging.page : 1
  const stocksQuery = useSupplierReturnSourceStocksQuery(
    {
      warehouseId,
      supplierId,
      sourceGoodsReceiptId,
      search: debouncedStockSearch,
      page: stockPage,
    },
    isOpen
  )
  const aiDraft = useSupplierReturnAiDraft({
    draftId: returnId ? null : searchParams.get(AI_DRAFT_SEARCH_PARAM),
    form,
    stocks: stocksQuery.data?.items,
  })

  function navigate(query: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    params.delete('create')
    params.delete(AI_DRAFT_SEARCH_PARAM)
    for (const [key, value] of Object.entries(query)) params.set(key, value)
    const search = params.toString()
    // Typed routes cannot type-check a query string built at runtime; the path itself is this page's own route.
    router.replace((search ? `${pathname}?${search}` : pathname) as Route)
  }

  function openCreate() {
    form.reset(EMPTY_CREATE_VALUES)
    setStockSearch('')
    setReceiptSearch('')
    navigate({ create: '1' })
  }

  function closeCreate() {
    if (createMutation.isPending || saveMutation.isPending) return
    form.reset(EMPTY_CREATE_VALUES)
    setStockSearch('')
    if (editingDocument) setEditingDocument(null)
    else navigate({})
  }

  function openEdit() {
    if (!detail?.version || !detail.allowedActions?.includes('Update')) return
    form.reset({
      warehouseId: detail.warehouseId,
      supplierId: detail.supplierId,
      sourceGoodsReceiptId: detail.sourceGoodsReceiptId ?? '',
      reason: detail.reason,
      negotiationNote: detail.negotiationNote ?? '',
      lines: detail.items.map((item) => ({
        inventoryStockId: item.inventoryStockId,
        quantity: item.quantity,
        maxQuantity: item.availableQuantity ?? 0,
        unit: item.unit,
        quantityPrecision: item.quantityPrecision ?? 2,
        sourceGroupKey: `${item.productId}:${item.lotId ?? ''}`,
        sourceRemainingQuantity: item.sourceRemainingQuantity ?? 0,
        label: `${item.sku} · ${item.productName} · ${formatInventoryLocation(item)}`,
      })),
    })
    setEditingDocument(detail)
  }

  async function create(values: CreateSupplierReturnFormValues) {
    try {
      const content = {
        warehouseId: values.warehouseId,
        supplierId: values.supplierId,
        sourceGoodsReceiptId: values.sourceGoodsReceiptId,
        reason: values.reason,
        ...(values.negotiationNote ? { negotiationNote: values.negotiationNote } : {}),
        lines: values.lines.map((line) => ({
          inventoryStockId: line.inventoryStockId,
          quantity: line.quantity,
        })),
      }
      if (editingDocument?.version) {
        await saveMutation.mutateAsync({
          id: editingDocument.id,
          expectedVersion: editingDocument.version,
          commandId: crypto.randomUUID(),
          content,
        })
        toast.success('Đã lưu nháp. Bạn có thể kiểm tra và gửi duyệt lại.')
      } else {
        const created = await createMutation.mutateAsync(content)
        aiDraft.complete(created.data)
        toast.success('Đã lập phiếu trả hàng NCC và giữ tồn.')
      }
      closeCreate()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lập phiếu trả hàng NCC.'))
    }
  }

  const aiReceiptId = aiDraft.payload?.sourceGoodsReceiptId
  const receipts = receiptsQuery.data?.items ?? []

  return {
    isOpen,
    editingDocument,
    openCreate,
    openEdit,
    /** Có bản nháp AI trên URL (chỉ khi tạo mới): trang hiện thông báo điền sẵn. */
    aiNotice:
      searchParams.get(AI_DRAFT_SEARCH_PARAM) && !returnId && !editingDocument
        ? { isLoading: aiDraft.isLoading, error: aiDraft.error }
        : null,
    dialogProps: {
      isEditing: Boolean(editingDocument),
      open: isOpen,
      form,
      receipts: receipts.map((receipt) => ({ id: receipt.id, label: receipt.receiptCode })),
      selectedReceipt: editingDocument?.sourceGoodsReceiptId
        ? {
            id: editingDocument.sourceGoodsReceiptId,
            label: editingDocument.sourceGoodsReceiptCode ?? 'Phiếu nhận đã chọn',
          }
        : aiReceiptId
          ? {
              id: aiReceiptId,
              label:
                receipts.find((receipt) => receipt.id === aiReceiptId)?.receiptCode ??
                'Phiếu nhận đã chọn',
            }
          : undefined,
      onReceiptSearchChange: setReceiptSearch,
      receiptPage,
      receiptPageCount: Math.max(1, Math.ceil((receiptsQuery.data?.totalCount ?? 0) / 20)),
      onReceiptPageChange: (page: number) => setReceiptPaging({ key: receiptPageKey, page }),
      isReceiptsLoading: receiptsQuery.isFetching,
      receiptsError: receiptsQuery.isError
        ? getApiErrorMessage(receiptsQuery.error, 'Không thể tải phiếu nhận nguồn.')
        : null,
      stocksError: stocksQuery.isError
        ? getApiErrorMessage(stocksQuery.error, 'Không thể tải hàng từ phiếu nguồn.')
        : null,
      onRetrySources: () => {
        void receiptsQuery.refetch()
        if (sourceGoodsReceiptId) void stocksQuery.refetch()
      },
      stocks: stocksQuery.data?.items ?? [],
      isStocksLoading: stocksQuery.isFetching || stockSearch.trim() !== debouncedStockSearch,
      isPending: createMutation.isPending || saveMutation.isPending,
      onStockSearchChange: setStockSearch,
      stockPage,
      stockPageCount: Math.max(1, Math.ceil((stocksQuery.data?.totalCount ?? 0) / STOCK_PAGE_SIZE)),
      onStockPageChange: (page: number) => setStockPaging({ key: stockPageKey, page }),
      onOpenChange: (open: boolean) => {
        if (!open) closeCreate()
      },
      onSubmit: (values: CreateSupplierReturnFormValues) => void create(values),
    },
  }
}
