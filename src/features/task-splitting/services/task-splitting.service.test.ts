import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { taskSplittingService } from './task-splitting.service'

const SOURCE_ID = '11111111-1111-1111-1111-111111111111'
const PART_ID = '22222222-2222-2222-2222-222222222222'
const STAFF_ID = '33333333-3333-3333-3333-333333333333'
const LINE_ID = '44444444-4444-4444-4444-444444444444'
const COMMAND_ID = '55555555-5555-5555-5555-555555555555'

const stateResponse = {
  sourceType: 'Receiving',
  sourceId: SOURCE_ID,
  code: 'YCN-001',
  isSplit: true,
  version: 'AAAAAAAAB9E=',
  splitSuggested: true,
  taskScore: 42.5,
  threshold: 30,
  canSplit: true,
  canCancelSplit: false,
  lines: [
    {
      sourceLineId: LINE_ID,
      label: 'SP-01 Sữa',
      zoneName: null,
      slotCode: null,
      outstanding: 10,
      unassigned: 4,
    },
  ],
  parts: [
    {
      id: PART_ID,
      sequence: 1,
      assignedTo: STAFF_ID,
      assigneeName: 'Nguyễn Văn A',
      executionStatus: 'Queued',
      dueAt: null,
      version: 'AAAAAAAAB9I=',
      lines: [{ sourceLineId: LINE_ID, label: 'SP-01 Sữa', quantity: 6, completedQuantity: 0 }],
      allowedActions: ['edit', 'reassign', 'cancel'],
    },
  ],
}

const suggestionResponse = {
  staff: [
    {
      id: STAFF_ID,
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      openReceivingTasks: 1,
      openPutAwayTasks: 0,
      openPickingTasks: 0,
      openWarehouseTasks: 0,
      openCycleCounts: 0,
      hasTaskInProgress: false,
      workloadScore: 12.5,
      totalOpenTasks: 1,
      isRecommended: true,
    },
  ],
  preselectedStaffIds: [STAFF_ID],
  recommendedPeople: 2,
  limits: { maxLinesPerPart: 0, maxPointsPerPart: 0 },
  parts: [
    {
      staffId: STAFF_ID,
      zoneId: null,
      lines: [{ sourceLineId: LINE_ID, quantity: 4 }],
      points: 18.2,
    },
  ],
  idleStaffIds: [],
  loadAfter: { [STAFF_ID]: 30.7 },
  maxLoadGap: 0,
}

const settingsResponse = {
  items: [{ sourceType: 'PutAway', maxLinesPerPart: 20, maxPointsPerPart: 0, version: 1 }],
}

const INVALID_RESPONSE = {
  statusCode: 500,
  message: 'Dữ liệu chia việc từ máy chủ không hợp lệ. Vui lòng tải lại trang.',
}

const originalAdapter = axiosClient.defaults.adapter
afterEach(() => {
  axiosClient.defaults.adapter = originalAdapter
})

function respondWith(data: unknown) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: { isSuccess: true, statusCode: 200, message: '', data },
    status: 200,
    statusText: 'OK',
    headers: {},
  }))
  axiosClient.defaults.adapter = adapter
  return adapter
}

function without(response: Record<string, unknown>, field: string) {
  const copy = { ...response }
  delete copy[field]
  return copy
}

function sentRequest(adapter: ReturnType<typeof respondWith>) {
  expect(adapter).toHaveBeenCalledOnce()
  const config = adapter.mock.calls[0]![0] as InternalAxiosRequestConfig
  return {
    method: config.method,
    url: axiosClient.getUri(config).replace(axiosClient.defaults.baseURL ?? '', ''),
    body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
  }
}

describe('taskSplittingService reads', () => {
  it('gets and parses the split state of a source task', async () => {
    const adapter = respondWith(stateResponse)

    await expect(taskSplittingService.getState('Receiving', SOURCE_ID)).resolves.toEqual(
      stateResponse
    )

    expect(sentRequest(adapter)).toMatchObject({
      method: 'get',
      url: `/task-splits/Receiving/${SOURCE_ID}`,
    })
  })

  it('rejects a state response missing a required field with a short message', async () => {
    respondWith(without(stateResponse, 'canSplit'))

    await expect(taskSplittingService.getState('Receiving', SOURCE_ID)).rejects.toEqual(
      INVALID_RESPONSE
    )
  })

  it('drops part actions this client does not know instead of rejecting the state', async () => {
    const part = { ...stateResponse.parts[0]!, allowedActions: ['edit', 'pause', 'cancel'] }
    respondWith({ ...stateResponse, parts: [part] })

    const state = await taskSplittingService.getState('Receiving', SOURCE_ID)

    expect(state.parts[0]?.allowedActions).toEqual(['edit', 'cancel'])
  })

  it('sends chosen staff as one comma-separated parameter the backend can bind', async () => {
    const adapter = respondWith(suggestionResponse)
    const otherStaff = '66666666-6666-6666-6666-666666666666'

    await expect(
      taskSplittingService.getSuggestion('TransferPick', SOURCE_ID, [STAFF_ID, otherStaff])
    ).resolves.toEqual(suggestionResponse)

    expect(sentRequest(adapter)).toMatchObject({
      method: 'get',
      url: `/task-splits/TransferPick/${SOURCE_ID}/suggestion?staffIds=${STAFF_ID},${otherStaff}`,
    })
  })

  it('omits staff when the backend should preselect the lightest staff', async () => {
    const adapter = respondWith(suggestionResponse)

    await taskSplittingService.getSuggestion('CycleCount', SOURCE_ID, null)

    expect(sentRequest(adapter).url).toBe(`/task-splits/CycleCount/${SOURCE_ID}/suggestion`)
  })

  it('rejects a suggestion response missing a required field', async () => {
    respondWith(without(suggestionResponse, 'recommendedPeople'))

    await expect(taskSplittingService.getSuggestion('Receiving', SOURCE_ID, null)).rejects.toEqual(
      INVALID_RESPONSE
    )
  })

  it('gets and parses split settings', async () => {
    const adapter = respondWith(settingsResponse)

    await expect(taskSplittingService.getSettings()).resolves.toEqual(settingsResponse)
    expect(sentRequest(adapter)).toMatchObject({ method: 'get', url: '/task-split-settings' })
  })

  it('rejects a settings response missing a required field with a short message', async () => {
    respondWith({ items: [without(settingsResponse.items[0]!, 'version')] })

    await expect(taskSplittingService.getSettings()).rejects.toEqual(INVALID_RESPONSE)
  })
})

