import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { GoodsReceiptDetail } from '../../types/inbound.types'

const receiptPdfFontUrl = new URL(
  '../../../../assets/fonts/NotoSans-VariableFont_wdth,wght.ttf',
  import.meta.url
)
const receiptPdfFontSource =
  typeof window === 'undefined'
    ? decodeURIComponent(receiptPdfFontUrl.pathname).replace(/^\/([A-Z]:)/i, '$1')
    : receiptPdfFontUrl.href

Font.register({
  family: 'Noto Sans',
  fonts: [
    { src: receiptPdfFontSource, fontWeight: 400 },
    { src: receiptPdfFontSource, fontWeight: 700 },
    { src: receiptPdfFontSource, fontWeight: 400, fontStyle: 'italic' },
  ],
})

const COLS = {
  stt: '6%',
  name: '28%',
  sku: '11%',
  unit: '9%',
  doc: '11%',
  actual: '11%',
  price: '11%',
  amount: '13%',
}
const QTY_WIDTH = '22%'
const DOTS = '………………………………'
const SHORT_DOTS = '…………………'

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Noto Sans', fontSize: 9, color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orgBlock: { width: '50%', lineHeight: 1.5 },
  bold: { fontWeight: 700 },
  formBlock: { width: '50%', alignItems: 'center', textAlign: 'center' },
  legal: { fontSize: 8, fontStyle: 'italic' },
  title: { marginTop: 14, fontSize: 14, fontWeight: 700, textAlign: 'center' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  italic: { fontStyle: 'italic' },
  voucherNo: { alignItems: 'flex-end', lineHeight: 1.5 },
  info: { marginTop: 6, lineHeight: 1.6 },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#111' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#111' },
  lastRow: { flexDirection: 'row' },
  cell: { padding: 4, borderRightWidth: 1, borderColor: '#111' },
  cellLast: { padding: 4 },
  headCell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#111',
    justifyContent: 'center',
    fontWeight: 700,
    textAlign: 'center',
  },
  signRow: { marginTop: 18, flexDirection: 'row' },
  signCol: { width: '25%', alignItems: 'center' },
  signHint: { fontSize: 8, fontStyle: 'italic' },
})

