import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage.vue'

const { fetchMyPlaceReviews } = vi.hoisted(() => ({
  fetchMyPlaceReviews: vi.fn(),
}))
const { fetchMyLikedCommunityPosts, unlikeCommunityPost, fetchMyLikedPlaces, unlikePlace } = vi.hoisted(() => ({
  fetchMyLikedCommunityPosts: vi.fn(),
  unlikeCommunityPost: vi.fn(),
  fetchMyLikedPlaces: vi.fn(),
  unlikePlace: vi.fn(),
}))

vi.mock('@/entities/review/api/reviewApi', () => ({
  fetchMyPlaceReviews,
  deleteMyPlaceReview: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    fetchMyLikedCommunityPosts,
    unlikeCommunityPost,
  }
})

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchMyLikedPlaces, unlikePlace }
})

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
    fetchMyLikedCommunityPosts.mockReset().mockResolvedValue([{
      postId: 12,
      userId: 4,
      authorNickname: 'writer',
      placeId: null,
      placeName: null,
      category: 'TRAVEL_TIP',
      title: '좋아요한 여행 팁',
      excerpt: '좋은 글',
      imageUrl: null,
      likeCount: 3,
      commentCount: 2,
      viewCount: 10,
      createdAt: '2026-06-24T00:00:00',
      updatedAt: '2026-06-24T00:00:00',
      likedByMe: true,
      mine: false,
    }])
    fetchMyLikedPlaces.mockReset().mockResolvedValue([{
      id: 30, title: '좋아요한 여행지', location: '서울', category: '관광', description: '',
      image: '/place.jpg', thumbnailImage: '/place.jpg', detailImage: '/place.jpg', rating: 4.5,
      reviewCount: '3', tags: [], marker: { top: '50%', left: '50%' }, coordinates: { lat: 37, lng: 127 },
      liked: true,
    }])
    unlikeCommunityPost.mockReset().mockResolvedValue(undefined)
    unlikePlace.mockReset().mockResolvedValue(undefined)
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

  it('loads liked posts, opens a post, and removes its like', async () => {
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })
    await wrapper.get('button[data-tab="likes"]').trigger('click')
    await flushPromises()
    expect(fetchMyLikedCommunityPosts).toHaveBeenCalledWith('token', 0, 20)
    expect(wrapper.text()).toContain('좋아요한 여행 팁')

    await wrapper.get('[data-testid="liked-post-12"]').trigger('click')
    expect(wrapper.emitted('openPost')?.[0]).toEqual([12])

    await wrapper.get('[data-testid="remove-post-like-12"]').trigger('click')
    await flushPromises()
    expect(unlikeCommunityPost).toHaveBeenCalledWith(12, 'token')
    expect(wrapper.text()).toContain('좋아요한 게시글이 없습니다')
  })

  it('loads liked places from the likes sub-tab', async () => {
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })
    await wrapper.get('button[data-tab="likes"]').trigger('click')
    await wrapper.get('[data-testid="liked-places-tab"]').trigger('click')
    await flushPromises()
    expect(fetchMyLikedPlaces).toHaveBeenCalledWith('token', 0, 20)
    expect(wrapper.text()).toContain('좋아요한 여행지')
  })

  it('uses the explore fallback image when a liked place only has the default svg', async () => {
    fetchMyLikedPlaces.mockResolvedValueOnce([{
      id: 30, title: '기본 이미지 여행지', location: '서울', category: '관광', description: '',
      image: '/images/default-place.svg', thumbnailImage: '/images/default-place.svg',
      detailImage: '/images/default-place.svg', rating: 0, reviewCount: '0', tags: [],
      marker: { top: '50%', left: '50%' }, coordinates: { lat: 37, lng: 127 }, liked: true,
    }])
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })

    await wrapper.get('button[data-tab="likes"]').trigger('click')
    await wrapper.get('[data-testid="liked-places-tab"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="liked-place-30"] img').attributes('src'))
      .toContain('images.unsplash.com')
  })
})
