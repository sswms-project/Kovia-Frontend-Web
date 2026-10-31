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
  name: '30%',
  sku: '14%',
  unit: '9%',
  doc: '10%',
  actual: '10%',
  price: '10%',
  amount: '11%',
}

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Noto Sans', fontSize: 9, color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orgBlock: { width: '60%' },
  bold: { fontWeight: 700 },
  formBlock: { width: '40%', alignItems: 'center', textAlign: 'center' },
  legal: { fontSize: 8, fontStyle: 'italic' },
  title: { marginTop: 14, fontSize: 16, fontWeight: 700, textAlign: 'center' },
  center: { textAlign: 'center' },
  info: { marginTop: 10, lineHeight: 1.5 },
  table: { marginTop: 10, borderWidth: 1, borderColor: '#111' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#111' },
  lastRow: { flexDirection: 'row' },
  cell: { padding: 4, borderRightWidth: 1, borderColor: '#111' },
  cellLast: { padding: 4 },
  head: { fontWeight: 700, textAlign: 'center' },
  right: { textAlign: 'right' },
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

const COLUMNS: Array<[keyof typeof COLS, string]> = [
  ['stt', 'STT'],
  ['name', 'Tên hàng hóa'],
  ['sku', 'Mã số'],
  ['unit', 'ĐVT'],
  ['doc', 'SL chứng từ'],
  ['actual', 'SL thực nhập'],
  ['price', 'Đơn giá'],
  ['amount', 'Thành tiền'],
]

export function ReceiptPdfDocument({ receipt }: { receipt: GoodsReceiptDetail }) {
  const totalActual = receipt.items.reduce((sum, i) => sum + (i.receivedQuantity ?? 0), 0)

  return (
    <Document title={`Phiếu nhập kho ${receipt.receiptCode}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.orgBlock}>
            <Text style={styles.bold}>Kho: {receipt.warehouseName}</Text>
            {receipt.warehouseCode ? <Text>Mã kho: {receipt.warehouseCode}</Text> : null}
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.bold}>Mẫu số 01 - VT</Text>
            <Text style={styles.legal}>
              (Ban hành theo Thông tư số 200/2014/TT-BTC, ngày 22/12/2014 của Bộ Tài chính)
            </Text>
          </View>
        </View>

        <Text style={styles.title}>PHIẾU NHẬP KHO</Text>
        <Text style={styles.center}>{formatDate(receipt.createdAt)}</Text>
        <Text style={styles.center}>Số: {receipt.receiptCode}</Text>

        <View style={styles.info}>
          <Text>Nhà cung cấp: {receipt.supplierName ?? receipt.sourceName ?? ''}</Text>
          <Text>Theo phiếu yêu cầu nhập số: {receipt.inboundRequestCode}</Text>
          <Text>Nhập tại kho: {receipt.warehouseName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            {COLUMNS.map(([key, label], idx) => (
              <Text
                key={key}
                style={[
                  idx === COLUMNS.length - 1 ? styles.cellLast : styles.cell,
                  styles.head,
                  { width: COLS[key] },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
          {receipt.items.map((item, idx) => {
            const last = idx === receipt.items.length - 1
            return (
              <View key={item.id} style={last ? styles.lastRow : styles.row} wrap={false}>
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
            )
          })}
        </View>

        <View style={{ marginTop: 8, lineHeight: 1.5 }}>
          <Text>Tổng số lượng thực nhập: {qty(totalActual)}</Text>
          <Text>Số chứng từ gốc kèm theo: {receipt.inboundRequestCode}</Text>
        </View>

        <Text style={[styles.right, styles.signHint, { marginTop: 14 }]}>
          {formatDate(receipt.createdAt)}
        </Text>
        <View style={styles.signRow}>
          {[
            ['Người lập phiếu', receipt.createdByName, ''],
            ['Người giao hàng', '', ''],
            ['Thủ kho', receipt.approvedByName ?? '', ''],
            ['Kế toán trưởng', receipt.createdByName, '(Hoặc bộ phận có nhu cầu nhập)'],
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
