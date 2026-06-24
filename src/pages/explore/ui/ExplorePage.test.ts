import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExplorePage from './ExplorePage.vue'

function waitForFilterReload() {
  return new Promise((resolve) => window.setTimeout(resolve, 0))
}

const { fetchPlaces, fetchPlaceFilters, fetchPlaceWeather, fetchPlaceNearbyFacilities } = vi.hoisted(() => ({
  fetchPlaces: vi.fn(),
  fetchPlaceFilters: vi.fn(),
  fetchPlaceWeather: vi.fn(),
  fetchPlaceNearbyFacilities: vi.fn(),
}))
const { fetchPlaceReviews, createPlaceReview, updateMyPlaceReview, deleteMyPlaceReview } = vi.hoisted(() => ({
  fetchPlaceReviews: vi.fn(),
  createPlaceReview: vi.fn(),
  updateMyPlaceReview: vi.fn(),
  deleteMyPlaceReview: vi.fn(),
}))
const { createTripSchedule, fetchTripSchedules, updateTripSchedule } = vi.hoisted(() => ({
  createTripSchedule: vi.fn(),
  fetchTripSchedules: vi.fn(),
  updateTripSchedule: vi.fn(),
}))

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchPlaces, fetchPlaceFilters, fetchPlaceWeather, fetchPlaceNearbyFacilities }
})

