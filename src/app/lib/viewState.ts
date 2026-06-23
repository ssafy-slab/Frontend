import type { Place, Trip } from '@/entities/travel/model/travel'

export type ViewName =
  | 'home'
  | 'explore'
  | 'place-detail'
  | 'schedule'
  | 'schedule-detail'
  | 'community'
  | 'community-write'
  | 'community-detail'
  | 'profile'
  | 'login'
  | 'signup'
  | 'forgot-password'

export type SavedViewState = {
  activeView: ViewName
  selectedPlace: Place | null
  selectedTrip: Trip | null
  selectedCommunityPostId: number | null
  editingCommunityPostId: number | null
}

const storageKey = 'slap-view-state'

const viewNames = new Set<ViewName>([
  'home',
  'explore',
  'place-detail',
  'schedule',
  'schedule-detail',
  'community',
  'community-write',
  'community-detail',
  'profile',
  'login',
  'signup',
  'forgot-password',
])

function isViewName(value: unknown): value is ViewName {
  return typeof value === 'string' && viewNames.has(value as ViewName)
}

export function viewToHash(view: ViewName) {
  return view === 'home' ? '' : `#/${view}`
}

export function viewToPath(view: ViewName) {
  return view === 'home' ? '/' : `/${view}`
}

export function viewFromHash(hash: string): ViewName | null {
  const value = hash.replace(/^#\/?/, '')
  return isViewName(value) ? value : null
}

export function viewFromPath(pathname: string): ViewName | null {
  const value = pathname.replace(/^\/+|\/+$/g, '')
  return value && isViewName(value) ? value : null
}

export function loadViewState(storage: Pick<Storage, 'getItem'>, pathname = '/', hash = ''): Partial<SavedViewState> {
  let saved: Partial<SavedViewState> = {}
  try {
    const raw = storage.getItem(storageKey)
    saved = raw ? JSON.parse(raw) as Partial<SavedViewState> : {}
  } catch {
    saved = {}
  }

  const pathView = viewFromPath(pathname)
  const hashView = viewFromHash(hash)
  const activeView = pathView ?? hashView ?? (isViewName(saved.activeView) ? saved.activeView : undefined)
  return { ...saved, activeView }
}

export function saveViewState(storage: Pick<Storage, 'setItem'>, state: SavedViewState) {
  storage.setItem(storageKey, JSON.stringify(state))
}

export function replaceViewHash(history: Pick<History, 'replaceState'>, pathname: string, search: string, view: ViewName) {
  history.replaceState(null, '', `${pathname}${search}${viewToHash(view)}`)
}

export function replaceViewPath(history: Pick<History, 'replaceState'>, search: string, view: ViewName) {
  history.replaceState(null, '', `${viewToPath(view)}${search}`)
}
