export type ViewChangeResult = {
  view: string
  message?: string
}

export function resolveViewChange(view: string, isAuthenticated: boolean): ViewChangeResult {
  if (view.startsWith('schedule') && !isAuthenticated) {
    return {
      view: 'login',
      message: '일정 기능은 로그인이 필요합니다.',
    }
  }

  return { view }
}
