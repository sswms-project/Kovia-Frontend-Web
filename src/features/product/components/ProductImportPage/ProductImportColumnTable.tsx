import { SpreadsheetImportColumnTable } from '@/components/operations/SpreadsheetImportColumnTable'
import type { ComponentProps } from 'react'

export function ProductImportColumnTable(
  props: Omit<ComponentProps<typeof SpreadsheetImportColumnTable>, 'label'> & {
    readonly kind: 'main' | 'conversions'
  }
) {
  return (
    <SpreadsheetImportColumnTable
      {...props}
      fields={props.fields.map((field) => ({
        ...field,
        description:
          field.field === 'sku'
            ? 'Mã dạng văn bản, tối đa 100 ký tự; không tự sinh mã.'
            : field.field === 'conversionFactor'
              ? '1 đơn vị quy đổi = hệ số × đơn vị tính chính. Hệ số lớn hơn 0, tối đa 6 chữ số thập phân.'
              : field.description,
        defaultValue:
          field.field === 'isLotTracked' && field.defaultValue === 'false'
            ? 'Không'
            : field.defaultValue,
      }))}
      label={props.kind === 'main' ? 'hàng hóa' : 'quy đổi'}
    />
  )
}
