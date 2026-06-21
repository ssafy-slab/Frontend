import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlaceDetailPage from './PlaceDetailPage.vue'

const { fetchPlaceReviews, createPlaceReview } = vi.hoisted(() => ({
  fetchPlaceReviews: vi.fn(),
  createPlaceReview: vi.fn(),
}))

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return {
    ...actual,
    fetchPlaceWeather: vi.fn().mockResolvedValue({ available: false, forecasts: [], dailyForecasts: [] }),
    fetchPlaceNearbyFacilities: vi.fn().mockResolvedValue({ groups: [] }),
  }
})

vi.mock('@/entities/review/api/reviewApi', () => ({
  fetchPlaceReviews,
  createPlaceReview,
  updateMyPlaceReview: vi.fn(),
  deleteMyPlaceReview: vi.fn(),
}))

const place = {
  id: 3,
  title: '테스트 장소',
  location: '서울',
  category: '관광',
  description: '설명',
  image: '/image.jpg',
  rating: 0,
  reviewCount: '0',
  tags: [],
  marker: { top: '50%', left: '50%' },
  coordinates: { lat: 37.5, lng: 127 },
}

describe('PlaceDetailPage reviews', () => {
  beforeEach(() => {
    fetchPlaceReviews.mockReset().mockResolvedValue({
      averageRating: 0,
      reviewCount: 0,
      reviews: [],
      myReview: null,
    })
    createPlaceReview.mockReset().mockResolvedValue({
      averageRating: 5,
      reviewCount: 1,
      reviews: [],
      myReview: null,
    })
  })

  it('requires a star rating and allows rating-only submission', async () => {
    const wrapper = mount(PlaceDetailPage, {
      props: {
        place: { ...place },
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
        accessToken: 'token',
      },
      global: {
        stubs: {
          KakaoMap: true,
          SafeImage: true,
          Teleport: true,
        },
      },
    })
    await flushPromises()

    const submit = wrapper.get('button.btn-primary.h-10')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('button[aria-label="5점 선택"]').trigger('click')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    await flushPromises()

    expect(createPlaceReview).toHaveBeenCalledWith(3, 'token', { rating: 5, content: '' })
  })
})
