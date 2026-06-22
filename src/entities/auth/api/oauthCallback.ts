import type { AuthResponse } from './authApi'
import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'

const authStorageKey = 'slap-auth'

type OAuthCallbackRedirectOptions = {
  pathname: string
  search: string
  storage: Pick<Storage, 'setItem'>
  fetch: typeof fetch
  replace: (url: string) => void
}

async function exchangeOAuthTicket(ticket: string, fetcher: typeof fetch) {
  const response = await fetcher(new URL('/api/oauth/token', apiBaseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  })

  if (!response.ok) {
    throw new Error('OAuth ticket exchange failed')
  }

  return response.json() as Promise<AuthResponse>
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
    options.replace('/')
  } catch {
    options.replace('/login')
  }

  return true
}
