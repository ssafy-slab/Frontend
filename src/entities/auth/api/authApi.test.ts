import { afterEach, describe, expect, it, vi } from 'vitest'
import { startOAuthAuthorize } from './authApi'

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
