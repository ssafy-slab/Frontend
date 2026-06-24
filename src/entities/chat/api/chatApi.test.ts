import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildChatSocketUrl, createChatMessagePayload, createChatSubscribePayload, fetchChatMessages } from './chatApi'
import type { ChatSocketMessage } from './chatApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('chatApi', () => {
  it('loads recent trip chat messages with auth and limit', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            messageId: 10,
            tripId: 1,
            senderUserId: 8,
            senderNickname: '경석',
            messageType: 'TEXT',
            content: '안녕',
            createdAt: '2026-06-22T13:35:00',
          },
        ]),
        { status: 200 },
      ),
    )

    const messages = await fetchChatMessages('token', 1, 50)

    expect(messages[0]?.content).toBe('안녕')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/chats/trips/1/messages?limit=50'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('builds a websocket url from the api base url and token', () => {
    const url = buildChatSocketUrl('http://localhost:8080', 'abc token')

    expect(url).toBe('ws://localhost:8080/ws/chats?token=abc%20token')
  })

  it('creates websocket payloads for subscribe and chat messages', () => {
    expect(createChatSubscribePayload(1)).toEqual({ type: 'SUBSCRIBE', tripId: 1 })
    expect(createChatMessagePayload(1, '안녕')).toEqual({ type: 'CHAT', tripId: 1, content: '안녕' })
  })

  it('represents an AI analysis no-result websocket event', () => {
    const message: ChatSocketMessage = {
      type: 'AI_ANALYSIS_NO_RESULT',
      tripId: 1,
      analysisRunId: 12,
      reasonCode: 'NO_SCHEDULE_CONTEXT',
      message: '메시지가 너무 적거나 일정 관련 내용이 없어 제안을 만들지 못했습니다.',
    }

    expect(message.type).toBe('AI_ANALYSIS_NO_RESULT')
  })
})