describe('taskSplittingService writes', () => {
  const lines = [{ sourceLineId: LINE_ID, quantity: 3 }]

  it.each([
    {
      name: 'create split',
      call: () =>
        taskSplittingService.create('StockIssuePick', SOURCE_ID, {
          commandId: COMMAND_ID,
          expectedVersion: 'v1',
          priority: 'Urgent',
          dueAt: null,
          parts: [{ staffId: STAFF_ID, lines }],
        }),
      method: 'post',
      url: `/task-splits/StockIssuePick/${SOURCE_ID}`,
      body: {
        commandId: COMMAND_ID,
        expectedVersion: 'v1',
        priority: 'Urgent',
        dueAt: null,
        parts: [{ staffId: STAFF_ID, lines }],
      },
    },
    {
      name: 'cancel split',
      call: () =>
        taskSplittingService.cancel('Relocation', SOURCE_ID, {
          commandId: COMMAND_ID,
          expectedVersion: 'v1',
          reason: 'Sai người',
        }),
      method: 'post',
      url: `/task-splits/Relocation/${SOURCE_ID}/cancel`,
      body: { commandId: COMMAND_ID, expectedVersion: 'v1', reason: 'Sai người' },
    },
    {
      name: 'update part',
      call: () =>
        taskSplittingService.updatePart(PART_ID, {
          expectedVersion: 'v2',
          staffId: STAFF_ID,
          lines,
        }),
      method: 'put',
      url: `/task-parts/${PART_ID}`,
      body: { expectedVersion: 'v2', staffId: STAFF_ID, lines },
    },
    {
      name: 'reassign part',
      call: () =>
        taskSplittingService.reassignPart(PART_ID, {
          expectedVersion: 'v2',
          staffId: STAFF_ID,
          expectedStaffId: null,
          reason: 'Nghỉ ốm',
        }),
      method: 'post',
      url: `/task-parts/${PART_ID}/reassign`,
      body: { expectedVersion: 'v2', staffId: STAFF_ID, expectedStaffId: null, reason: 'Nghỉ ốm' },
    },
    {
      name: 'split remaining part',
      call: () =>
        taskSplittingService.splitRemainingPart(PART_ID, {
          expectedVersion: 'v2',
          staffId: STAFF_ID,
          lines,
        }),
      method: 'post',
      url: `/task-parts/${PART_ID}/split-remaining`,
      body: { expectedVersion: 'v2', staffId: STAFF_ID, lines },
    },
    {
      name: 'merge part',
      call: () =>
        taskSplittingService.mergePart(PART_ID, { expectedVersion: 'v2', intoPartId: SOURCE_ID }),
      method: 'post',
      url: `/task-parts/${PART_ID}/merge`,
      body: { expectedVersion: 'v2', intoPartId: SOURCE_ID },
    },
    {
      name: 'cancel part',
      call: () => taskSplittingService.cancelPart(PART_ID, { expectedVersion: 'v2', reason: 'Dư' }),
      method: 'post',
      url: `/task-parts/${PART_ID}/cancel`,
      body: { expectedVersion: 'v2', reason: 'Dư' },
    },
    {
      name: 'complete part',
      call: () =>
        taskSplittingService.completePart(PART_ID, { expectedVersion: 'v2', reason: 'Thiếu hàng' }),
      method: 'post',
      url: `/task-parts/${PART_ID}/complete`,
      body: { expectedVersion: 'v2', reason: 'Thiếu hàng' },
    },
    {
      name: 'update settings',
      call: () =>
        taskSplittingService.updateSettings({
          items: [
            { sourceType: 'CycleCount', maxLinesPerPart: 50, maxPointsPerPart: 0, version: 0 },
          ],
        }),
      method: 'put',
      url: '/task-split-settings',
      body: {
        items: [{ sourceType: 'CycleCount', maxLinesPerPart: 50, maxPointsPerPart: 0, version: 0 }],
      },
    },
  ])('$name calls $method $url with the command body', async ({ call, method, url, body }) => {
    const adapter = respondWith({})

    await call()

    expect(sentRequest(adapter)).toEqual({ method, url, body })
  })
})
