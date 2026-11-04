import { Document, Page, Text, View } from '@react-pdf/renderer'
import {
  PdfCell,
  PdfFormHeader,
  PdfSignatures,
  pdfDate,
  pdfQuantity,
  pdfStyles as s,
} from '@/components/documents/WarehousePdf'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { stockIssuePdfQuantities } from '../../utils/stock-issue-pdf-quantities'

export function StockIssuePdfDocument({
  order,
  fontFamily,
}: {
  order: StockIssueRequestSummary
  fontFamily?: string
}) {
  if (order.status === 'Cancelled')
    throw new Error('Phiếu đã hủy không thể xuất PDF đang có hiệu lực.')
  if (!order.items.length) throw new Error('Phiếu chưa có dòng hàng để xuất PDF.')
  const rows = order.items.map((item) => ({ item, ...stockIssuePdfQuantities(item) }))
  if (
    order.status === 'Dispatched' &&
    rows.some((row) => Math.abs(row.issued - row.requested) > 0.000001)
  )
    throw new Error(
      'Chưa đủ chi tiết thực xuất để dựng phiếu hoàn tất. Vui lòng đối chiếu dữ liệu.'
    )
  const widths = [5, 29, 12, 10, 11, 11, 11, 11]
  const labels = [
    'STT',
    'Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa',
    'Mã số',
    'Đơn vị tính',
    'Yêu cầu',
    'Thực xuất',
    'Đơn giá',
    'Thành tiền',
  ]
  return (
    <Document>
      <Page size="A4" style={[s.page, ...(fontFamily ? [{ fontFamily }] : [])]}>
        <Text fixed style={s.footer}>
          {order.status !== 'Dispatched' ? 'BẢN NHÁP / CHƯA HOÀN TẤT — ' : ''}Phiếu xuất kho ·{' '}
          {order.stockIssueRequestCode}
        </Text>
        <PdfFormHeader
          form="02"
          title="PHIẾU XUẤT KHO"
          code={order.stockIssueRequestCode}
          draft={order.status !== 'Dispatched'}
          department={order.warehouseName}
        />
        <Text>Ngày lập: {pdfDate(order.createdAt)}</Text>
        <Text>Ngày xuất thực tế: {pdfDate(order.dispatchedAt)}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text>Nợ: …………………………</Text>
          <Text>Có: …………………………</Text>
        </View>
        <Text>Họ và tên người nhận hàng: {order.recipientName || order.stockRecipientName}</Text>
        <Text>Địa chỉ (bộ phận): {order.recipientAddress}</Text>
        <Text>Lý do xuất kho: {order.purpose ?? ''}</Text>
        <Text>Xuất tại kho (ngăn lô): {order.warehouseName} Địa điểm: …………………………</Text>
        <View style={s.table}>
          <View fixed>
            <View style={s.row}>
              <PdfCell width={56} />
              <PdfCell width={22} bold>
                Số lượng
              </PdfCell>
              <PdfCell width={22} />
            </View>
            <View style={s.row}>
              {labels.map((label, i) => (
                <PdfCell key={label} width={widths[i]!} bold>
                  {label}
                </PdfCell>
              ))}
            </View>
          </View>
          {rows.map(({ item, requested, issued }, index) => (
            <View key={item.id} wrap={false} style={s.row}>
              {[
                String(index + 1),
                item.productName,
                item.sku,
                item.enteredUnitName,
                pdfQuantity(requested),
                pdfQuantity(issued),
                '',
                '',
              ].map((value, i) => (
                <PdfCell key={i} width={widths[i]!}>
                  {value}
                </PdfCell>
              ))}
            </View>
          ))}
          <View wrap={false} style={s.row}>
            <PdfCell width={34} bold>
              Cộng
            </PdfCell>
            {[12, 10, 11, 11, 11].map((w, i) => (
              <PdfCell key={i} width={w}>
                x
              </PdfCell>
            ))}
            <PdfCell width={11} />
          </View>
        </View>
        <Text style={{ marginTop: 10 }}>Tổng số tiền (viết bằng chữ): ………………………………………………………</Text>
        <Text>Số chứng từ gốc kèm theo: {order.referenceCode ?? '…………………………'}</Text>
        <PdfSignatures
          labels={[
            'Người lập phiếu',
            'Người nhận hàng',
            'Thủ kho',
            'Kế toán trưởng (hoặc bộ phận có nhu cầu nhập)',
            'Giám đốc',
          ]}
        />
        <Text style={{ fontSize: 7 }}>
          Các trường giá trị kế toán và chữ ký chưa có dữ liệu được để trống. Bản tải phản ánh dữ
          liệu tại thời điểm xuất file.
        </Text>
      </Page>
    </Document>
  )
}
