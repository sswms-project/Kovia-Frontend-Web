import { Document, Page, Text, View } from '@react-pdf/renderer'
import {
  PdfCell,
  PdfFormHeader,
  PdfSignatures,
  pdfDate,
  pdfQuantity,
  pdfStyles as s,
} from '@/components/documents/WarehousePdf'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { cycleCountPdfValues } from '../../utils/cycle-count-pdf-values'

export function CycleCountPdfDocument({
  detail,
  fontFamily,
}: {
  detail: CycleCountDetail
  fontFamily?: string
}) {
  if (detail.status === 'Cancelled')
    throw new Error('Phiếu đã hủy không thể xuất biên bản đang có hiệu lực.')
  if (!detail.items.length) throw new Error('Phiếu chưa có dòng kiểm kê để xuất PDF.')
  const widths = [3, 20, 8, 5, 5, 6, 5, 6, 5, 6, 5, 6, 5, 5, 5, 5]
  const headings = [
    'STT',
    'Tên, nhãn hiệu, quy cách vật tư, dụng cụ…',
    'Mã số',
    'Đơn vị tính',
    'Đơn giá',
    'Số lượng',
    'Thành tiền',
    'Số lượng',
    'Thành tiền',
    'Số lượng',
    'Thành tiền',
    'Số lượng',
    'Thành tiền',
    'Còn tốt 100%',
    'Kém phẩm chất',
    'Mất phẩm chất',
  ]
  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
        style={[s.page, { fontSize: 7 }, ...(fontFamily ? [{ fontFamily }] : [])]}
      >
        <Text fixed style={s.footer}>
          {detail.status !== 'Completed' ? 'BẢN NHÁP / CHƯA HOÀN TẤT — ' : ''}Biên bản kiểm kê ·{' '}
          {detail.code}
        </Text>
        <PdfFormHeader
          form="05"
          title="BIÊN BẢN TỔNG HỢP KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA"
          code={detail.code}
          draft={detail.status !== 'Completed'}
          department={detail.warehouseName}
        />
        <Text>Thời điểm kiểm kê: ……… giờ ……… ngày ……… tháng ……… năm ………</Text>
        <Text>Ban kiểm kê/Hội đồng kiểm kê gồm:</Text>
        <Text>
          Ông/Bà: ……………………… Chức vụ: ……………………… Đại diện: ……………………… Trưởng ban/Chủ tịch Hội đồng
        </Text>
        <Text>Ông/Bà: ……………………… Chức vụ: ……………………… Đại diện: ……………………… Ủy viên</Text>
        <Text>Ông/Bà: ……………………… Chức vụ: ……………………… Đại diện: ……………………… Ủy viên</Text>
        <Text>
          Đã kiểm kê kho: {detail.warehouseName} · {detail.zoneName ?? 'Toàn kho'} · Vòng{' '}
          {detail.recountRound}
        </Text>
        <Text>
          Mục đích: {detail.purpose ?? ''} · Ngày lập: {pdfDate(detail.createdAt)} · Ngày chốt:{' '}
          {pdfDate(detail.finalizedAt ?? detail.completedAt)}
        </Text>
        <View style={s.table}>
          <View fixed>
            <View style={s.row}>
              <PdfCell width={41} />
              <PdfCell width={11} bold>
                Theo sổ kế toán
              </PdfCell>
              <PdfCell width={11} bold>
                Theo kiểm kê
              </PdfCell>
              <PdfCell width={22} bold>
                Chênh lệch
              </PdfCell>
              <PdfCell width={15} bold>
                Phẩm chất
              </PdfCell>
            </View>
            <View style={s.row}>
              <PdfCell width={63} />
              <PdfCell width={11} bold>
                Thừa
              </PdfCell>
              <PdfCell width={11} bold>
                Thiếu
              </PdfCell>
              <PdfCell width={15} />
            </View>
            <View style={s.row}>
              {headings.map((label, i) => (
                <PdfCell key={i} width={widths[i]!} bold>
                  {label}
                </PdfCell>
              ))}
            </View>
          </View>
          {detail.items.map((item, index) => {
            const values = cycleCountPdfValues(item)
            const location = formatStockLocation(item)
            const label = `${item.productName}\n${location}\nLô: ${item.lotNumber ?? 'Không theo lô'}${item.expiryDate ? ` · HSD: ${item.expiryDate}` : ''}${item.countedAt ? `\nĐếm: ${pdfDate(item.countedAt)}` : ''}\nHỏng trong thực kiểm: ${pdfQuantity(values.damagedQuantity)}${item.note ? `\n${item.note}` : ''}`
            const cells = [
              String(index + 1),
              label,
              item.productSku,
              item.unitName ?? '',
              '',
              values.hidden ? 'Đã ẩn' : pdfQuantity(values.systemQuantity),
              '',
              pdfQuantity(values.countedQuantity),
              '',
              values.hidden ? 'Đã ẩn' : pdfQuantity(values.surplus),
              '',
              values.hidden ? 'Đã ẩn' : pdfQuantity(values.shortage),
              '',
              '',
              '',
              '',
            ]
            return (
              <View key={item.id} wrap={false} style={s.row}>
                {cells.map((value, i) => (
                  <PdfCell key={i} width={widths[i]!}>
                    {value}
                  </PdfCell>
                ))}
              </View>
            )
          })}
          <View wrap={false} style={s.row}>
            <PdfCell width={23} bold>
              Cộng
            </PdfCell>
            {widths.slice(2).map((width, index) => (
              <PdfCell key={index} width={width}>
                {[0, 1, 2, 3, 5, 7, 9, 11, 12, 13].includes(index) ? 'x' : ''}
              </PdfCell>
            ))}
          </View>
        </View>
        <PdfSignatures
          labels={[
            'Giám đốc (ý kiến giải quyết số chênh lệch)',
            'Kế toán trưởng',
            'Thủ kho',
            'Trưởng ban/Chủ tịch Hội đồng kiểm kê',
          ]}
        />
        <Text>
          Hoàn tất kiểm kê không xác nhận các phiếu điều chỉnh đã được phê duyệt hoặc ghi sổ. Giá
          trị kế toán, phân loại phẩm chất chi tiết và chữ ký chưa có dữ liệu được để trống.
        </Text>
      </Page>
    </Document>
  )
}
