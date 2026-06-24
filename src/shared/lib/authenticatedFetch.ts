import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'

export type AuthSession = {
  tokenType: string
  accessToken: string
  user: {
    userId: number
    email: string
    nickname: string
    role: string
    localAccount: boolean
  }
}

export type AuthSessionPayload = Omit<AuthSession, 'user'> & {
  user: Omit<AuthSession['user'], 'localAccount'> & {
    localAccount?: boolean
    oauthUser?: boolean
  }
}

type AuthSessionHandlers = {
  getAccessToken: () => string
  applySession: (session: AuthSession) => void
  clearSession: () => void
}

let handlers: AuthSessionHandlers = {
  getAccessToken: () => '',
  applySession: () => undefined,
  clearSession: () => undefined,
}
let refreshPromise: Promise<AuthSession> | null = null

export function configureAuthSession(nextHandlers: AuthSessionHandlers) {
  handlers = nextHandlers
}

export function normalizeAuthSession(session: AuthSessionPayload): AuthSession {
  return {
    ...session,
    user: {
      ...session.user,
      localAccount: typeof session.user.localAccount === 'boolean'
        ? session.user.localAccount
        : !session.user.oauthUser,
    },
  }
}

export async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(new URL('/api/auth/refresh', apiBaseUrl).toString(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Refresh-Request': 'true' },
      })
      if (!response.ok) throw new Error('로그인 세션을 갱신하지 못했습니다.')
      const session = normalizeAuthSession(await response.json() as AuthSessionPayload)
      handlers.applySession(session)
      return session
    })().catch((error) => {
      handlers.clearSession()
      throw error
    }).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function logoutAuthSession() {
  const response = await fetch(new URL('/api/auth/logout', apiBaseUrl).toString(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Refresh-Request': 'true' },
  })
  if (!response.ok) throw new Error(`로그아웃 요청에 실패했습니다. (${response.status})`)
}

function withAuthentication(init: RequestInit, token: string) {
  const headers: Record<string, string> = {}
  new Headers(init.headers).forEach((value, key) => {
    if (key === 'authorization') headers.Authorization = value
    else if (key === 'content-type') headers['Content-Type'] = value
    else headers[key] = value
  })
  if (token) headers.Authorization = `Bearer ${token}`
  return {
    ...init,
    credentials: 'include' as const,
    headers,
  }
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const initialToken = handlers.getAccessToken()
    || new Headers(init.headers).get('Authorization')?.replace(/^Bearer\s+/i, '')
    || ''
  const response = await fetch(input, withAuthentication(init, initialToken))
  if (response.status !== 401 || !initialToken) return response

  try {
    const session = await refreshAuthSession()
    return fetch(input, withAuthentication(init, session.accessToken))
  } catch {
    return response
  }
}

export function resetAuthenticatedFetchForTests() {
  handlers = {
    getAccessToken: () => '',
    applySession: () => undefined,
    clearSession: () => undefined,
  }
  refreshPromise = null
}
