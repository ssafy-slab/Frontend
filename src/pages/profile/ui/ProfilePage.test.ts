import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage.vue'

const { fetchMyPlaceReviews } = vi.hoisted(() => ({
  fetchMyPlaceReviews: vi.fn(),
}))

vi.mock('@/entities/review/api/reviewApi', () => ({
  fetchMyPlaceReviews,
  deleteMyPlaceReview: vi.fn(),
}))

describe('ProfilePage my reviews', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.setItem('slap-auth', JSON.stringify({
      accessToken: 'token',
      tokenType: 'Bearer',
      user: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
    }))
    fetchMyPlaceReviews.mockReset().mockResolvedValue({
      content: [{
        reviewId: 1,
        placeId: 3,
        placeName: '테스트 장소',
        category: '관광',
        thumbnailImageUrl: '/place.jpg',
        rating: 5,
        content: '좋았어요.',
        createdAt: '2026-06-21T12:00:00',
        updatedAt: '2026-06-21T12:00:00',
      }],
      totalElements: 11,
      page: 0,
      size: 10,
      totalPages: 2,
    })
  })

  it('shows the current users reviews and opens the place', async () => {
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })

    await wrapper.get('button[data-tab="reviews"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('테스트 장소')
    expect(wrapper.text()).toContain('좋았어요.')
    expect(wrapper.text()).toContain('총 11개')
    expect(wrapper.text()).toContain('다음')
    await wrapper.get('article[data-action="open-place"]').trigger('click')
    expect(wrapper.emitted('openPlace')?.[0]).toEqual([3])
  })
})
