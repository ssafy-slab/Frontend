import { afterEach, describe, expect, it, vi } from 'vitest'
import { login, logoutSession, refreshSession, startOAuthAuthorize } from './authApi'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('startOAuthAuthorize', () => {
  it('starts OAuth login with a POST form submit so browser redirects can continue', () => {
    const submit = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = originalCreateElement(tagName, options)
      if (tagName.toLowerCase() === 'form') {
        Object.defineProperty(element, 'submit', { value: submit })
      }
      return element
    })

    startOAuthAuthorize('kakao')

    const form = document.body.querySelector('form')
    expect(form).not.toBeNull()
    expect(form?.method).toBe('post')
    expect(form?.action).toContain('/api/oauth/kakao/authorize')
    expect(form?.style.display).toBe('none')
    expect(submit).toHaveBeenCalledOnce()
  })
})

describe('refresh token API', () => {
  it('includes cookies when logging in', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        tokenType: 'Bearer',
        accessToken: 'access',
        user: {
          userId: 1,
          email: 'user@test.com',
          nickname: 'user',
          role: 'USER',
          localAccount: true,
        },
      }), { status: 200 }),
    )

    await login({ email: 'user@test.com', password: 'password1' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('normalizes the documented oauthUser flag for the existing profile UI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        tokenType: 'Bearer',
        accessToken: 'access',
        user: {
          userId: 1,
          email: 'oauth@test.com',
          nickname: 'oauth',
          role: 'USER',
          oauthUser: true,
        },
      }), { status: 200 }),
    )

    const response = await login({ email: 'oauth@test.com', password: 'password1' })

    expect(response.user.localAccount).toBe(false)
  })

  it('refreshes and logs out with the protected refresh header and cookie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tokenType: 'Bearer',
        accessToken: 'rotated',
        user: {
          userId: 1,
          email: 'user@test.com',
          nickname: 'user',
          role: 'USER',
          localAccount: true,
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await refreshSession()
    await logoutSession()

    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-Refresh-Request': 'true' }),
      }))
    }
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/auth/refresh')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/auth/logout')
  })
})
