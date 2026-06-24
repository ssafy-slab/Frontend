import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommunityPage from './CommunityPage.vue'

const { fetchCommunityPosts } = vi.hoisted(() => ({
  fetchCommunityPosts: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    fetchCommunityPosts,
  }
})

vi.mock('@/entities/community/model/mockCommunity', () => ({
  mockCommunityPosts: [],
  toMockCommunitySummary: vi.fn(),
}))

describe('CommunityPage card layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCommunityPosts.mockResolvedValue([
      {
        postId: 1,
        category: 'TRAVEL_TIP',
        title: 'Uniform card',
        excerpt: null,
        imageUrl: 'https://example.com/card.jpg',
        placeId: null,
        placeName: null,
        authorNickname: 'traveler',
        viewCount: 1,
        likeCount: 2,
        commentCount: 3,
        mine: false,
        createdAt: '2026-06-24T00:00:00',
      },
      {
        postId: 2,
        category: 'PLACE_REVIEW',
        title: 'Card with hashtag',
        excerpt: 'Description',
        imageUrl: 'https://example.com/card-2.jpg',
        placeId: 10,
        placeName: '제주 가족 여행',
        authorNickname: 'writer',
        viewCount: 4,
        likeCount: 5,
        commentCount: 6,
        mine: false,
        createdAt: '2026-06-23T00:00:00',
      },
    ])
  })

  it('uses a fixed edge-to-edge image frame and bottom-aligned card footer', async () => {
    const wrapper = mount(CommunityPage)
    await flushPromises()

    const card = wrapper.get('[data-testid="community-card"]')
    const imageFrame = wrapper.get('[data-testid="community-card-image"]')
    const image = imageFrame.get('img')
    const body = wrapper.get('[data-testid="community-card-body"]')
    const footer = wrapper.get('[data-testid="community-card-footer"]')

    expect(card.classes()).toEqual(expect.arrayContaining(['flex', 'h-[352px]', 'flex-col']))
    expect(card.classes()).not.toContain('h-96')
    expect(card.classes()).not.toContain('h-full')
    expect(imageFrame.classes()).toEqual(expect.arrayContaining(['h-44', 'overflow-hidden']))
    expect(imageFrame.classes()).not.toContain('h-52')
    expect(imageFrame.classes()).not.toContain('bg-slate-100')
    expect(image.classes()).toEqual(expect.arrayContaining(['h-full', 'w-full', 'object-cover']))
    expect(image.classes()).not.toContain('object-contain')
    expect(body.classes()).toEqual(expect.arrayContaining(['flex', 'flex-1', 'flex-col', 'p-3']))
    expect(footer.classes()).toContain('mt-auto')
    expect(footer.classes()).toContain('pt-3')
    expect(wrapper.get('[data-testid="community-card-excerpt"]').classes()).toContain('min-h-9')
    expect(wrapper.get('[data-testid="community-card-place"]').classes()).toContain('min-h-4')

    const placeRows = wrapper.findAll('[data-testid="community-card-place"]')
    expect(placeRows).toHaveLength(2)
    expect(placeRows[0]?.text()).toBe('')
    expect(placeRows[1]?.text()).toBe('# 제주 가족 여행')
    expect(placeRows.every((row) => row.classes().includes('min-h-4'))).toBe(true)
  })
})
