export function getPasswordChecks(password: string) {
  return [
    { label: '8자 이상', valid: password.length >= 8 },
    { label: '영문 포함', valid: /[A-Za-z]/.test(password) },
    { label: '숫자 포함', valid: /\d/.test(password) },
  ]
}

export function isPasswordValid(password: string) {
  return getPasswordChecks(password).every((item) => item.valid)
}
