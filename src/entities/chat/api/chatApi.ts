import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'
import { authenticatedFetch } from '@/shared/lib/authenticatedFetch'

export type ChatMessageResponse = {
  messageId: number
  tripId: number
  senderUserId: number
  senderNickname: string
  messageType: 'TEXT' | string
  content: string
  createdAt: string
}

export type AiAnalysisNoResultReason =
  | 'INSUFFICIENT_MESSAGES'
  | 'NO_SCHEDULE_CONTEXT'

export type ChatSocketMessage =
  | {
      type: 'SUBSCRIBED'
      tripId: number
      message: null
      error: null
    }
  | {
      type: 'MESSAGE'
      tripId: number
      message: ChatMessageResponse
      error: null
    }
  | {
      type: 'ERROR'
      tripId: number | null
      message: null
      error: string
    }
  | {
      type: 'AI_ANALYSIS_COMPLETED'
      tripId: number
      analysisRunId: number
    }
  | {
      type: 'AI_ANALYSIS_NO_RESULT'
      tripId: number
      analysisRunId: number
      reasonCode: AiAnalysisNoResultReason
      message: string
    }

export async function fetchChatMessages(token: string, tripId: number, limit = 50) {
  const url = new URL(`/api/chats/trips/${tripId}/messages`, apiBaseUrl)
  url.searchParams.set('limit', String(limit))

  const response = await authenticatedFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 403) throw new Error('채팅방에 접근할 수 없습니다.')
    throw new Error(`채팅 메시지를 불러오지 못했습니다. (${response.status})`)
  }

  return response.json() as Promise<ChatMessageResponse[]>
}

export function buildChatSocketUrl(baseUrl: string, token: string) {
  const url = new URL('/ws/chats', baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${url.toString()}?token=${encodeURIComponent(token)}`
}

export function getChatSocketUrl(token: string) {
  return buildChatSocketUrl(apiBaseUrl, token)
}

export function createChatSubscribePayload(tripId: number) {
  return { type: 'SUBSCRIBE', tripId }
}

export function createChatMessagePayload(tripId: number, content: string) {
  return { type: 'CHAT', tripId, content }
}
