'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Info, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type UseFormReturn,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { StorageLengthUnit, WarehousePhysicalDetails } from '../../types/warehouse.types'
import {
  rackSchema,
  slotSchema,
  zoneSchema,
  type RackFormValues,
  type SlotFormValues,
  type ZoneFormValues,
} from '../../schemas/warehouse.schema'
import { StorageCapacityFields, type StorageCapacityFieldsProps } from './StorageCapacityFields'

interface LocationFormSheetProps<TValues> {
  readonly open: boolean
  readonly mode: 'create' | 'update'
  readonly isPending: boolean
  readonly defaultValues: TValues
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TValues, preserveLegacyCapacity?: boolean) => Promise<boolean>
  readonly conflict?: { readonly reload: () => Promise<boolean> }
}

const LOCATION_FORM_SHEET_CLASS =
  'w-full max-w-full overflow-hidden overscroll-contain data-[side=right]:w-full data-[side=right]:sm:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-4/5 data-[side=right]:lg:w-2/3 data-[side=right]:xl:w-1/2'

const LOCATION_FORM_HEADER_CLASS = 'shrink-0 border-b px-5 py-4 pr-12'
const LOCATION_FORM_BODY_CLASS =
  'grid min-h-0 flex-1 content-start grid-cols-1 gap-4 overflow-y-auto overscroll-contain px-5 py-5 md:grid-cols-2'

