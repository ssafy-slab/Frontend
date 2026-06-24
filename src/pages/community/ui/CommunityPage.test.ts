import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommunityPage from './CommunityPage.vue'

const { likeCommunityPost, fetchCommunityPosts, unlikeCommunityPost } = vi.hoisted(() => ({
  likeCommunityPost: vi.fn(),
  fetchCommunityPosts: vi.fn(),
  unlikeCommunityPost: vi.fn(),
}))

function createPost(overrides: Record<string, unknown> = {}) {
  return {
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
    likedByMe: false,
    mine: false,
    createdAt: '2026-06-24T00:00:00',
    ...overrides,
  }
}

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    likeCommunityPost,
    fetchCommunityPosts,
    unlikeCommunityPost,
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
      createPost(),
      createPost({
        postId: 2,
        category: 'PLACE_REVIEW',
        title: 'Card with hashtag',
        excerpt: 'Description',
        imageUrl: 'https://example.com/card-2.jpg',
        placeId: 10,
        placeName: 'Jeju family trip',
        authorNickname: 'writer',
        viewCount: 4,
        likeCount: 5,
        commentCount: 6,
        likedByMe: true,
        mine: false,
        createdAt: '2026-06-23T00:00:00',
      }),
    ])
  })

  it('uses a stable image ratio and naturally spaced card footer', async () => {
    const wrapper = mount(CommunityPage)
    await flushPromises()

    const card = wrapper.get('[data-testid="community-card"]')
    const imageFrame = wrapper.get('[data-testid="community-card-image"]')
    const image = imageFrame.get('img')
    const body = wrapper.get('[data-testid="community-card-body"]')
    const footer = wrapper.get('[data-testid="community-card-footer"]')

    expect(card.classes()).toEqual(expect.arrayContaining(['flex', 'min-h-[330px]', 'flex-col']))
    expect(card.classes()).not.toContain('h-[352px]')
    expect(card.classes()).not.toContain('h-96')
    expect(card.classes()).not.toContain('h-full')
    expect(imageFrame.classes()).toEqual(expect.arrayContaining(['aspect-[16/9]', 'overflow-hidden', 'bg-slate-100']))
    expect(imageFrame.classes()).not.toContain('h-44')
    expect(imageFrame.classes()).not.toContain('h-52')
    expect(image.classes()).toEqual(expect.arrayContaining(['h-full', 'w-full', 'object-cover']))
    expect(image.classes()).not.toContain('object-contain')
    expect(body.classes()).toEqual(expect.arrayContaining(['flex', 'flex-1', 'flex-col', 'px-4', 'py-4']))
    expect(footer.classes()).toContain('mt-auto')
    expect(footer.classes()).toContain('pt-4')
    expect(footer.classes()).toContain('border-t')
    expect(wrapper.get('[data-testid="community-card-excerpt"]').classes()).not.toContain('min-h-9')
    expect(wrapper.get('[data-testid="community-card-excerpt"]').classes()).toContain('mb-2')
    expect(wrapper.find('[data-testid="community-empty"]').exists()).toBe(false)

    const placeRows = wrapper.findAll('[data-testid="community-card-place"]')
    expect(placeRows).toHaveLength(1)
    expect(placeRows[0]?.text()).toBe('# Jeju family trip')
    expect(placeRows[0]?.classes()).toEqual(expect.arrayContaining(['mb-2', 'rounded-full', 'bg-emerald-50', 'px-2.5', 'py-1']))
  })

  it('toggles likes without opening the post', async () => {
    likeCommunityPost.mockResolvedValue(undefined)
    unlikeCommunityPost.mockResolvedValue(undefined)
    const wrapper = mount(CommunityPage, { props: { accessToken: 'token' } })
    await flushPromises()

    await wrapper.get('[data-testid="like-post-1"]').trigger('click')
    await flushPromises()
    expect(likeCommunityPost).toHaveBeenCalledWith(1, 'token')
    expect(wrapper.get('[data-testid="like-post-1"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('openPost')).toBeUndefined()

    await wrapper.get('[data-testid="like-post-2"]').trigger('click')
    await flushPromises()
    expect(unlikeCommunityPost).toHaveBeenCalledWith(2, 'token')
  })

  it('paginates community cards with previous and next controls', async () => {
    fetchCommunityPosts.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => createPost({
        postId: index + 1,
        title: `Post ${index + 1}`,
        createdAt: `2026-06-${String(24 - index).padStart(2, '0')}T00:00:00`,
      })),
    )
    const wrapper = mount(CommunityPage)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="community-card"]')).toHaveLength(9)
    expect(wrapper.find('[data-testid="community-empty"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="community-page-indicator"]').text()).toBe('1 / 2')
    expect(wrapper.get('[data-testid="community-page-previous"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="community-page-next"]').trigger('click')
    expect(wrapper.findAll('[data-testid="community-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="community-page-indicator"]').text()).toBe('2 / 2')
    expect(wrapper.get('[data-testid="community-page-next"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="community-page-previous"]').trigger('click')
    expect(wrapper.findAll('[data-testid="community-card"]')).toHaveLength(9)
  })

  it('rolls back a failed like and sends guests to login', async () => {
    likeCommunityPost.mockRejectedValueOnce(new Error('좋아요 실패'))
    const wrapper = mount(CommunityPage, { props: { accessToken: 'token' } })
    await flushPromises()

    await wrapper.get('[data-testid="like-post-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="like-post-1"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.emitted('saved')?.at(-1)).toEqual(['좋아요 실패'])

    await wrapper.setProps({ accessToken: undefined })
    await wrapper.get('[data-testid="like-post-1"]').trigger('click')
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['login'])
  })
})
