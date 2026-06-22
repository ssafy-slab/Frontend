import { describe, expect, it } from 'vitest'
import { resolveViewChange } from './navigationGuard'

describe('resolveViewChange', () => {
  it('redirects guests to login when they try to open schedule views', () => {
    expect(resolveViewChange('schedule', false)).toEqual({
      view: 'login',
      message: '일정 기능은 로그인이 필요합니다.',
    })
    expect(resolveViewChange('schedule-detail', false)).toEqual({
      view: 'login',
      message: '일정 기능은 로그인이 필요합니다.',
    })
  })

  it('allows authenticated users to open schedule views', () => {
    expect(resolveViewChange('schedule', true)).toEqual({ view: 'schedule' })
  })

  it('does not block public views for guests', () => {
    expect(resolveViewChange('explore', false)).toEqual({ view: 'explore' })
  })
})
