import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './apiBaseUrl'

function locationWithHostname(hostname: string) {
  return { hostname } as Location
}

describe('resolveApiBaseUrl', () => {
  it('keeps localhost api url on the same development machine', () => {
    expect(resolveApiBaseUrl('http://localhost:8080', locationWithHostname('localhost'))).toBe('http://localhost:8080')
  })

  it('rewrites localhost api url to the current LAN host for another computer', () => {
    expect(resolveApiBaseUrl('http://localhost:8080', locationWithHostname('192.168.0.23'))).toBe('http://192.168.0.23:8080')
  })

  it('keeps explicitly configured remote api hosts', () => {
    expect(resolveApiBaseUrl('https://api.example.com', locationWithHostname('192.168.0.23'))).toBe('https://api.example.com')
  })
})
