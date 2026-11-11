import type { ReactNode } from 'react'
import { Font, StyleSheet, Text, View } from '@react-pdf/renderer'

const regularUrl = new URL('../../assets/fonts/NotoSans-Pdf-Regular.ttf', import.meta.url)
const boldUrl = new URL('../../assets/fonts/NotoSans-Pdf-Bold.ttf', import.meta.url)
const source = (fontUrl: URL) =>
  typeof window === 'undefined'
    ? decodeURIComponent(fontUrl.pathname).replace(/^\/([A-Z]:)/i, '$1')
    : fontUrl.href
Font.register({
  family: 'Warehouse Noto',
  fonts: [
    { src: source(regularUrl), fontWeight: 400 },
    { src: source(boldUrl), fontWeight: 700 },
  ],
})
// A fresh family avoids reusing glyph/subset state between successive PDF documents.
export function createPdfFontFamily() {
  const family = `Warehouse-${crypto.randomUUID()}`
  Font.register({
    family,
    fonts: [
      { src: source(regularUrl), fontWeight: 400 },
      { src: source(boldUrl), fontWeight: 700 },
    ],
  })
  return family
}
export const pdfStyles = StyleSheet.create({
  page: {
    padding: 28,
    paddingBottom: 45,
    fontFamily: 'Warehouse Noto',
    fontSize: 9,
    color: '#111',
    lineHeight: 1.5,
  },
  row: { flexDirection: 'row' },
  bold: { fontWeight: 700 },
  title: { fontWeight: 700, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 6 },
  table: { borderTopWidth: 1, borderLeftWidth: 1, marginTop: 10 },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, padding: 3, justifyContent: 'center' },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    fontSize: 7,
    textAlign: 'center',
  },
})
export type PdfIssuer = {
  name: string
  address?: string | null
  taxCode?: string | null
}
const blank = '…………………………'
export function PdfFormHeader({
  form,
  title,
  code,
  draft,
  department,
  issuer,
}: {
  form: string
  title: string
  code: string
  draft: boolean
  department: string
  issuer?: PdfIssuer | null
}) {
  return (
    <>
      <View style={[pdfStyles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '48%' }}>
          <Text>Đơn vị: {issuer?.name || blank}</Text>
          <Text>Địa chỉ: {issuer?.address || blank}</Text>
          <Text>Mã số thuế: {issuer?.taxCode || blank}</Text>
          <Text>Bộ phận: {department}</Text>
        </View>
        <View style={{ width: '50%', textAlign: 'center', fontSize: 8 }}>
          <Text style={pdfStyles.bold}>Mẫu số {form} - VT</Text>
          <Text>(Tham khảo Thông tư 99/2025/TT-BTC</Text>
          <Text>ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)</Text>
        </View>
      </View>
      <Text style={pdfStyles.title}>{title}</Text>
      <Text style={{ textAlign: 'center' }}>Số: {code}</Text>
      {draft ? (
        <Text style={{ textAlign: 'center', fontSize: 9 }}>BẢN NHÁP / CHƯA HOÀN TẤT</Text>
      ) : null}
    </>
  )
}
export function PdfCell({
  width,
  children,
  bold = false,
  fontSize,
}: {
  width: number
  children?: ReactNode
  bold?: boolean
  fontSize?: number
}) {
  return (
    <View
      style={[
        pdfStyles.cell,
        { width: `${width}%`, fontWeight: bold ? 700 : 400, ...(fontSize ? { fontSize } : {}) },
      ]}
    >
      <Text>{children ?? ''}</Text>
    </View>
  )
}
// react-pdf never breaks a word without hyphenation points and always adds a visible '-' at those
// points, so long codes (SKU) are split into explicit lines instead, preferring existing separators.
export function splitPdfCode(value: string, maxChars: number) {
  const lines: string[] = []
  let rest = value
  while (rest.length > maxChars) {
    const head = rest.slice(0, maxChars)
    const separator = Math.max(...['-', '_', '/', '.', ' '].map((c) => head.lastIndexOf(c)))
    const cut = separator > 0 ? separator + 1 : maxChars
    lines.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }
  return rest ? [...lines, rest] : lines
}
export function PdfSignatures({ labels }: { labels: string[] }) {
  return (
    <View wrap={false} style={[pdfStyles.row, { marginTop: 22, minHeight: 85 }]}>
      {labels.map((label) => (
        <View key={label} style={{ flex: 1, textAlign: 'center', padding: 3 }}>
          <Text style={pdfStyles.bold}>{label}</Text>
          <Text>(Ký, họ tên)</Text>
        </View>
      ))}
    </View>
  )
}
export function pdfQuantity(value: number | null) {
  return value === null
    ? ''
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(value)
}
export function pdfDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : '…………………………'
}
