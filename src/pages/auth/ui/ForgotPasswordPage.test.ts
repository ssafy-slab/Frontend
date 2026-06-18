import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage.vue'
import { verifyPasswordResetEmail } from '@/entities/auth/api/authApi'

vi.mock('@/entities/auth/api/authApi', () => ({
  resetPassword: vi.fn(),
  verifyPasswordResetEmail: vi.fn(),
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows email first and password fields after continuing', async () => {
    vi.mocked(verifyPasswordResetEmail).mockResolvedValue(undefined)
    const wrapper = mount(ForgotPasswordPage)

    expect(wrapper.find('[data-test="email-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="password-step"]').exists()).toBe(false)

    await wrapper.get('input[type="email"]').setValue('test@example.com')
    await wrapper.get('[data-test="continue-button"]').trigger('click')

    expect(wrapper.find('[data-test="email-step"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="password-step"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('stays on the email step when the account does not exist', async () => {
    vi.mocked(verifyPasswordResetEmail).mockRejectedValue(new Error('해당 이메일의 일반 계정을 찾을 수 없습니다.'))
    const wrapper = mount(ForgotPasswordPage)

    await wrapper.get('input[type="email"]').setValue('missing@example.com')
    await wrapper.get('[data-test="continue-button"]').trigger('click')

    expect(wrapper.find('[data-test="email-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="password-step"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('해당 이메일의 일반 계정을 찾을 수 없습니다.')
  })
})
