import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpeningStockDraft } from './use-opening-stock-draft'
import { openingStockImportService } from '../services/opening-stock-import.service'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), create: vi.fn() }))
vi.mock('./use-inventory', () => ({
  useUploadInventoryEvidenceMutation: () => ({ mutateAsync: mocks.upload, isPending: false }),
  useCreateOpeningStockMutation: () => ({ mutateAsync: mocks.create, isPending: false }),
}))
vi.mock('../services/opening-stock-import.service', () => ({
  openingStockImportService: { operation: vi.fn() },
}))
const input = {
  file: new File(['QA'], 'evidence.pdf'),
  warehouseId: 'warehouse',
  effectiveDate: '2026-01-01',
  formVersion: 1 as const,
  acknowledgePendingLots: false,
  lines: [],
}
function mount() {
  const client = new QueryClient()
  return renderHook(() => useOpeningStockDraft(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.upload.mockResolvedValue({ data: { id: 'evidence' } })
  vi.mocked(openingStockImportService.operation).mockResolvedValue({
    status: 'Unknown',
    id: null,
    code: null,
  })
})
describe('manual opening stock draft safety', () => {
  it('creates without uploading when no attachment was chosen', async () => {
    const hook = mount()
    await act(() => hook.result.current.save({ ...input, file: undefined }))
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ evidenceIds: [] }))
  })
  it('keeps the same command for an uncertain creation without an attachment', async () => {
    mocks.create.mockRejectedValueOnce({ statusCode: 0 }).mockResolvedValueOnce({ data: 'id' })
    const hook = mount()
    await act(async () => {
      await expect(hook.result.current.save({ ...input, file: undefined })).rejects.toBeDefined()
    })
    await act(() => hook.result.current.save({ ...input, file: undefined }))
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.create.mock.calls[1]?.[0]).toEqual(mocks.create.mock.calls[0]?.[0])
  })
  it('reuses evidence and command ID after an uncertain result', async () => {
    mocks.create
      .mockRejectedValueOnce({ statusCode: 0, message: 'Mất phản hồi' })
      .mockResolvedValueOnce({ data: 'id' })
    const hook = mount()
    await act(async () => {
      await expect(hook.result.current.save(input)).rejects.toMatchObject({ statusCode: 0 })
    })
    expect(hook.result.current.uncertain).toBe(true)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    await act(() => hook.result.current.save(input))
    expect(hook.result.current.uncertain).toBe(false)
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    expect(mocks.create.mock.calls[1]?.[0]).toEqual(mocks.create.mock.calls[0]?.[0])
  })
  it('does not submit changed content while the first result remains unknown', async () => {
    mocks.create.mockRejectedValue({ statusCode: 503, message: 'Mất phản hồi' })
    const hook = mount()
    await act(async () => {
      await expect(hook.result.current.save(input)).rejects.toBeDefined()
    })
    await act(async () => {
      await expect(
        hook.result.current.save({ ...input, effectiveDate: '2026-01-02' })
      ).rejects.toThrow('Kết quả lần tạo trước chưa rõ')
    })
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it('recovers a completed operation without sending another create request', async () => {
    mocks.create.mockRejectedValue({ statusCode: 0, message: 'Mất phản hồi' })
    vi.mocked(openingStockImportService.operation).mockResolvedValue({
      status: 'Completed',
      id: 'record',
      code: 'OPEN-01',
    })
    const hook = mount()
    await act(() => hook.result.current.save(input))
    expect(hook.result.current.uncertain).toBe(false)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
})
