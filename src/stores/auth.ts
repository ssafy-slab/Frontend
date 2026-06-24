import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import * as authApi from '@/entities/auth/api/authApi'
import type { AuthResponse, AuthUser, LoginPayload, OAuthProvider, PasswordChangePayload, SignupPayload } from '@/entities/auth/api/authApi'
import { configureAuthSession } from '@/shared/lib/authenticatedFetch'

const storageKey = 'slap-auth'

type StoredAuth = {
  accessToken: string
  tokenType: string
  user: AuthUser
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredAuth
    if (typeof stored.user?.localAccount !== 'boolean') {
      window.localStorage.removeItem(storageKey)
      return null
    }
    return stored
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = loadStoredAuth()
  const accessToken = ref(stored?.accessToken ?? '')
  const tokenType = ref(stored?.tokenType ?? 'Bearer')
  const user = ref<AuthUser | null>(stored?.user ?? null)
  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  function persist() {
    if (!accessToken.value || !user.value) {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        accessToken: accessToken.value,
        tokenType: tokenType.value,
        user: user.value,
      }),
    )
  }

  function applyAuth(response: authApi.AuthResponse) {
    accessToken.value = response.accessToken
    tokenType.value = response.tokenType
    user.value = response.user
    persist()
    return response.user
  }

  function clearLocalAuth() {
    accessToken.value = ''
    tokenType.value = 'Bearer'
    user.value = null
    persist()
  }

  configureAuthSession({
    getAccessToken: () => accessToken.value,
    applySession: applyAuth,
    clearSession: clearLocalAuth,
  })

  async function login(payload: LoginPayload) {
    return applyAuth(await authApi.login(payload))
  }

  async function signup(payload: SignupPayload) {
    return applyAuth(await authApi.signup(payload))
  }

  function startOAuthLogin(provider: OAuthProvider) {
    authApi.startOAuthAuthorize(provider)
  }

  function applyOAuthCallback(response: AuthResponse) {
    return applyAuth(response)
  }

  async function updateProfile(payload: { nickname: string }) {
    if (!accessToken.value) throw new Error('로그인이 필요합니다.')
    user.value = await authApi.updateProfile(accessToken.value, payload)
    persist()
    return user.value
  }

  async function deleteAccount() {
    if (!accessToken.value) throw new Error('로그인이 필요합니다.')
    await authApi.deleteAccount(accessToken.value)
    await logout()
  }

  async function changePassword(payload: PasswordChangePayload) {
    if (!accessToken.value) throw new Error('로그인이 필요합니다.')
    await authApi.changePassword(accessToken.value, payload)
  }

  async function restoreSession() {
    try {
      applyAuth(await authApi.refreshSession())
    } catch {
      clearLocalAuth()
    }
  }

  async function logout() {
    try {
      await authApi.logoutSession()
    } catch {
      // Local authentication must still be cleared if the server is unreachable.
    } finally {
      clearLocalAuth()
    }
  }

  return {
    accessToken,
    tokenType,
    user,
    isAuthenticated,
    login,
    signup,
    startOAuthLogin,
    applyOAuthCallback,
    updateProfile,
    changePassword,
    deleteAccount,
    restoreSession,
    logout,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
