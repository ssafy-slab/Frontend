import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authenticatedFetch,
  configureAuthSession,
  resetAuthenticatedFetchForTests,
} from './authenticatedFetch'

const session = {
  tokenType: 'Bearer',
  accessToken: 'rotated-token',
  user: {
    userId: 1,
    email: 'user@test.com',
    nickname: 'user',
    role: 'USER',
    localAccount: true,
  },
}

afterEach(() => {
  resetAuthenticatedFetchForTests()
  vi.restoreAllMocks()
})

describe('authenticatedFetch', () => {
  it('refreshes once and retries a 401 request with the rotated access token', async () => {
    let currentToken = 'expired-token'
    configureAuthSession({
      getAccessToken: () => currentToken,
      applySession: (next) => { currentToken = next.accessToken },
      clearSession: vi.fn(),
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const response = await authenticatedFetch('https://api.test/items', {
      headers: { Authorization: 'Bearer expired-token' },
    })

    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]).toEqual([
      expect.stringContaining('/api/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-Refresh-Request': 'true' }),
      }),
    ])
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe('Bearer rotated-token')
  })

  it('coalesces concurrent refresh requests', async () => {
    let currentToken = 'expired-token'
    configureAuthSession({
      getAccessToken: () => currentToken,
      applySession: (next) => { currentToken = next.accessToken },
      clearSession: vi.fn(),
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/auth/refresh')) return new Response(JSON.stringify(session), { status: 200 })
      const token = new Headers(init?.headers).get('Authorization')
      return token === 'Bearer rotated-token'
        ? new Response('{}', { status: 200 })
        : new Response(null, { status: 401 })
    })

    await Promise.all([
      authenticatedFetch('https://api.test/one', { headers: { Authorization: 'Bearer expired-token' } }),
      authenticatedFetch('https://api.test/two', { headers: { Authorization: 'Bearer expired-token' } }),
    ])

    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/auth/refresh'))).toHaveLength(1)
  })

  it('clears the session when refresh fails and does not loop', async () => {
    const clearSession = vi.fn()
    configureAuthSession({
      getAccessToken: () => 'expired-token',
      applySession: vi.fn(),
      clearSession,
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))

    const response = await authenticatedFetch('https://api.test/items', {
      headers: { Authorization: 'Bearer expired-token' },
    })

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(clearSession).toHaveBeenCalledOnce()
  })
})
