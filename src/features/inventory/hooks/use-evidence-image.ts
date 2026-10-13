'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'

const IMAGE_CONTENT_TYPE = /^image\//i
const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif)$/i

export function isEvidenceImage(file: { readonly contentType: string; readonly fileName: string }) {
  return IMAGE_CONTENT_TYPE.test(file.contentType) || IMAGE_EXTENSION.test(file.fileName)
}

/**
 * Bằng chứng nằm ở kho lưu trữ riêng tư nên không có URL công khai: tải tệp qua API (kèm token, BE kiểm tra quyền)
 * rồi tạo URL tạm của trình duyệt để hiển thị. URL tạm được thu hồi khi không còn dùng.
 */
export function useEvidenceImage(evidenceId: string, enabled = true) {
  const query = useQuery({
    queryKey: ['inventory', 'evidence-blob', evidenceId],
    queryFn: () =>
      axiosClient
        .get<Blob>(API_ENDPOINTS.inventory.evidenceFile(evidenceId), { responseType: 'blob' })
        .then((response) => response.data),
    enabled,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
  const [url, setUrl] = useState<string | null>(null)
  const blob = query.data

  useEffect(() => {
    if (!blob) return
    // URL tạm là tài nguyên ngoài của trình duyệt: tạo khi có dữ liệu, thu hồi khi dọn effect (kể cả StrictMode chạy lại effect).
    const objectUrl = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  return { url, isLoading: query.isLoading, isError: query.isError }
}
