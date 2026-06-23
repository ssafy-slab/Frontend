import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'

export type AiSuggestionStatus = 'PENDING' | 'APPLIED' | 'REJECTED'
export type AiAnalysisTriggerType = 'BUTTON' | 'AUTO'

export type AiSuggestion = {
  aiSuggestionId: number
  analysisRunId: number
  suggestedPlaceId: number | null
  suggestedPlaceName: string | null
  suggestedRegionHint: string | null
  title: string
  summary: string | null
  reason: string | null
  scheduleDate: string
  startTime: string
  endTime: string | null
  dayNo: number | null
  sortOrder: number | null
  status: AiSuggestionStatus
  appliedScheduleItemId: number | null
  createdAt: string | null
  appliedAt: string | null
}

export type AiAnalysisResponse = {
  analysisRunId: number
  triggerType: AiAnalysisTriggerType
  status: 'SUCCEEDED'
  suggestions: AiSuggestion[]
}

export type AiAnalysisRequest = {
  messageLimit?: number
  additionalRequest?: string | null
}

function getAiErrorMessage(status: number) {
  if (status === 400) return '분석할 새 채팅이 없거나 요청 내용을 확인해 주세요.'
  if (status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  if (status === 403) return '이 여행의 AI 일정을 관리할 권한이 없습니다.'
  if (status === 404) return '처리할 AI 일정 제안을 찾지 못했습니다.'
  if (status === 409) return '요청이 현재 서버 상태와 충돌했습니다. 서버의 최신 상태를 다시 확인해 주세요.'
  if (status === 502) return 'AI가 일정 제안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (status === 503) return 'AI 서버에 일시적으로 연결할 수 없습니다.'
  return `AI 일정 요청을 처리하지 못했습니다. (${status})`
}

async function requestAi<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl).toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) throw new Error(getAiErrorMessage(response.status))
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function analyzeTripChat(token: string, tripId: number, request?: AiAnalysisRequest) {
  return requestAi<AiAnalysisResponse>(`/api/trips/${tripId}/ai/schedule-drafts`, token, {
    method: 'POST',
    ...(request ? { body: JSON.stringify(request) } : {}),
  })
}

export function getAiSuggestions(token: string, tripId: number, status: AiSuggestionStatus = 'PENDING') {
  const path = `/api/trips/${tripId}/ai/suggestions?status=${encodeURIComponent(status)}`
  return requestAi<AiSuggestion[]>(path, token)
}

export function applyAiSuggestion(token: string, tripId: number, suggestionId: number) {
  return requestAi<AiSuggestion>(`/api/trips/${tripId}/ai/suggestions/${suggestionId}/apply`, token, {
    method: 'POST',
  })
}

export function rejectAiSuggestion(token: string, tripId: number, suggestionId: number) {
  return requestAi<AiSuggestion>(`/api/trips/${tripId}/ai/suggestions/${suggestionId}/reject`, token, {
    method: 'PATCH',
  })
}

export function applyAiAnalysisRun(token: string, tripId: number, analysisRunId: number) {
  return requestAi<AiSuggestion[]>(`/api/trips/${tripId}/ai/analysis-runs/${analysisRunId}/apply`, token, {
    method: 'POST',
  })
}

export function rejectAiAnalysisRun(token: string, tripId: number, analysisRunId: number) {
  return requestAi<AiSuggestion[]>(`/api/trips/${tripId}/ai/analysis-runs/${analysisRunId}/reject`, token, {
    method: 'PATCH',
  })
}
