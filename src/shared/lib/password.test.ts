import { describe, expect, it } from 'vitest'
import { getPasswordChecks, isPasswordValid } from './password'

describe('password validation', () => {
  it('requires length, a letter, and a number', () => {
    expect(getPasswordChecks('password')).toEqual([
      { label: '8자 이상', valid: true },
      { label: '영문 포함', valid: true },
      { label: '숫자 포함', valid: false },
    ])
  })

  it('accepts a password that satisfies every rule', () => {
    expect(isPasswordValid('password1')).toBe(true)
  })
})
