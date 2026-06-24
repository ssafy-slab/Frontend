import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth'

const { logoutSession, refreshSession } = vi.hoisted(() => ({
  logoutSession: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('@/entities/auth/api/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/auth/api/authApi')>()
  return {
    ...actual,
    logoutSession,
    refreshSession,
  }
})

const refreshedSession = {
  tokenType: 'Bearer',
  accessToken: 'refreshed-token',
  user: {
    userId: 7,
    email: 'user@test.com',
    nickname: 'user',
    role: 'USER',
    localAccount: true,
  },
}

describe('auth store refresh lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('restores the session from the refresh cookie', async () => {
    refreshSession.mockResolvedValue(refreshedSession)
    const store = useAuthStore()

    await store.restoreSession()

    expect(store.accessToken).toBe('refreshed-token')
    expect(store.user?.userId).toBe(7)
    expect(JSON.parse(window.localStorage.getItem('slap-auth') ?? '{}').accessToken).toBe('refreshed-token')
  })

  it('clears stale local auth when session restoration fails', async () => {
    window.localStorage.setItem('slap-auth', JSON.stringify(refreshedSession))
    setActivePinia(createPinia())
    refreshSession.mockRejectedValue(new Error('expired'))
    const store = useAuthStore()

    await store.restoreSession()

    expect(store.accessToken).toBe('')
    expect(store.user).toBeNull()
    expect(window.localStorage.getItem('slap-auth')).toBeNull()
  })

  it('clears local auth even when server logout fails', async () => {
    window.localStorage.setItem('slap-auth', JSON.stringify(refreshedSession))
    setActivePinia(createPinia())
    logoutSession.mockRejectedValue(new Error('network'))
    const store = useAuthStore()

    await store.logout()

    expect(store.accessToken).toBe('')
    expect(store.user).toBeNull()
    expect(window.localStorage.getItem('slap-auth')).toBeNull()
  })
})
