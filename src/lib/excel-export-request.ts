import { axiosClient } from '@/lib/axios'
import { inventoryExportFileName } from '@/lib/excel-download'

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function requestExcelFile(endpoint: string, payload: unknown, signal: AbortSignal) {
  const response = await axiosClient.post<ArrayBuffer>(endpoint, payload, {
    signal,
    responseType: 'arraybuffer',
    transformResponse: [
      (data: unknown, headers) => {
        if (data instanceof ArrayBuffer && String(headers['content-type']).includes('json')) {
          return JSON.parse(new TextDecoder().decode(data)) as unknown
        }
        return data
      },
    ],
  })
  if (
    !String(response.headers['content-type']).includes(XLSX_CONTENT_TYPE) ||
    !(response.data instanceof ArrayBuffer) ||
    response.data.byteLength < 4 ||
    new Uint8Array(response.data)[0] !== 0x50 ||
    new Uint8Array(response.data)[1] !== 0x4b
  ) {
    throw new Error('Máy chủ không trả về tệp Excel hợp lệ. Vui lòng thử lại.')
  }
  return {
    blob: new Blob([response.data], { type: XLSX_CONTENT_TYPE }),
    fileName: inventoryExportFileName(response.headers['content-disposition']),
  }
}
