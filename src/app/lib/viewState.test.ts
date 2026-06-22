import { describe, expect, it, vi } from 'vitest'
import { loadViewState, replaceViewHash, saveViewState, viewFromHash, viewToHash } from './viewState'

describe('viewState', () => {
  it('maps views to URL hashes', () => {
    expect(viewToHash('home')).toBe('')
    expect(viewToHash('schedule')).toBe('#/schedule')
    expect(viewFromHash('#/schedule-detail')).toBe('schedule-detail')
    expect(viewFromHash('#/unknown')).toBeNull()
  })

  it('restores the saved view and selected detail data after refresh', () => {
    const storage = new Map<string, string>()
    saveViewState(
      {
        setItem: (key, value) => storage.set(key, value),
      },
      {
        activeView: 'schedule-detail',
        selectedPlace: null,
        selectedTrip: {
          id: 7,
          title: 'team trip',
          destination: 'team',
          period: '2026-07-01 - 2026-07-02',
          description: 'trip',
          image: '',
          members: [],
          status: 'PLANNING',
          tripType: 'TEAM',
          startDate: '2026-07-01',
          endDate: '2026-07-02',
          phase: 'upcoming',
        },
        selectedCommunityPostId: null,
        editingCommunityPostId: null,
      },
    )

    const restored = loadViewState({ getItem: (key) => storage.get(key) ?? null }, '')

    expect(restored.activeView).toBe('schedule-detail')
    expect(restored.selectedTrip?.id).toBe(7)
  })

  it('prefers the URL hash over saved active view', () => {
    const restored = loadViewState(
      { getItem: () => JSON.stringify({ activeView: 'schedule' }) },
      '#/community',
    )

    expect(restored.activeView).toBe('community')
  })

  it('replaces the current URL hash without adding history entries', () => {
    const replaceState = vi.fn()

    replaceViewHash({ replaceState }, '/app', '?tab=1', 'profile')

    expect(replaceState).toHaveBeenCalledWith(null, '', '/app?tab=1#/profile')
  })
})
