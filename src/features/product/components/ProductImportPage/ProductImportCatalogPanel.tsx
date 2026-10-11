import { Controller, type UseFormReturn } from 'react-hook-form'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ProductImportPreview } from '../../types/product-import.types'
import type { ProductImportCatalogValues } from '../../schemas/product-import-catalog.schema'

interface Props {
  readonly open: boolean
  readonly pending: boolean
  readonly preview: ProductImportPreview
  readonly form: UseFormReturn<ProductImportCatalogValues>
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: () => void
}
export function ProductImportCatalogPanel({
  open,
  pending,
  preview,
  form,
  onOpenChange,
  onSubmit,
}: Props) {
  const values = form.watch()
  const hasNewCatalogs = values.entries.some((entry) => entry.mode === 'create')
  const needsConfirmation = hasNewCatalogs && !values.confirmed
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value)
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        aria-busy={pending}
      >
        <SheetHeader>
          <SheetTitle>Danh mục cần xử lý</SheetTitle>
          <SheetDescription>
            Chọn danh mục có sẵn hoặc chuẩn bị tạo mới. Chưa lưu dữ liệu ở bước này.
          </SheetDescription>
        </SheetHeader>
        <form
          id="product-import-catalogs"
          className="flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain px-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (pending || needsConfirmation) return
            onSubmit()
          }}
        >
          <FieldGroup className="gap-4">
            {[true, false].map((categories) =>
              values.entries.some((entry) => entry.categories === categories) ? (
                <section key={String(categories)} className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    {categories ? 'Nhóm VTHH' : 'Đơn vị tính'}
                  </h3>
                  {values.entries.map((entry, index) =>
                    entry.categories === categories ? (
                      <fieldset
                        key={`${entry.categories}:${entry.value}`}
                        className={cn(
                          'flex min-w-0 flex-col gap-3 border p-3',
                          values.entries.length > 50 &&
                            '[contain-intrinsic-size:auto_350px] [content-visibility:auto]'
                        )}
                        disabled={pending}
                      >
                        <legend className="max-w-full px-1 font-semibold wrap-anywhere">
                          {entry.value}
                        </legend>
                        <p className="text-muted-foreground text-xs">
                          Liên quan{' '}
                          {preview.missingReferences?.find(
                            (item) => item.categories === categories && item.value === entry.value
                          )?.productRows.length ?? 0}{' '}
                          dòng hàng hóa
                        </p>
                        <Field data-invalid={Boolean(form.formState.errors.entries?.[index]?.mode)}>
                          <FieldLabel htmlFor={`catalog-mode-${index}`}>Cách xử lý</FieldLabel>
                          <NativeSelect
                            id={`catalog-mode-${index}`}
                            aria-invalid={Boolean(form.formState.errors.entries?.[index]?.mode)}
                            aria-describedby={`catalog-mode-error-${index}`}
                            {...form.register(`entries.${index}.mode`)}
                          >
                            <NativeSelectOption value="skip">
                              Chưa xử lý — giữ lỗi cho dòng liên quan
                            </NativeSelectOption>
                            <NativeSelectOption value="existing">
                              Dùng danh mục có sẵn
                            </NativeSelectOption>
                            {entry.canCreate ? (
                              <NativeSelectOption value="create">
                                Tạo mới khi nhập hàng hóa
                              </NativeSelectOption>
                            ) : null}
                          </NativeSelect>
                          <FieldError id={`catalog-mode-error-${index}`}>
                            {form.formState.errors.entries?.[index]?.mode?.message}
                          </FieldError>
                        </Field>
                        {entry.mode === 'existing' ? (
                          <Field
                            data-invalid={Boolean(
                              form.formState.errors.entries?.[index]?.existingId
                            )}
                          >
                            <FieldLabel htmlFor={`catalog-existing-${index}`}>
                              Danh mục đang hoạt động
                            </FieldLabel>
                            <NativeSelect
                              id={`catalog-existing-${index}`}
                              aria-describedby={`catalog-existing-error-${index}`}
                              {...form.register(`entries.${index}.existingId`)}
                              aria-invalid={Boolean(
                                form.formState.errors.entries?.[index]?.existingId
                              )}
                            >
                              <NativeSelectOption value="">Chọn danh mục</NativeSelectOption>
                              {(categories
                                ? preview.availableCategories
                                : preview.availableUnits
                              )?.map((item) => (
                                <NativeSelectOption key={item.id} value={item.id}>
                                  {item.code} — {item.path || item.name}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                            <FieldError id={`catalog-existing-error-${index}`}>
                              {form.formState.errors.entries?.[index]?.existingId?.message}
                            </FieldError>
                          </Field>
                        ) : null}
                        {entry.mode === 'create' ? (
                          <FieldGroup className="[container-type:normal] grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field
                              data-invalid={Boolean(form.formState.errors.entries?.[index]?.code)}
                            >
                              <FieldLabel htmlFor={`catalog-code-${index}`}>
                                Mã{' '}
                                <span aria-hidden="true" className="text-destructive font-bold">
                                  *
                                </span>
                              </FieldLabel>
                              <Input
                                id={`catalog-code-${index}`}
                                aria-describedby={`catalog-code-error-${index}`}
                                autoComplete="off"
                                spellCheck={false}
                                {...form.register(`entries.${index}.code`)}
                                aria-invalid={Boolean(form.formState.errors.entries?.[index]?.code)}
                              />
                              <FieldError id={`catalog-code-error-${index}`}>
                                {form.formState.errors.entries?.[index]?.code?.message}
                              </FieldError>
                            </Field>
                            <Field
                              data-invalid={Boolean(form.formState.errors.entries?.[index]?.name)}
                            >
                              <FieldLabel htmlFor={`catalog-name-${index}`}>
                                Tên{' '}
                                <span aria-hidden="true" className="text-destructive font-bold">
                                  *
                                </span>
                              </FieldLabel>
                              <Input
                                id={`catalog-name-${index}`}
                                aria-describedby={`catalog-name-error-${index}`}
                                {...form.register(`entries.${index}.name`)}
                                aria-invalid={Boolean(form.formState.errors.entries?.[index]?.name)}
                              />
                              <FieldError id={`catalog-name-error-${index}`}>
                                {form.formState.errors.entries?.[index]?.name?.message}
                              </FieldError>
                            </Field>
                            {categories ? (
                              <Field>
                                <FieldLabel htmlFor={`catalog-parent-${index}`}>
                                  Nhóm cha (tùy chọn)
                                </FieldLabel>
                                <NativeSelect
                                  id={`catalog-parent-${index}`}
                                  {...form.register(`entries.${index}.parentCode`)}
                                >
                                  <NativeSelectOption value="">Nhóm cấp gốc</NativeSelectOption>
                                  {preview.availableCategories?.map((item) => (
                                    <NativeSelectOption key={item.id} value={item.code}>
                                      {item.code} — {item.path || item.name}
                                    </NativeSelectOption>
                                  ))}
                                </NativeSelect>
                              </Field>
                            ) : (
                              <>
                                <Field
                                  data-invalid={Boolean(
                                    form.formState.errors.entries?.[index]?.symbol
                                  )}
                                >
                                  <FieldLabel htmlFor={`catalog-symbol-${index}`}>
                                    Ký hiệu (tùy chọn)
                                  </FieldLabel>
                                  <Input
                                    id={`catalog-symbol-${index}`}
                                    aria-describedby={`catalog-symbol-error-${index}`}
                                    aria-invalid={Boolean(
                                      form.formState.errors.entries?.[index]?.symbol
                                    )}
                                    {...form.register(`entries.${index}.symbol`)}
                                  />
                                  <FieldError id={`catalog-symbol-error-${index}`}>
                                    {form.formState.errors.entries?.[index]?.symbol?.message}
                                  </FieldError>
                                </Field>
                                <Field
                                  data-invalid={Boolean(
                                    form.formState.errors.entries?.[index]?.quantityPrecision
                                  )}
                                >
                                  <FieldLabel htmlFor={`catalog-precision-${index}`}>
                                    Số chữ số thập phân
                                  </FieldLabel>
                                  <Input
                                    id={`catalog-precision-${index}`}
                                    aria-describedby={`catalog-precision-error-${index}`}
                                    type="number"
                                    min={0}
                                    max={6}
                                    step={1}
                                    inputMode="numeric"
                                    aria-invalid={Boolean(
                                      form.formState.errors.entries?.[index]?.quantityPrecision
                                    )}
                                    {...form.register(`entries.${index}.quantityPrecision`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                  <FieldError id={`catalog-precision-error-${index}`}>
                                    {
                                      form.formState.errors.entries?.[index]?.quantityPrecision
                                        ?.message
                                    }
                                  </FieldError>
                                </Field>
                              </>
                            )}
                          </FieldGroup>
                        ) : null}
                      </fieldset>
                    ) : null
                  )}
                </section>
              ) : null
            )}
          </FieldGroup>
        </form>
        <SheetFooter className="shrink-0 border-t">
          {hasNewCatalogs ? (
            <>
              <Field
                orientation="horizontal"
                data-invalid={Boolean(form.formState.errors.confirmed)}
              >
                <Controller
                  control={form.control}
                  name="confirmed"
                  render={({ field, fieldState }) => (
                    <Checkbox
                      id="catalog-confirm"
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      checked={field.value}
                      disabled={pending}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.invalid
                          ? 'catalog-confirm-error'
                          : needsConfirmation
                            ? 'catalog-confirm-hint'
                            : undefined
                      }
                      onCheckedChange={(value) => field.onChange(value === true)}
                    />
                  )}
                />
                <FieldLabel htmlFor="catalog-confirm">
                  Tôi xác nhận tạo các danh mục mới khi nhập hàng hóa.
                </FieldLabel>
              </Field>
              <FieldError id="catalog-confirm-error">
                {form.formState.errors.confirmed?.message}
              </FieldError>
            </>
          ) : null}
          {needsConfirmation ? (
            <p id="catalog-confirm-hint" role="status" className="text-muted-foreground text-xs">
              Tick xác nhận để áp dụng phương án tạo mới. Danh mục chỉ được tạo khi xác nhận nhập
              hàng hóa.
            </p>
          ) : null}
          <Button
            type="submit"
            form="product-import-catalogs"
            disabled={pending || needsConfirmation}
            aria-describedby={needsConfirmation ? 'catalog-confirm-hint' : undefined}
          >
            Áp dụng và kiểm tra lại
          </Button>
        </SheetFooter>
        <SheetClose asChild>
          <Button
            variant="ghost"
            className="absolute top-3 right-3"
            size="icon-sm"
            disabled={pending}
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">Đóng danh mục cần xử lý</span>
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
