import type { AuthResponse } from './authApi'
import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'
import { normalizeAuthSession, type AuthSessionPayload } from '@/shared/lib/authenticatedFetch'

const authStorageKey = 'slap-auth'
const viewStorageKey = 'slap-view-state'

type OAuthCallbackRedirectOptions = {
  pathname: string
  search: string
  storage: Pick<Storage, 'setItem'>
  viewStorage?: Pick<Storage, 'removeItem'>
  fetch: typeof fetch
  replace: (url: string) => void
}

async function exchangeOAuthTicket(ticket: string, fetcher: typeof fetch) {
  const response = await fetcher(new URL('/api/oauth/token', apiBaseUrl).toString(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  })

  if (!response.ok) {
    throw new Error('OAuth ticket exchange failed')
  }

  return normalizeAuthSession(await response.json() as AuthSessionPayload) as AuthResponse
}

export async function handleOAuthCallbackRedirect(options: OAuthCallbackRedirectOptions) {
  if (options.pathname !== '/oauth/callback') return false

  const ticket = new URLSearchParams(options.search).get('ticket')
  if (!ticket) {
    options.replace('/login')
    return true
  }

  try {
    const auth = await exchangeOAuthTicket(ticket, options.fetch)
    options.storage.setItem(authStorageKey, JSON.stringify(auth))
    options.viewStorage?.removeItem(viewStorageKey)
    options.replace('/')
  } catch {
    options.replace('/login')
  }

  return true
}
