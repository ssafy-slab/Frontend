export type AuthUser = {
  userId: number
  email: string
  nickname: string
  role: string
  localAccount: boolean
}

export type AuthResponse = {
  tokenType: string
  accessToken: string
  user: AuthUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type SignupPayload = LoginPayload & {
  nickname: string
}

export type PasswordChangePayload = {
  currentPassword: string
  newPassword: string
}

export type PasswordResetPayload = {
  email: string
  newPassword: string
}

export type OAuthProvider = 'kakao' | 'google' | 'naver'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'

async function requestAuth(path: string, body: LoginPayload | SignupPayload): Promise<AuthResponse> {
  const response = await fetch(new URL(path, apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 400) throw new Error('입력 정보를 다시 확인해주세요.')
    if (response.status === 401) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    if (response.status === 409) throw new Error('이미 가입된 이메일입니다.')
    throw new Error(`인증 요청에 실패했습니다. (${response.status})`)
  }

  return response.json() as Promise<AuthResponse>
}

async function requestWithToken<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 400) throw new Error('현재 비밀번호가 올바르지 않거나 변경할 수 없는 계정입니다.')
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 404) throw new Error('사용자 정보를 찾을 수 없습니다.')
    throw new Error(`사용자 정보 요청에 실패했습니다. (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function login(payload: LoginPayload) {
  return requestAuth('/api/auth/login', payload)
}

export function signup(payload: SignupPayload) {
  return requestAuth('/api/auth/signup', payload)
}

export function getOAuthAuthorizeUrl(provider: OAuthProvider) {
  return new URL(`/api/oauth/${provider}/authorize`, apiBaseUrl).toString()
}

export function getDisplayEmail(email?: string) {
  if (!email) return '로그인하면 이용할 수 있습니다.'
  if (email.startsWith('kakao_') && email.endsWith('@oauth.slap.local')) return '카카오 소셜 로그인'
  if (email.endsWith('@oauth.slap.local')) return '소셜 로그인 계정'
  return email
}

export function updateProfile(token: string, payload: { nickname: string }) {
  return requestWithToken<AuthUser>('/api/users/me', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function changePassword(token: string, payload: PasswordChangePayload) {
  return requestWithToken<void>('/api/users/me/password', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function resetPassword(payload: PasswordResetPayload) {
  const response = await fetch(new URL('/api/auth/password/reset', apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.ok) return
  if (response.status === 400) throw new Error('비밀번호를 재설정할 수 없는 계정이거나 입력값이 올바르지 않습니다.')
  if (response.status === 404) throw new Error('해당 이메일의 일반 계정을 찾을 수 없습니다.')
  throw new Error(`비밀번호 재설정에 실패했습니다. (${response.status})`)
}

export async function verifyPasswordResetEmail(email: string) {
  const response = await fetch(new URL('/api/auth/password/reset/verify-email', apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (response.ok) return
  if (response.status === 400) throw new Error('소셜 로그인 계정은 비밀번호를 재설정할 수 없습니다.')
  if (response.status === 404) throw new Error('해당 이메일의 일반 계정을 찾을 수 없습니다.')
  throw new Error(`이메일 확인에 실패했습니다. (${response.status})`)
}

export function deleteAccount(token: string) {
  return requestWithToken<void>('/api/users/me', token, { method: 'DELETE' })
}