const formatDate = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`
}

const qty = (n?: number | null) => (n == null ? '' : new Intl.NumberFormat('vi-VN').format(n))

const INDEX_ROW: Array<[keyof typeof COLS, string]> = [
  ['stt', 'A'],
  ['name', 'B'],
  ['sku', 'C'],
  ['unit', 'D'],
  ['doc', '1'],
  ['actual', '2'],
  ['price', '3'],
  ['amount', '4'],
]

export function ReceiptPdfDocument({ receipt }: { receipt: GoodsReceiptDetail }) {
  const totalDoc = receipt.items.reduce((sum, i) => sum + (i.orderedQuantity ?? 0), 0)
  const totalActual = receipt.items.reduce((sum, i) => sum + (i.receivedQuantity ?? 0), 0)
  const supplier = receipt.supplierName ?? receipt.sourceName ?? ''

  return (
    <Document title={`Phiếu nhập kho ${receipt.receiptCode}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.orgBlock}>
            <Text>Đơn vị: {receipt.warehouseName}</Text>
            <Text>Bộ phận: {DOTS}</Text>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.bold}>Mẫu số: 01 - VT</Text>
            <Text style={styles.legal}>
              (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài
              chính)
            </Text>
          </View>
        </View>

        <Text style={styles.title}>PHIẾU NHẬP KHO</Text>
        <Text style={[styles.center, styles.italic, { marginTop: 4 }]}>
          {formatDate(receipt.createdAt)}
        </Text>
        <View style={styles.voucherNo}>
          <Text>Số: {receipt.receiptCode}</Text>
          <Text>Nợ: {SHORT_DOTS}</Text>
          <Text>Có: {SHORT_DOTS}</Text>
        </View>

        <View style={styles.info}>
          <Text>- Họ và tên người giao: {DOTS}</Text>
          <Text>
            - Theo phiếu yêu cầu nhập số {receipt.inboundRequestCode} ngày …… tháng …… năm …… của{' '}
            {supplier || DOTS}
          </Text>
          <Text>
            - Nhập tại kho: {receipt.warehouseName} địa điểm: {DOTS}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.headCell, { width: COLS.stt }]}>STT</Text>
            <Text style={[styles.headCell, { width: COLS.name }]}>
              Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hóa
            </Text>
            <Text style={[styles.headCell, { width: COLS.sku }]}>Mã số</Text>
            <Text style={[styles.headCell, { width: COLS.unit }]}>Đơn vị tính</Text>
            <View style={{ width: QTY_WIDTH, borderRightWidth: 1, borderColor: '#111' }}>
              <Text
                style={[
                  styles.center,
                  styles.bold,
                  { padding: 4, borderBottomWidth: 1, borderColor: '#111' },
                ]}
              >
                Số lượng
              </Text>
              <View style={{ flexDirection: 'row', flexGrow: 1 }}>
                <Text style={[styles.headCell, { width: '50%' }]}>Theo chứng từ</Text>
                <Text style={[styles.headCell, { width: '50%', borderRightWidth: 0 }]}>
                  Thực nhập
                </Text>
              </View>
            </View>
            <Text style={[styles.headCell, { width: COLS.price }]}>Đơn giá</Text>
            <Text style={[styles.headCell, { width: COLS.amount, borderRightWidth: 0 }]}>
              Thành tiền
            </Text>
          </View>

          <View style={styles.row}>
            {INDEX_ROW.map(([key, label], idx) => (
              <Text
                key={key}
                style={[
                  idx === INDEX_ROW.length - 1 ? styles.cellLast : styles.cell,
                  styles.center,
                  { width: COLS[key] },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          {receipt.items.map((item, idx) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.center, { width: COLS.stt }]}>{idx + 1}</Text>
              <Text style={[styles.cell, { width: COLS.name }]}>{item.productName}</Text>
              <Text style={[styles.cell, { width: COLS.sku }]}>{item.productSKU}</Text>
              <Text style={[styles.cell, styles.center, { width: COLS.unit }]}>
                {item.baseUnitName}
              </Text>
              <Text style={[styles.cell, styles.right, { width: COLS.doc }]}>
                {qty(item.orderedQuantity)}
              </Text>
              <Text style={[styles.cell, styles.right, { width: COLS.actual }]}>
                {qty(item.receivedQuantity)}
              </Text>
              <Text style={[styles.cell, { width: COLS.price }]} />
              <Text style={[styles.cellLast, { width: COLS.amount }]} />
            </View>
          ))}

          <View style={styles.lastRow} wrap={false}>
            <Text style={[styles.cell, { width: COLS.stt }]} />
            <Text style={[styles.cell, styles.center, styles.bold, { width: COLS.name }]}>
              Cộng
            </Text>
            <Text style={[styles.cell, styles.center, styles.bold, { width: COLS.sku }]}>x</Text>
            <Text style={[styles.cell, styles.center, styles.bold, { width: COLS.unit }]}>x</Text>
            <Text style={[styles.cell, styles.right, styles.bold, { width: COLS.doc }]}>
              {qty(totalDoc)}
            </Text>
            <Text style={[styles.cell, styles.right, styles.bold, { width: COLS.actual }]}>
              {qty(totalActual)}
            </Text>
            <Text style={[styles.cell, styles.center, styles.bold, { width: COLS.price }]}>x</Text>
            <Text style={[styles.cellLast, { width: COLS.amount }]} />
          </View>
        </View>

        <View style={{ marginTop: 8, lineHeight: 1.6 }}>
          <Text>- Tổng số tiền (viết bằng chữ): {DOTS}</Text>
          <Text>- Số chứng từ gốc kèm theo: {receipt.inboundRequestCode}</Text>
        </View>

        <Text style={[styles.right, styles.signHint, { marginTop: 14 }]}>
          {formatDate(receipt.createdAt)}
        </Text>
        <View style={styles.signRow}>
          {[
            ['Người lập phiếu', receipt.receivingAssignedToName ?? receipt.createdByName, ''],
            ['Người giao hàng', '', ''],
            ['Thủ kho', receipt.approvedByName ?? '', ''],
            [
              'Kế toán trưởng',
              receipt.inboundRequestCreatedByName ?? '',
              '(Hoặc bộ phận có nhu cầu nhập)',
            ],
          ].map(([role, name, note]) => (
            <View key={role} style={styles.signCol}>
              <Text style={styles.bold}>{role}</Text>
              <View style={{ height: 11 }}>
                {note ? <Text style={[styles.signHint, styles.center]}>{note}</Text> : null}
              </View>
              <Text style={styles.signHint}>(Ký, họ tên)</Text>
              <Text style={{ marginTop: 33 }}>{name}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
