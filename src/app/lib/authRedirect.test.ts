import { describe, expect, it } from 'vitest'
import { resolveAuthenticatedView } from './authRedirect'

describe('resolveAuthenticatedView', () => {
  it('sends users to home after a successful login or signup', () => {
    expect(resolveAuthenticatedView()).toBe('home')
  })
})
