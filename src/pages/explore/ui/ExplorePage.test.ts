import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExplorePage from './ExplorePage.vue'

function waitForFilterReload() {
  return new Promise((resolve) => window.setTimeout(resolve, 0))
}

const { fetchPlaces, fetchPlaceFilters } = vi.hoisted(() => ({
  fetchPlaces: vi.fn(),
  fetchPlaceFilters: vi.fn(),
}))
const { createTripSchedule, fetchTripSchedules, updateTripSchedule } = vi.hoisted(() => ({
  createTripSchedule: vi.fn(),
  fetchTripSchedules: vi.fn(),
  updateTripSchedule: vi.fn(),
}))

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchPlaces, fetchPlaceFilters }
})

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return { ...actual, createTripSchedule, fetchTripSchedules, updateTripSchedule }
})

describe('ExplorePage review sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })
    fetchPlaceFilters.mockResolvedValue({ categories: [], regions: [] })
    fetchPlaces.mockResolvedValue({
      content: [],
      totalElements: 0,
      page: 0,
      size: 20,
      hasNext: false,
    })
  })

  it('toggles a selected sort and returns to the normal order', async () => {
    const wrapper = mount(ExplorePage, {
      props: {
        accessToken: '',
        trips: [],
      },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    const recommended = wrapper.get('button[aria-pressed="false"]')
    await recommended.trigger('click')
    await waitForFilterReload()
    await flushPromises()
    expect(fetchPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'recommended' }))

    await recommended.trigger('click')
    await waitForFilterReload()
    await flushPromises()
    expect(fetchPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ sort: undefined }))
  })

  it('uses tokenized search for the explore search form', async () => {
    const wrapper = mount(ExplorePage, {
      props: {
        accessToken: '',
        trips: [],
      },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('form input').setValue('강릉 카페')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchPlaces).toHaveBeenLastCalledWith(
      expect.objectContaining({
        keyword: '강릉 카페',
        searchMode: 'tokenized',
      }),
    )
  })

  it('offers ticket-style keep or replace choices for a same-time place conflict', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1,
        title: '성심당문화원',
        location: '대전광역시 중구',
        category: '음식점',
        rawCategory: '음식점',
        description: '성심당 문화 공간',
        image: '/images/default-place.svg',
        thumbnailImage: '/images/default-place.svg',
        detailImage: '/images/default-place.svg',
        rating: 0,
        reviewCount: '0',
        tags: [],
        marker: { top: '50%', left: '50%' },
        coordinates: { lat: 36.32, lng: 127.42 },
        address: '대전광역시 중구',
        regionId: 1,
        regionName: '중구',
        regionFullName: '대전광역시 중구',
      }],
      totalElements: 1,
      page: 0,
      size: 20,
      hasNext: false,
    })
    fetchTripSchedules.mockResolvedValue([{
      scheduleItemId: 77,
      tripId: 10,
      placeId: 2,
      createdByUserId: 1,
      dayNo: 1,
      scheduleDate: '2026-07-01',
      startTime: '13:00:00',
      endTime: '14:00:00',
      title: '기존 여행지',
      memo: null,
      sortOrder: 1,
      createdAt: '2026-06-24T00:00:00',
      updatedAt: '2026-06-24T00:00:00',
    }])
    updateTripSchedule.mockResolvedValue({})

    const wrapper = mount(ExplorePage, {
      props: {
        accessToken: 'token',
        trips: [{
          id: 10,
          title: '대전 여행',
          destination: '팀 여행',
          period: '2026-07-01 - 2026-07-02',
          description: '',
          image: '',
          members: ['나'],
          status: 'PLANNING',
          tripType: 'TEAM',
          startDate: '2026-07-01',
          endDate: '2026-07-02',
          phase: 'upcoming',
        }],
      },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('article').trigger('click')
    await wrapper.get('[data-testid="open-add-place-1"]').trigger('click')
    await wrapper.get('[data-testid="confirm-add-place"]').trigger('click')
    await flushPromises()

    const modal = wrapper.get('[data-testid="replace-place-modal"]')
    expect(modal.text()).toContain('여행지를 변경하시겠습니까?')
    expect(modal.text()).toContain('기존 여행지')
    expect(modal.text()).toContain('성심당문화원')
    expect(wrapper.get('[data-testid="keep-existing-schedule"]').text()).toContain('기존 일정 유지')
    expect(wrapper.get('[data-testid="confirm-replace-place"]').text()).toContain('여행지 변경')
    expect(wrapper.get('[data-testid="replace-ticket-current"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="replace-ticket-new"]')).toBeTruthy()

    await wrapper.get('[data-testid="confirm-replace-place"]').trigger('click')
    await flushPromises()

    expect(updateTripSchedule).toHaveBeenCalledWith(
      'token',
      10,
      77,
      expect.objectContaining({ placeId: 1, title: '성심당문화원', startTime: '13:00:00' }),
    )
    expect(createTripSchedule).not.toHaveBeenCalled()
  })
})