export function ZoneFormSheet({
  open,
  mode,
  isPending,
  defaultValues,
  stagingDefaults,
  onOpenChange,
  onSubmit,
}: LocationFormSheetProps<ZoneFormValues> & {
  readonly stagingDefaults?: { receiving?: boolean; outbound?: boolean }
}) {
  const form = useForm<ZoneFormValues>({ resolver: zodResolver(zoneSchema), defaultValues })
  const { errors } = form.formState
  const createReceivingPoint = useWatch({ control: form.control, name: 'createReceivingPoint' })
  const setAsDefaultStagingPoint = useWatch({
    control: form.control,
    name: 'setAsDefaultStagingPoint',
  })
  const createOutboundStagingPoint = useWatch({
    control: form.control,
    name: 'createOutboundStagingPoint',
  })

  const [isClosing, setIsClosing] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (isPending || form.formState.isSubmitting)) return
    if (!nextOpen) setIsClosing(true)
    else onOpenChange(nextOpen)
  }

  async function handleSubmit(values: ZoneFormValues) {
    if (await onSubmit(values)) form.reset(defaultValues)
  }

  return (
    <Sheet open={open && !isClosing} onOpenChange={handleOpenChange}>
      <SheetContent
        className={LOCATION_FORM_SHEET_CLASS}
        onCloseAutoFocus={() => {
          if (isClosing) {
            form.reset(defaultValues)
            onOpenChange(false)
          }
        }}
      >
        <SheetHeader className={LOCATION_FORM_HEADER_CLASS}>
          <SheetTitle className="text-base font-semibold">
            {mode === 'create' ? 'Thêm khu vực' : 'Chỉnh sửa khu vực'}
          </SheetTitle>
          <SheetDescription>
            Mã khu vực phải duy nhất trong kho và được dùng để nhận diện trong sơ đồ.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FieldGroup className={LOCATION_FORM_BODY_CLASS}>
              <Field data-invalid={Boolean(errors.zoneCode)}>
                <FieldLabel htmlFor="zone-code">Mã khu vực</FieldLabel>
                <Input
                  id="zone-code"
                  translate="no"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.zoneCode)}
                  {...form.register('zoneCode')}
                />
                <FieldError errors={[errors.zoneCode]} />
              </Field>
              <Field data-invalid={Boolean(errors.zoneName)}>
                <FieldLabel htmlFor="zone-name">Tên khu vực</FieldLabel>
                <Input
                  id="zone-name"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.zoneName)}
                  {...form.register('zoneName')}
                />
                <FieldError errors={[errors.zoneName]} />
              </Field>
              <Field data-invalid={Boolean(errors.description)} className="md:col-span-2">
                <FieldLabel htmlFor="zone-description">Mô tả</FieldLabel>
                <Textarea
                  id="zone-description"
                  autoComplete="off"
                  rows={4}
                  aria-invalid={Boolean(errors.description)}
                  {...form.register('description')}
                />
                <FieldError errors={[errors.description]} />
              </Field>
              <PhysicalDetailsFields />
              <Field
                className="md:col-span-2"
                data-invalid={Boolean(errors.createOutboundStagingPoint)}
              >
                <FieldLabel id="zone-staging-label">
                  {mode === 'create' ? 'Tạo sẵn điểm tập kết' : 'Bổ sung điểm tập kết'}
                </FieldLabel>
                <RadioGroup
                  aria-labelledby="zone-staging-label"
                  aria-describedby="zone-staging-description"
                  value={
                    createReceivingPoint
                      ? 'receiving'
                      : createOutboundStagingPoint
                        ? 'outbound'
                        : 'none'
                  }
                  disabled={isPending || form.formState.isSubmitting}
                  onValueChange={(value) => {
                    form.setValue('setAsDefaultStagingPoint', null, { shouldDirty: true })
                    form.setValue('createReceivingPoint', value === 'receiving', {
                      shouldDirty: true,
                    })
                    form.setValue('createOutboundStagingPoint', value === 'outbound', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                >
                  <Field orientation="horizontal">
                    <RadioGroupItem id="zone-staging-none" value="none" />
                    <FieldLabel htmlFor="zone-staging-none">
                      {mode === 'create' ? 'Không tạo' : 'Không bổ sung'}
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem id="zone-staging-receiving" value="receiving" />
                    <FieldLabel htmlFor="zone-staging-receiving">
                      Điểm nhận hàng / chờ cất
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem id="zone-staging-outbound" value="outbound" />
                    <FieldLabel htmlFor="zone-staging-outbound">Điểm chờ xuất</FieldLabel>
                  </Field>
                </RadioGroup>
                {(createReceivingPoint || createOutboundStagingPoint) && (
                  <Field orientation="horizontal">
                    <Checkbox
                      id="zone-default-staging"
                      checked={
                        setAsDefaultStagingPoint ??
                        (createReceivingPoint
                          ? stagingDefaults?.receiving
                          : stagingDefaults?.outbound) ??
                        false
                      }
                      disabled={isPending || form.formState.isSubmitting}
                      onCheckedChange={(checked) =>
                        form.setValue('setAsDefaultStagingPoint', checked === true, {
                          shouldDirty: true,
                        })
                      }
                    />
                    <FieldLabel htmlFor="zone-default-staging">
                      Đặt làm điểm mặc định của kho
                    </FieldLabel>
                  </Field>
                )}
                <p id="zone-staging-description" className="text-muted-foreground text-sm">
                  Tự tạo điểm tập kết và vị trí bên dưới, không cần tạo kệ/ô thủ công. Điểm đã có sẽ
                  được giữ nguyên, không tạo trùng hoặc đổi chức năng. Không bổ sung không xóa điểm
                  hiện có.
                </p>
                <FieldError errors={[errors.createOutboundStagingPoint]} />
              </Field>
            </FieldGroup>
            <FormFooter
              mode={mode}
              isPending={isPending || form.formState.isSubmitting}
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  )
}

export function RackFormSheet({
  open,
  mode,
  isPending,
  defaultValues,
  onOpenChange,
  onSubmit,
  conflict,
  locationPath,
  ...capacityProps
}: LocationFormSheetProps<RackFormValues> &
  StorageCapacityFieldsProps & {
    readonly locationPath?: string
  }) {
  const form = useForm<RackFormValues>({ resolver: zodResolver(rackSchema), defaultValues })
  const { errors, dirtyFields } = form.formState
  const [hasPolicyChoice, setHasPolicyChoice] = useState(false)
  const rebaseKey = `${defaultValues.expectedRowVersion}:${defaultValues.capacityType}:${defaultValues.capacityUnitId}:${defaultValues.capacity}:${capacityProps.location?.currentOccupancy}`
  const versionRef = useRef(rebaseKey)
  useEffect(() => {
    if (versionRef.current === rebaseKey) return
    versionRef.current = rebaseKey
    form.reset(defaultValues, { keepDirtyValues: true })
    if ((capacityProps.location?.currentOccupancy ?? 0) > 0) {
      form.setValue('storageMode', defaultValues.storageMode)
      form.setValue('capacityType', defaultValues.capacityType)
      form.setValue('capacityUnitId', defaultValues.capacityUnitId)
    }
  }, [defaultValues, form, capacityProps.location?.currentOccupancy, rebaseKey])
  const storageMode = useWatch({ control: form.control, name: 'storageMode' })
  const allowsMixedProducts = useWatch({ control: form.control, name: 'allowsMixedProducts' })
  const [confirmSlotMode, setConfirmSlotMode] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const storageModeRef = useRef<HTMLDivElement>(null)

  function applySlotMode() {
    form.setValue('allowsMixedProducts', true, { shouldDirty: true })
    form.setValue('capacity', null, { shouldDirty: true })
    form.setValue('capacityType', 'None', { shouldDirty: true })
    form.setValue('capacityUnitId', null, { shouldDirty: true })
    form.setValue('storageMode', 'SlotLevel', { shouldDirty: true, shouldValidate: true })
    form.clearErrors(['capacity', 'capacityUnitId'])
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (isPending || form.formState.isSubmitting)) return
    if (!nextOpen) setIsClosing(true)
    else onOpenChange(nextOpen)
  }

  async function handleSubmit(values: RackFormValues) {
    if (conflict) return
    if (!validateCapacitySubmission(form, values, capacityProps)) return
    const preserveLegacy = Boolean(
      capacityProps.location?.requiresCapacityConfiguration &&
      !hasPolicyChoice &&
      !dirtyFields.storageMode
    )
    if (await (preserveLegacy ? onSubmit(values, true) : onSubmit(values)))
      form.reset(defaultValues)
  }

  return (
    <Sheet open={open && !isClosing} onOpenChange={handleOpenChange}>
      <SheetContent
        className={LOCATION_FORM_SHEET_CLASS}
        onCloseAutoFocus={() => {
          if (isClosing) {
            form.reset(defaultValues)
            onOpenChange(false)
          }
        }}
      >
        <SheetHeader className={LOCATION_FORM_HEADER_CLASS}>
          <SheetTitle className="text-base font-semibold">
            {mode === 'create' ? 'Thêm kệ hàng' : 'Chỉnh sửa kệ hàng'}
          </SheetTitle>
          <SheetDescription>Mã kệ phải duy nhất trong khu vực đang chọn.</SheetDescription>
          {locationPath ? (
            <p className="text-sm break-words" aria-label="Vị trí của kệ">
              {locationPath}
            </p>
          ) : null}
        </SheetHeader>
        <FormProvider {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FieldGroup className={LOCATION_FORM_BODY_CLASS}>
              {conflict ? <LocationConflictAlert reload={conflict.reload} /> : null}
              <Field data-invalid={Boolean(errors.rackCode)}>
                <FieldLabel htmlFor="rack-code">Mã kệ</FieldLabel>
                <Input
                  id="rack-code"
                  translate="no"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.rackCode)}
                  {...form.register('rackCode')}
                />
                <FieldError errors={[errors.rackCode]} />
              </Field>
              <Field data-invalid={Boolean(errors.rackName)}>
                <FieldLabel htmlFor="rack-name">Tên kệ</FieldLabel>
                <Input
                  id="rack-name"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.rackName)}
                  {...form.register('rackName')}
                />
                <FieldError errors={[errors.rackName]} />
              </Field>
              <Field data-invalid={Boolean(errors.description)} className="md:col-span-2">
                <FieldLabel htmlFor="rack-description">Mô tả</FieldLabel>
                <Textarea
                  id="rack-description"
                  rows={3}
                  aria-invalid={Boolean(errors.description)}
                  {...form.register('description')}
                />
                <FieldError errors={[errors.description]} />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>Phương thức quản lý vị trí</FieldLabel>
                <RadioGroup
                  ref={storageModeRef}
                  aria-label="Phương thức quản lý vị trí"
                  value={storageMode}
                  disabled={(capacityProps.location?.currentOccupancy ?? 0) > 0}
                  onValueChange={(value) => {
                    if (value !== 'RackLevel' && value !== 'SlotLevel') return
                    if (value === 'SlotLevel') {
                      const values = form.getValues()
                      if (
                        values.capacityType === 'Quantity' &&
                        (values.capacity != null || values.capacityUnitId)
                      ) {
                        setConfirmSlotMode(true)
                        return
                      }
                      applySlotMode()
                      return
                    }
                    form.setValue('storageMode', value, { shouldDirty: true, shouldValidate: true })
                  }}
                  className="gap-2"
                >
                  <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="RackLevel" />
                    <span>
                      <span className="block text-sm font-medium">Quản lý theo kệ</span>
                      <span className="text-muted-foreground mt-1 block text-xs font-normal">
                        Hàng được ghi nhận trực tiếp tại kệ, không cần tạo vị trí nhỏ hơn.
                      </span>
                    </span>
                  </Label>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="SlotLevel" />
                    <span>
                      <span className="block text-sm font-medium">Quản lý theo vị trí lưu trữ</span>
                      <span className="text-muted-foreground mt-1 block text-xs font-normal">
                        Người dùng tạo các vị trí lưu trữ riêng bên trong kệ.
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
              </Field>
              {storageMode === 'RackLevel' ? (
                <>
                  <Field orientation="horizontal" className="md:col-span-2">
                    <Checkbox
                      id="rack-allows-mixed-products"
                      checked={allowsMixedProducts}
                      onCheckedChange={(checked) => {
                        form.setValue('allowsMixedProducts', checked === true, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                    />
                    <FieldLabel htmlFor="rack-allows-mixed-products">
                      Cho phép nhiều sản phẩm trong cùng kệ
                    </FieldLabel>
                  </Field>
                  <div className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed md:col-span-2">
                    <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                      Bật để chứa nhiều mã sản phẩm trong cùng kệ; tắt để chỉ chứa một mã.
                      <br />
                      VD: Bật → nước ngọt và bánh có thể chung kệ, nhưng vẫn phải đủ sức chứa.
                    </p>
                  </div>
                </>
              ) : null}
              <AlertDialog open={confirmSlotMode} onOpenChange={setConfirmSlotMode}>
                <AlertDialogContent
                  onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    storageModeRef.current
                      ?.querySelector<HTMLButtonElement>('[data-state="checked"]')
                      ?.focus()
                  }}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>Chuyển sang quản lý theo vị trí lưu trữ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sức chứa tối đa và đơn vị sức chứa của kệ sẽ được bỏ khỏi form. Bạn cần cấu
                      hình sức chứa riêng cho từng vị trí. Thay đổi chỉ áp dụng khi lưu.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Giữ cấu hình kệ</AlertDialogCancel>
                    <AlertDialogAction onClick={applySlotMode}>
                      Chuyển phương thức quản lý
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <PhysicalDetailsFields>
                {storageMode === 'RackLevel' ? (
                  <StorageCapacityFields
                    {...capacityProps}
                    onPolicyChange={() => setHasPolicyChoice(true)}
                  />
                ) : null}
              </PhysicalDetailsFields>
            </FieldGroup>
            <FormFooter
              mode={mode}
              isPending={isPending || form.formState.isSubmitting}
              isSaveBlocked={Boolean(conflict)}
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  )
}