vi.mock('@/entities/review/api/reviewApi', () => ({
  fetchPlaceReviews,
  createPlaceReview,
  updateMyPlaceReview,
  deleteMyPlaceReview,
}))

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
    fetchPlaceWeather.mockResolvedValue({ available: false, message: null, forecasts: [], dailyForecasts: [] })
    fetchPlaceNearbyFacilities.mockResolvedValue({ placeId: 1, searchRadiusM: 3000, groups: [] })
    fetchPlaceReviews.mockResolvedValue({ averageRating: 0, reviewCount: 0, reviews: [], myReview: null })
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

  it('opens place details over the map and keeps the all-pins action available', async () => {
    fetchPlaceFilters.mockResolvedValue({
      categories: [{ value: 'FOOD', label: '음식점', placeCount: 1 }],
      regions: [],
    })
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1,
        title: '성심당',
        location: '대전광역시 중구',
        category: '음식점',
        rawCategory: '음식점',
        description: '대전의 대표 빵집',
        image: '/images/default-place.svg',
        thumbnailImage: '/images/default-place.svg',
        detailImage: '/images/default-place.svg',
        rating: 4.8,
        reviewCount: '120',
        tags: ['빵집'],
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

    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="map-category-filters"]').isVisible()).toBe(true)
    await wrapper.get('[data-testid="place-list-item-1"]').trigger('click')

    expect(wrapper.get('[data-testid="place-detail-overlay"]').text()).toContain('성심당')
    expect(wrapper.get('[data-testid="close-place-detail"]').classes()).toContain('absolute')
    expect(wrapper.get('[data-testid="place-detail-like"]').classes()).toContain('shrink-0')
    expect(wrapper.find('[data-testid="map-category-filters"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="show-all-pins"]').text()).toContain('전체 핀 보기')
    expect(wrapper.emitted('openPlace')).toBeUndefined()

    await wrapper.get('[data-testid="close-place-detail"]').trigger('click')
    expect(wrapper.find('[data-testid="place-detail-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-category-filters"]').isVisible()).toBe(true)
  })

  it('opens an externally selected place in the map overlay', async () => {
    const externalPlace = {
      id: 77, title: '외부에서 선택한 장소', location: '서울', category: '관광지', rawCategory: '관광지',
      description: '일정에서 선택됨', image: '/place.jpg', thumbnailImage: '/place.jpg', detailImage: '/place.jpg',
      rating: 4.5, reviewCount: '3', tags: [], marker: { top: '50%', left: '50%' },
      coordinates: { lat: 37.5, lng: 127 }, address: '서울', regionId: 1,
      regionName: '서울', regionFullName: '서울',
    }
    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [], targetPlace: externalPlace },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="place-detail-overlay"]').text()).toContain('외부에서 선택한 장소')
    expect(wrapper.getComponent({ name: 'KakaoMap' }).props('selectedMarkerId')).toBe(77)
  })

  it('loads weather, nearby facilities, and reviews inside the place overlay', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1,
        title: '성심당',
        location: '대전광역시 중구',
        category: '음식점',
        rawCategory: '음식점',
        description: '대전의 대표 빵집',
        image: '/images/default-place.svg',
        thumbnailImage: '/images/default-place.svg',
        detailImage: '/images/default-place.svg',
        rating: 4.8,
        reviewCount: '1',
        tags: [],
        marker: { top: '50%', left: '50%' },
        coordinates: { lat: 36.32, lng: 127.42 },
        address: '대전광역시 중구',
        regionId: 1,
        regionName: '중구',
        regionFullName: '대전광역시 중구',
      }],
      totalElements: 1, page: 0, size: 20, hasNext: false,
    })
    fetchPlaceWeather.mockResolvedValue({
      available: true,
      message: null,
      temperature: 24,
      feelsLikeTemperature: 25,
      precipitationProbability: 10,
      humidity: 55,
      windSpeed: 2,
      precipitationType: 'NONE',
      skyStatus: 'CLEAR',
      precipitationOneHour: null,
      forecastAt: null,
      updatedAt: null,
      forecasts: [],
      dailyForecasts: [],
    })
    fetchPlaceNearbyFacilities.mockResolvedValue({
      placeId: 1,
      searchRadiusM: 3000,
      groups: [{
        facilityType: 'PHARMACY',
        categoryGroupCode: 'PM9',
        label: '약국',
        cached: false,
        facilities: [{ facilityId: 9, facilityType: 'PHARMACY', categoryGroupCode: 'PM9', categoryName: null, facilityName: '중앙약국', phone: null, address: null, roadAddress: null, latitude: null, longitude: null, placeUrl: null, distanceM: 180 }],
      }],
    })
    fetchPlaceReviews.mockResolvedValue({
      averageRating: 5,
      reviewCount: 1,
      myReview: null,
      reviews: [{ reviewId: 3, userId: 2, authorNickname: '여행자', rating: 5, content: '정말 좋아요', createdAt: '2026-06-24T00:00:00', updatedAt: '2026-06-24T00:00:00', mine: false }],
    })

    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="place-list-item-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="place-weather"]').text()).toContain('24.0°C')
    expect(wrapper.get('[data-testid="place-nearby-facilities"]').text()).toContain('중앙약국')
    expect(wrapper.get('[data-testid="place-reviews"]').text()).toContain('정말 좋아요')
    expect(wrapper.get('[data-testid="place-review-card-3"]').classes()).toContain('bg-white')
    expect(wrapper.get('[data-testid="place-review-card-3"]').classes()).not.toContain('border-l-4')
    expect(wrapper.get('[data-testid="place-review-card-3"]').classes()).not.toContain('shadow-sm')
    expect(wrapper.get('[data-testid="place-list-image-fallback-1"]').text()).toContain('이미지 준비 중')
    expect(wrapper.get('[data-testid="place-detail-image-fallback"]').text()).toContain('이미지 준비 중')
    expect(wrapper.find('[data-testid="review-editor-modal"]').exists()).toBe(false)
    await wrapper.get('[data-testid="open-review-editor"]').trigger('click')
    expect(wrapper.get('[data-testid="review-editor-modal"]').text()).toContain('리뷰 작성')
    expect(wrapper.find('[data-testid="place-basic-info"]').exists()).toBe(false)
  })

  it('shows weather through the fourth day and paginates long review lists', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1, title: '성심당', location: '대전', category: '음식점', rawCategory: '음식점',
        description: '빵집', image: '/images/default-place.svg', thumbnailImage: '/images/default-place.svg',
        detailImage: '/images/default-place.svg', rating: 5, reviewCount: '4', tags: [],
        marker: { top: '50%', left: '50%' }, coordinates: { lat: 36.32, lng: 127.42 },
        address: '대전', regionId: 1, regionName: '중구', regionFullName: '대전 중구',
      }],
      totalElements: 1, page: 0, size: 20, hasNext: false,
    })
    fetchPlaceWeather.mockResolvedValue({
      available: true, message: null, temperature: 24, feelsLikeTemperature: 24,
      precipitationProbability: 0, humidity: 50, windSpeed: 1, precipitationType: 'NONE',
      skyStatus: 'CLEAR', precipitationOneHour: null, forecastAt: null, updatedAt: null, forecasts: [],
      dailyForecasts: ['오늘', '내일', '모레', '글피'].map((dayLabel, index) => ({
        forecastDate: `2026-06-${24 + index}`, dayLabel, minTemperature: 18, maxTemperature: 25 + index,
        precipitationProbability: 0, humidity: 50, windSpeed: 1, precipitationType: 'NONE',
        skyStatus: 'CLEAR', updatedAt: null,
      })),
    })
    fetchPlaceReviews.mockResolvedValue({
      averageRating: 5, reviewCount: 4, myReview: null,
      reviews: Array.from({ length: 4 }, (_, index) => ({
        reviewId: index + 1, userId: index + 1, authorNickname: `작성자${index + 1}`, rating: 5,
        content: `리뷰${index + 1}`, createdAt: '2026-06-24T00:00:00', updatedAt: '2026-06-24T00:00:00', mine: false,
      })),
    })

    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="place-list-item-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="place-weather"]').text()).toContain('글피')
    expect(wrapper.get('[data-testid="today-weather-date"]').text()).toContain('오늘')
    expect(wrapper.get('[data-testid="future-weather-grid"]').classes()).toContain('grid-cols-3')
    expect(wrapper.findAll('[data-testid="future-weather-item"]')).toHaveLength(3)
    expect(wrapper.get('[data-testid="future-weather-grid"]').text()).toContain('최저 18.0°')
    expect(wrapper.get('[data-testid="future-weather-grid"]').text()).toContain('최고 26.0°')
    const map = wrapper.getComponent({ name: 'KakaoMap' })
    expect(map.props('markers')[0]).toEqual(expect.objectContaining({ category: '음식점' }))
    expect(wrapper.get('[data-testid="place-reviews"]').text()).toContain('리뷰1')
    expect(wrapper.get('[data-testid="place-reviews"]').text()).not.toContain('리뷰4')
    await wrapper.get('[data-testid="next-review-page"]').trigger('click')
    expect(wrapper.get('[data-testid="place-reviews"]').text()).toContain('리뷰4')
    expect(wrapper.get('[data-testid="previous-review-page"]').attributes('disabled')).toBeUndefined()
  })

  it('renders reviews without waiting for a slow weather response', async () => {
    let resolveWeather!: (value: unknown) => void
    fetchPlaceWeather.mockReturnValue(new Promise((resolve) => { resolveWeather = resolve }))
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1, title: '성심당', location: '대전', category: '음식점', rawCategory: '음식점',
        description: '빵집', image: '/images/default-place.svg', thumbnailImage: '/images/default-place.svg',
        detailImage: '/images/default-place.svg', rating: 5, reviewCount: '1', tags: [],
        marker: { top: '50%', left: '50%' }, coordinates: { lat: 36.32, lng: 127.42 },
        address: '대전', regionId: 1, regionName: '중구', regionFullName: '대전 중구',
      }],
      totalElements: 1, page: 0, size: 20, hasNext: false,
    })
    fetchPlaceReviews.mockResolvedValue({
      averageRating: 5, reviewCount: 1, myReview: null,
      reviews: [{ reviewId: 1, userId: 1, authorNickname: '빠른 리뷰', rating: 5, content: '먼저 보여요', createdAt: '2026-06-24T00:00:00', updatedAt: '2026-06-24T00:00:00', mine: false }],
    })

    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="place-list-item-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="place-reviews"]').text()).toContain('먼저 보여요')
    expect(wrapper.get('[data-testid="place-weather"]').text()).toContain('날씨를 불러오는 중')

    resolveWeather({
      available: true, message: null, temperature: 24, feelsLikeTemperature: 24,
      precipitationProbability: 0, humidity: 50, windSpeed: 1, precipitationType: 'NONE',
      skyStatus: 'CLEAR', precipitationOneHour: null, forecastAt: null, updatedAt: null,
      forecasts: [], dailyForecasts: [],
    })
    await flushPromises()
    expect(wrapper.get('[data-testid="place-weather"]').text()).toContain('24.0°C')
  })

  it('does not draw an outline around the selected place card', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1, title: '보물섬수산', location: '대전', category: '음식점', rawCategory: '음식점',
        description: '횟집', image: '/image.jpg', thumbnailImage: '/image.jpg', detailImage: '/image.jpg',
        rating: 5, reviewCount: '2', tags: [], marker: { top: '50%', left: '50%' },
        coordinates: { lat: 36.32, lng: 127.42 }, address: '대전', regionId: 1,
        regionName: '유성구', regionFullName: '대전 유성구',
      }],
      totalElements: 1, page: 0, size: 20, hasNext: false,
    })
    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()
    const card = wrapper.get('[data-testid="place-list-item-1"]')
    await card.trigger('click')

    expect(card.classes()).not.toContain('ring-1')
    expect(card.classes()).not.toContain('ring-brand-200')
  })

  it('starts the mobile search sheet at the middle snap and layers place details above it', async () => {
    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    const sheet = wrapper.get('[data-testid="explore-list-sheet"]')
    expect(sheet.classes()).toContain('z-40')
    expect(sheet.classes()).toContain('md:!transform-none')
    expect(sheet.attributes('data-sheet-position')).toBe('middle')

    await wrapper.get('[data-testid="list-sheet-handle"]').trigger('click')
    expect(sheet.attributes('data-sheet-position')).toBe('expanded')
  })

  it('keeps the mobile place detail within the search sheet footprint', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1, title: '청계천', location: '서울', category: '관광지', rawCategory: '관광지',
        description: '도심 산책로', image: '/place.jpg', thumbnailImage: '/place.jpg', detailImage: '/place.jpg',
        rating: 0, reviewCount: '0', tags: [], marker: { top: '50%', left: '50%' },
        coordinates: { lat: 37.57, lng: 127 }, address: '서울', regionId: 1,
        regionName: '종로구', regionFullName: '서울 종로구',
      }],
      totalElements: 1, page: 0, size: 20, hasNext: false,
    })
    const wrapper = mount(ExplorePage, {
      props: { accessToken: '', trips: [] },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="place-list-item-1"]').trigger('click')

    const detail = wrapper.get('[data-testid="place-detail-overlay"]')
    expect(detail.classes()).toEqual(expect.arrayContaining(['bottom-[72px]', 'h-[76vh]', 'rounded-t-2xl', 'z-[70]']))
    expect(detail.classes()).not.toContain('top-[56px]')
    expect(detail.classes()).toContain('md:absolute')
    expect(detail.attributes('data-mobile-portal')).toBe('true')
    expect(detail.attributes('data-sheet-position')).toBe('middle')
    expect(detail.attributes('style')).toBe(wrapper.get('[data-testid="explore-list-sheet"]').attributes('style'))
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

  it('adds a place to the selected trip date from the explore modal', async () => {
    fetchPlaces.mockResolvedValue({
      content: [{
        id: 1,
        title: '성심당',
        location: '대전광역시 중구',
        category: '음식점',
        rawCategory: '음식점',
        description: '대전 빵집',
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
    fetchTripSchedules.mockResolvedValue([])
    createTripSchedule.mockResolvedValue({})

    const wrapper = mount(ExplorePage, {
      props: {
        accessToken: 'token',
        trips: [{
          id: 10,
          title: '대전 여행',
          destination: '팀 여행',
          period: '2026-07-01 - 2026-07-03',
          description: '',
          image: '',
          members: ['나'],
          status: 'PLANNING',
          tripType: 'TEAM',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
          phase: 'upcoming',
        }],
      },
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('article').trigger('click')
    await wrapper.get('[data-testid="open-add-place-1"]').trigger('click')
    expect(wrapper.get('[data-testid="add-place-date"]').element).toHaveProperty('value', '2026-07-01')
    await wrapper.get('[data-testid="add-place-date"]').setValue('2026-07-02')
    await wrapper.get('[data-testid="add-place-start-time"]').setValue('14:30')
    await wrapper.get('[data-testid="add-place-end-time"]').setValue('16:00')
    await wrapper.get('[data-testid="confirm-add-place"]').trigger('click')
    await flushPromises()

    expect(createTripSchedule).toHaveBeenCalledWith('token', 10, expect.objectContaining({
      placeId: 1,
      scheduleDate: '2026-07-02',
      startTime: '14:30:00',
      endTime: '16:00:00',
      dayNo: 2,
    }))
  })
})
