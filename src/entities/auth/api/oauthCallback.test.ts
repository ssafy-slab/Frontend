import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleOAuthCallbackRedirect } from './oauthCallback'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleOAuthCallbackRedirect', () => {
  it('exchanges the callback ticket, stores auth, and removes the ticket URL', async () => {
    const stored: Record<string, string> = {}
    const replaced: string[] = []
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tokenType: 'Bearer',
          accessToken: 'abc123',
          user: {
            userId: 7,
            email: 'user@test.com',
            nickname: 'user',
            role: 'USER',
            localAccount: false,
          },
        }),
        { status: 200 },
      ),
    )

    const handled = await handleOAuthCallbackRedirect({
      pathname: '/oauth/callback',
      search: '?ticket=one-time-ticket',
      storage: {
        setItem(key, value) {
          stored[key] = value
        },
      },
      fetch: fetchMock,
      replace(url) {
        replaced.push(url)
      },
    })

    expect(handled).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/oauth/token'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: 'one-time-ticket' }),
      }),
    )
    expect(stored['slap-auth']).toBeDefined()
    expect(JSON.parse(stored['slap-auth']!)).toEqual({
      tokenType: 'Bearer',
      accessToken: 'abc123',
      user: {
        userId: 7,
        email: 'user@test.com',
        nickname: 'user',
        role: 'USER',
        localAccount: false,
      },
    })
    expect(replaced).toEqual(['/'])
  })

  it('redirects to login when the callback has no ticket', async () => {
    const replaced: string[] = []

    const handled = await handleOAuthCallbackRedirect({
      pathname: '/oauth/callback',
      search: '',
      storage: { setItem() {} },
      fetch: vi.fn(),
      replace(url) {
        replaced.push(url)
      },
    })

    expect(handled).toBe(true)
    expect(replaced).toEqual(['/login'])
  })

  it('redirects to login when ticket exchange fails', async () => {
    const replaced: string[] = []

    const handled = await handleOAuthCallbackRedirect({
      pathname: '/oauth/callback',
      search: '?ticket=expired-ticket',
      storage: { setItem() {} },
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
      replace(url) {
        replaced.push(url)
      },
    })

    expect(handled).toBe(true)
    expect(replaced).toEqual(['/login'])
  })

  it('does nothing outside the callback path', async () => {
    const handled = await handleOAuthCallbackRedirect({
      pathname: '/',
      search: '?ticket=one-time-ticket',
      storage: { setItem() {} },
      fetch: vi.fn(),
      replace() {},
    })

    expect(handled).toBe(false)
  })
})