export function SlotFormSheet({
  open,
  mode,
  isPending,
  defaultValues,
  onOpenChange,
  onSubmit,
  conflict,
  ...capacityProps
}: LocationFormSheetProps<SlotFormValues> & StorageCapacityFieldsProps) {
  const form = useForm<SlotFormValues>({ resolver: zodResolver(slotSchema), defaultValues })
  const { errors, dirtyFields } = form.formState
  const [hasPolicyChoice, setHasPolicyChoice] = useState(false)
  const rebaseKey = `${defaultValues.expectedRowVersion}:${defaultValues.capacityType}:${defaultValues.capacityUnitId}:${defaultValues.capacity}:${capacityProps.location?.currentOccupancy}`
  const versionRef = useRef(rebaseKey)
  useEffect(() => {
    if (versionRef.current === rebaseKey) return
    versionRef.current = rebaseKey
    form.reset(defaultValues, { keepDirtyValues: true })
    if (
      capacityProps.location?.capacityType === 'Quantity' &&
      (capacityProps.location.currentOccupancy ?? 0) > 0
    ) {
      form.setValue('capacityType', defaultValues.capacityType)
      form.setValue('capacityUnitId', defaultValues.capacityUnitId)
    }
  }, [defaultValues, form, capacityProps.location, rebaseKey])
  const allowsMixedProducts = useWatch({ control: form.control, name: 'allowsMixedProducts' })

  const [isClosing, setIsClosing] = useState(false)
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (isPending || form.formState.isSubmitting)) return
    if (!nextOpen) setIsClosing(true)
    else onOpenChange(nextOpen)
  }

  async function handleSubmit(values: SlotFormValues) {
    if (conflict) return
    if (!validateCapacitySubmission(form, values, capacityProps)) return
    const preserveLegacy = Boolean(
      capacityProps.location?.requiresCapacityConfiguration &&
      !hasPolicyChoice &&
      !dirtyFields.capacityType &&
      !dirtyFields.capacityUnitId
    )
    if (await (preserveLegacy ? onSubmit(values, true) : onSubmit(values)))
      form.reset(defaultValues)
  }

  return (
    <Sheet open={open && !isClosing} onOpenChange={handleOpenChange}>
      <SheetContent
        className={LOCATION_FORM_SHEET_CLASS}
        onCloseAutoFocus={() => {
          if (isClosing) {
            form.reset(defaultValues)
            onOpenChange(false)
          }
        }}
      >
        <SheetHeader className={LOCATION_FORM_HEADER_CLASS}>
          <SheetTitle className="text-base font-semibold">
            {mode === 'create' ? 'Thêm vị trí lưu trữ' : 'Chỉnh sửa vị trí'}
          </SheetTitle>
          <SheetDescription>
            Sức chứa tối đa không thể thấp hơn sức chứa đã dùng theo đơn vị đã chọn.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FieldGroup className={LOCATION_FORM_BODY_CLASS}>
              {conflict ? <LocationConflictAlert reload={conflict.reload} /> : null}
              <Field data-invalid={Boolean(errors.slotCode)}>
                <FieldLabel htmlFor="slot-code">Mã vị trí</FieldLabel>
                <Input
                  id="slot-code"
                  translate="no"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.slotCode)}
                  {...form.register('slotCode')}
                />
                <FieldError errors={[errors.slotCode]} />
              </Field>
              <Field data-invalid={Boolean(errors.slotName)}>
                <FieldLabel htmlFor="slot-name">Tên vị trí</FieldLabel>
                <Input
                  id="slot-name"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.slotName)}
                  {...form.register('slotName')}
                />
                <FieldError errors={[errors.slotName]} />
              </Field>
              <Field data-invalid={Boolean(errors.description)} className="md:col-span-2">
                <FieldLabel htmlFor="slot-description">Mô tả</FieldLabel>
                <Textarea
                  id="slot-description"
                  rows={3}
                  aria-invalid={Boolean(errors.description)}
                  {...form.register('description')}
                />
                <FieldError errors={[errors.description]} />
              </Field>
              <Field orientation="horizontal" className="md:col-span-2">
                <Checkbox
                  id="slot-allows-mixed-products"
                  checked={allowsMixedProducts}
                  onCheckedChange={(checked) => {
                    form.setValue('allowsMixedProducts', checked === true, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                />
                <FieldLabel htmlFor="slot-allows-mixed-products">
                  Cho phép nhiều sản phẩm trong cùng vị trí
                </FieldLabel>
              </Field>
              <div className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed md:col-span-2">
                <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Bật để chứa nhiều mã sản phẩm trong cùng vị trí; tắt để chỉ chứa một mã.
                  <br />
                  VD: Bật → nước ngọt và bánh có thể chung vị trí, nhưng vẫn phải đủ sức chứa.
                </p>
              </div>
              <PhysicalDetailsFields>
                {!capacityProps.location?.isOutboundStaging ? (
                  <StorageCapacityFields
                    {...capacityProps}
                    onPolicyChange={() => setHasPolicyChoice(true)}
                  />
                ) : null}
              </PhysicalDetailsFields>
            </FieldGroup>
            <FormFooter
              mode={mode}
              isPending={isPending || form.formState.isSubmitting}
              isSaveBlocked={Boolean(conflict)}
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  )
}

function LocationConflictAlert({ reload }: { readonly reload: () => Promise<boolean> }) {
  const [isReloading, setIsReloading] = useState(false)
  return (
    <Alert className="md:col-span-2">
      <AlertTitle>Dữ liệu vị trí đã thay đổi</AlertTitle>
      <AlertDescription>
        Tải dữ liệu mới trước khi lưu lại. Bản nháp được giữ; loại, đơn vị sức chứa và phương thức
        quản lý sẽ theo dữ liệu mới nếu vị trí đã có hàng.
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isReloading}
          onClick={async () => {
            setIsReloading(true)
            try {
              await reload()
            } finally {
              setIsReloading(false)
            }
          }}
        >
          {isReloading ? 'Đang tải…' : 'Tải dữ liệu mới'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function validateCapacitySubmission(
  form: UseFormReturn<SlotFormValues> | UseFormReturn<RackFormValues>,
  values: SlotFormValues | RackFormValues,
  props: StorageCapacityFieldsProps
) {
  if (values.capacityType !== 'Quantity') return true
  if (
    props.unitsLoading ||
    props.unitsError ||
    !props.units.some((unit) => unit.id === values.capacityUnitId && unit.status === 'Active')
  ) {
    form.setError(
      'capacityUnitId',
      { message: 'Vui lòng chọn đơn vị sức chứa đang hoạt động.' },
      { shouldFocus: true }
    )
    return false
  }
  if (
    props.location?.capacityType === 'Quantity' &&
    values.capacityUnitId === props.location.capacityUnitId &&
    values.capacity !== null &&
    props.location.capacityUsed != null &&
    values.capacity < props.location.capacityUsed
  ) {
    form.setError(
      'capacity',
      { message: 'Sức chứa tối đa không được thấp hơn sức chứa đã dùng.' },
      { shouldFocus: true }
    )
    return false
  }
  return true
}

const LENGTH_UNITS: ReadonlyArray<{ value: StorageLengthUnit; label: string }> = [
  { value: 'Kilometer', label: 'km' },
  { value: 'Meter', label: 'm' },
  { value: 'Decimeter', label: 'dm' },
  { value: 'Centimeter', label: 'cm' },
]

interface PhysicalDetailsFieldsProps {
  readonly children?: React.ReactNode
}

function PhysicalDetailsFields({ children }: PhysicalDetailsFieldsProps) {
  const form = useFormContext<WarehousePhysicalDetails>()
  const values = useWatch({ control: form.control })
  const errors = form.formState.errors

  return (
    <section
      className="flex min-w-0 flex-col gap-2 pt-2 md:col-span-2"
      aria-labelledby="physical-details-heading"
    >
      <h3 id="physical-details-heading" className="text-base font-semibold">
        Thông tin chi tiết
      </h3>
      {children}
      <p className="text-muted-foreground text-xs font-medium">Kích thước vật lý</p>
      <div className="overflow-x-auto rounded-md border">
        <div className="bg-muted/70 grid min-w-[38rem] grid-cols-[minmax(9rem,1.4fr)_5rem_minmax(8rem,1fr)_minmax(7rem,0.8fr)] border-b px-3 py-2 text-sm font-medium">
          <span>Thông tin</span>
          <span>Điều kiện</span>
          <span>Giá trị</span>
          <span>Đơn vị tính</span>
        </div>
        <PhysicalDetailRow
          label="Chiều dài"
          value={values.physicalLength ?? null}
          unit={values.physicalLengthUnit ?? null}
          units={LENGTH_UNITS}
          valueError={errors.physicalLength?.message}
          unitError={errors.physicalLengthUnit?.message}
          onValueChange={(value) => {
            form.setValue('physicalLength', value, { shouldDirty: true, shouldValidate: true })
            form.setValue(
              'physicalLengthUnit',
              value === null ? null : (values.physicalLengthUnit ?? 'Meter'),
              {
                shouldDirty: true,
                shouldValidate: true,
              }
            )
          }}
          onUnitChange={(unit) =>
            form.setValue('physicalLengthUnit', unit, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <PhysicalDetailRow
          label="Chiều rộng"
          value={values.physicalWidth ?? null}
          unit={values.physicalWidthUnit ?? null}
          units={LENGTH_UNITS}
          valueError={errors.physicalWidth?.message}
          unitError={errors.physicalWidthUnit?.message}
          onValueChange={(value) => {
            form.setValue('physicalWidth', value, { shouldDirty: true, shouldValidate: true })
            form.setValue(
              'physicalWidthUnit',
              value === null ? null : (values.physicalWidthUnit ?? 'Meter'),
              {
                shouldDirty: true,
                shouldValidate: true,
              }
            )
          }}
          onUnitChange={(unit) =>
            form.setValue('physicalWidthUnit', unit, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <PhysicalDetailRow
          label="Chiều cao"
          value={values.physicalHeight ?? null}
          unit={values.physicalHeightUnit ?? null}
          units={LENGTH_UNITS}
          valueError={errors.physicalHeight?.message}
          unitError={errors.physicalHeightUnit?.message}
          onValueChange={(value) => {
            form.setValue('physicalHeight', value, { shouldDirty: true, shouldValidate: true })
            form.setValue(
              'physicalHeightUnit',
              value === null ? null : (values.physicalHeightUnit ?? 'Meter'),
              {
                shouldDirty: true,
                shouldValidate: true,
              }
            )
          }}
          onUnitChange={(unit) =>
            form.setValue('physicalHeightUnit', unit, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>
    </section>
  )
}

function PhysicalDetailRow<TUnit extends string>({
  label,
  value,
  unit,
  units,
  valueError,
  unitError,
  onValueChange,
  onUnitChange,
}: {
  readonly label: string
  readonly value: number | null
  readonly unit: TUnit | null
  readonly units: ReadonlyArray<{ value: TUnit; label: string }>
  readonly valueError?: string
  readonly unitError?: string
  readonly onValueChange: (value: number | null) => void
  readonly onUnitChange: (unit: TUnit) => void
}) {
  const id = `physical-${label.toLocaleLowerCase('vi').replaceAll(' ', '-')}`
  return (
    <div className="grid min-w-[38rem] grid-cols-[minmax(9rem,1.4fr)_5rem_minmax(8rem,1fr)_minmax(7rem,0.8fr)] items-start gap-x-3 border-b px-3 py-2 last:border-b-0">
      <Label htmlFor={id} className="pt-2 font-normal">
        {label}
      </Label>
      <span className="pt-2 text-sm">=</span>
      <div>
        <Input
          id={id}
          type="number"
          min="0.001"
          step="0.001"
          inputMode="decimal"
          value={value ?? ''}
          aria-invalid={Boolean(valueError)}
          onChange={(event) =>
            onValueChange(
              event.currentTarget.value === '' ? null : Number(event.currentTarget.value)
            )
          }
        />
        {valueError ? <p className="text-destructive mt-1 text-xs">{valueError}</p> : null}
      </div>
      <div>
        <Select
          value={unit ?? undefined}
          onValueChange={(value) => {
            const selectedUnit = units.find((option) => option.value === value)
            if (selectedUnit) onUnitChange(selectedUnit.value)
          }}
        >
          <SelectTrigger className="w-full" aria-invalid={Boolean(unitError)}>
            <SelectValue placeholder="Chọn đơn vị" />
          </SelectTrigger>
          <SelectContent>
            {units.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unitError ? <p className="text-destructive mt-1 text-xs">{unitError}</p> : null}
      </div>
    </div>
  )
}

function FormFooter({
  mode,
  isPending,
  isSaveBlocked = false,
  onCancel,
}: {
  readonly mode: 'create' | 'update'
  readonly isPending: boolean
  readonly isSaveBlocked?: boolean
  readonly onCancel: () => void
}) {
  return (
    <SheetFooter className="bg-popover shrink-0 border-t px-5 py-4 sm:flex-row sm:justify-end">
      <Button type="submit" disabled={isPending || isSaveBlocked}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        ) : (
          <Save data-icon="inline-start" aria-hidden="true" />
        )}
        {mode === 'create' ? 'Lưu' : 'Lưu thay đổi'}
      </Button>
      <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
        Hủy
      </Button>
    </SheetFooter>
  )
}
