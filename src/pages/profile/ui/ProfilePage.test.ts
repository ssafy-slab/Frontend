import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage.vue'

const { fetchMyPlaceReviews } = vi.hoisted(() => ({
  fetchMyPlaceReviews: vi.fn(),
}))
const { fetchMyBookmarkedCommunityPosts, unbookmarkCommunityPost } = vi.hoisted(() => ({
  fetchMyBookmarkedCommunityPosts: vi.fn(),
  unbookmarkCommunityPost: vi.fn(),
}))

vi.mock('@/entities/review/api/reviewApi', () => ({
  fetchMyPlaceReviews,
  deleteMyPlaceReview: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    fetchMyBookmarkedCommunityPosts,
    unbookmarkCommunityPost,
  }
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
    fetchMyBookmarkedCommunityPosts.mockReset().mockResolvedValue([{
      postId: 12,
      userId: 4,
      authorNickname: 'writer',
      placeId: null,
      placeName: null,
      category: 'TRAVEL_TIP',
      title: '찜한 여행 팁',
      excerpt: '좋은 글',
      imageUrl: null,
      likeCount: 3,
      commentCount: 2,
      viewCount: 10,
      createdAt: '2026-06-24T00:00:00',
      updatedAt: '2026-06-24T00:00:00',
      likedByMe: false,
      bookmarkedByMe: true,
      mine: false,
    }])
    unbookmarkCommunityPost.mockReset().mockResolvedValue(undefined)
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

  it('loads bookmarks on profile entry, opens a post, and removes an unbookmarked item', async () => {
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })
    await flushPromises()

    expect(fetchMyBookmarkedCommunityPosts).toHaveBeenCalledWith('token', 0, 20)
    await wrapper.get('button[data-tab="bookmarks"]').trigger('click')
    expect(wrapper.text()).toContain('찜한 여행 팁')

    await wrapper.get('[data-testid="bookmarked-post-12"]').trigger('click')
    expect(wrapper.emitted('openPost')?.[0]).toEqual([12])

    await wrapper.get('[data-testid="remove-bookmark-12"]').trigger('click')
    await flushPromises()
    expect(unbookmarkCommunityPost).toHaveBeenCalledWith(12, 'token')
    expect(wrapper.text()).toContain('찜한 게시글이 없습니다')
  })

  it('shows the bookmarked-post empty state', async () => {
    fetchMyBookmarkedCommunityPosts.mockResolvedValueOnce([])
    const wrapper = mount(ProfilePage, {
      props: {
        currentUser: { userId: 7, email: 'a@b.com', nickname: '여행자', role: 'USER', localAccount: true },
      },
    })
    await flushPromises()
    await wrapper.get('button[data-tab="bookmarks"]').trigger('click')

    expect(wrapper.text()).toContain('찜한 게시글이 없습니다')
  })
})
