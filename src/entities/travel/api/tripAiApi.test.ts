import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeTripChat,
  applyAiAnalysisRun,
  applyAiSuggestion,
  getAiSuggestions,
  rejectAiAnalysisRun,
  rejectAiSuggestion,
} from './tripAiApi'

const suggestion = {
  aiSuggestionId: 31,
  analysisRunId: 12,
  suggestedPlaceId: 351,
  suggestedPlaceName: '해운대해수욕장',
  suggestedRegionHint: '부산 해운대구',
  title: '해운대 방문',
  summary: '오전에 해운대를 방문하는 일정',
  reason: '채팅에서 오전 방문에 합의함',
  scheduleDate: '2026-07-01',
  startTime: '10:00:00',
  endTime: '12:00:00',
  dayNo: 1,
  sortOrder: 1,
  status: 'PENDING' as const,
  appliedScheduleItemId: null,
  createdAt: '2026-06-23T12:00:00',
  appliedAt: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('tripAiApi', () => {
  it('analyzes trip chat with authentication and the optional request body', async () => {
    const responseBody = {
      analysisRunId: 12,
      triggerType: 'BUTTON',
      status: 'SUCCEEDED',
      suggestions: [suggestion],
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    )

    const result = await analyzeTripChat('token', 1, {
      messageLimit: 100,
      additionalRequest: '바다를 먼저 가고 싶어요',
    })

    expect(result).toEqual(responseBody)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/1/ai/schedule-drafts'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageLimit: 100,
          additionalRequest: '바다를 먼저 가고 싶어요',
        }),
      }),
    )
  })

  it('loads pending suggestions by default and supports status filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => (
      new Response(JSON.stringify([suggestion]), { status: 200 })
    ))

    await getAiSuggestions('token', 1)
    await getAiSuggestions('token', 1, 'APPLIED')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/trips/1/ai/suggestions?status=PENDING'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/trips/1/ai/suggestions?status=APPLIED'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
  })

  it('uses the documented individual and bulk mutation endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => (
      new Response(JSON.stringify([suggestion]), { status: 200 })
    ))

    await applyAiSuggestion('token', 1, 31)
    await rejectAiSuggestion('token', 1, 31)
    await applyAiAnalysisRun('token', 1, 12)
    await rejectAiAnalysisRun('token', 1, 12)

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/trips/1/ai/suggestions/31/apply'), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/trips/1/ai/suggestions/31/reject'), expect.objectContaining({ method: 'PATCH' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/trips/1/ai/analysis-runs/12/apply'), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(4, expect.stringContaining('/api/trips/1/ai/analysis-runs/12/reject'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('translates conflict errors into a user-facing Korean message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 409 }))

    await expect(applyAiSuggestion('token', 1, 31)).rejects.toThrow('서버의 최신 상태를 다시 확인해 주세요.')
  })
})
