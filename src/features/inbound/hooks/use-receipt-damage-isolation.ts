import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  receiptDamageIsolationSchema,
  type ReceiptDamageIsolationValues,
} from '../schemas/receipt-damage-isolation.schema'
import { getApiErrorMessage } from '@/lib/api-error'
import type { GoodsReceiptDetail } from '../types/inbound.types'
import { useIsolateReceiptDamageMutation } from './use-inbound'
import { useReceivingLocationSelection } from './use-receiving-location-selection'

export function useReceiptDamageIsolation(
  receipt: GoodsReceiptDetail | undefined,
  allowed: boolean
) {
  const [target, setTarget] = useState<GoodsReceiptDetail | null>(null)
  const [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const mutation = useIsolateReceiptDamageMutation()
  const location = useReceivingLocationSelection(
    target?.warehouseId,
    `${target?.id}:${target?.version}`,
    !!target,
    true
  )
  const form = useForm<ReceiptDamageIsolationValues>({
    resolver: zodResolver(receiptDamageIsolationSchema),
    defaultValues: {
      goodsReceiptItemId: '',
      quantity: Number.NaN,
      confirmedSlotCode: '',
      physicallySeparated: false,
    },
  })
  function open() {
    if (!receipt || !allowed || lock.current) return
    setTarget(receipt)
    setDiscard(false)
    mutation.reset()
    form.reset({
      goodsReceiptItemId: '',
      quantity: Number.NaN,
      confirmedSlotCode: '',
      physicallySeparated: false,
    })
  }
  async function confirm() {
    await form.handleSubmit(async (values) => {
      if (!target || lock.current || !allowed) return
      if (target.id !== receipt?.id || target.version !== receipt.version) {
        toast.error('Phiếu đã thay đổi. Đóng form và tải lại trước khi tiếp tục.')
        return
      }
      const item = target.items.find((item) => item.id === values.goodsReceiptItemId)
      const precision = item?.allowedUnits.find(
        (unit) => unit.unitId === item.baseUnitId
      )?.quantityPrecision
      if (
        !item ||
        precision === undefined ||
        values.quantity > (item.remainingDamageIsolationQuantity ?? 0) ||
        Number(values.quantity.toFixed(precision)) !== values.quantity
      ) {
        form.setError('quantity', {
          message: 'Số lượng vượt phần hàng hỏng còn lại hoặc không hợp lệ theo đơn vị cơ sở.',
        })
        return
      }
      if (
        !location.selected ||
        location.selected.id === target.receivingSlotId ||
        location.query.isError ||
        location.query.isFetching
      ) {
        toast.error('Chọn vị trí riêng khác vị trí nhận.')
        return
      }
      lock.current = true
      try {
        await mutation.mutateAsync({
          receiptId: target.id,
          request: {
            ...values,
            destinationSlotId: location.selected.id,
            expectedVersion: target.version,
          },
        })
        toast.success('Đã xác nhận cách biệt hàng hỏng. Tổng tồn không đổi; hàng vẫn Hold.')
        setTarget(null)
      } catch (failure) {
        toast.error(getApiErrorMessage(failure, 'Chưa thể xác nhận cách biệt.'))
      } finally {
        lock.current = false
      }
    })()
  }
  return {
    target,
    form,
    location,
    mutation,
    discard,
    setDiscard,
    open,
    confirm,
    close: () => {
      if (!lock.current) {
        if (form.formState.isDirty || location.selected) setDiscard(true)
        else setTarget(null)
      }
    },
    discardChanges: () => {
      if (!lock.current) {
        setTarget(null)
        setDiscard(false)
      }
    },
  }
}
