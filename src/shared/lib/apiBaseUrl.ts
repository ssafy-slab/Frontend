const defaultApiBaseUrl = 'http://localhost:8080'

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function resolveApiBaseUrl(configuredBaseUrl?: string, browserLocation: Location | null = globalThis.location ?? null) {
  const baseUrl = configuredBaseUrl || defaultApiBaseUrl
  if (!browserLocation || isLoopbackHost(browserLocation.hostname)) return baseUrl

  const url = new URL(baseUrl)
  if (!isLoopbackHost(url.hostname)) return baseUrl

  url.hostname = browserLocation.hostname
  return url.toString().replace(/\/$/, '')
}

export const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined)
