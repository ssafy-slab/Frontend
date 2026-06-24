import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommunityDetailPage from './CommunityDetailPage.vue'
import type { CommunityComment } from '@/entities/community/api/communityApi'

const {
  createCommunityComment,
  deleteCommunityComment,
  fetchCommunityComments,
  fetchCommunityPost,
  updateCommunityComment,
} = vi.hoisted(() => ({
  createCommunityComment: vi.fn(),
  deleteCommunityComment: vi.fn(),
  fetchCommunityComments: vi.fn(),
  fetchCommunityPost: vi.fn(),
  updateCommunityComment: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    createCommunityComment,
    deleteCommunityComment,
    fetchCommunityComments,
    fetchCommunityPost,
    updateCommunityComment,
  }
})

function comment(overrides: Partial<CommunityComment> = {}): CommunityComment {
  return {
    commentId: 1,
    postId: 3,
    commenterUserId: 7,
    authorNickname: 'owner',
    parentCommentId: null,
    replyToNickname: null,
    content: 'original comment',
    createdAt: '2026-06-24T10:00:00',
    updatedAt: '2026-06-24T10:00:00',
    mine: true,
    deleted: false,
    edited: false,
    ...overrides,
  }
}

describe('CommunityDetailPage comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    fetchCommunityPost.mockResolvedValue({
      postId: 3,
      userId: 9,
      authorNickname: 'writer',
      placeId: null,
      placeName: null,
      category: 'FREE',
      title: 'post',
      content: 'body',
      imageUrl: null,
      likeCount: 0,
      commentCount: 2,
      viewCount: 1,
      createdAt: '2026-06-24T09:00:00',
      updatedAt: '2026-06-24T09:00:00',
      likedByMe: false,
      mine: false,
      cells: [],
    })
    fetchCommunityComments.mockResolvedValue([
      comment(),
      comment({
        commentId: 2,
        commenterUserId: 8,
        authorNickname: 'other',
        parentCommentId: 1,
        replyToNickname: 'owner',
        content: 'nested reply',
        mine: false,
      }),
      comment({
        commentId: 3,
        commenterUserId: 9,
        authorNickname: 'third',
        parentCommentId: 2,
        replyToNickname: 'other',
        content: 'deep reply',
        mine: false,
      }),
    ])
    createCommunityComment.mockResolvedValue([])
    updateCommunityComment.mockResolvedValue([])
    deleteCommunityComment.mockResolvedValue(undefined)
  })

  it('shows edit and delete only for my active comment', async () => {
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-comment-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="delete-comment-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-comment-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-comment-2"]').exists()).toBe(false)
  })

  it('renders post cells in their saved order', async () => {
    fetchCommunityPost.mockResolvedValueOnce({
      postId: 3,
      userId: 9,
      authorNickname: 'writer',
      placeId: null,
      placeName: null,
      category: 'FREE',
      title: 'post',
      content: 'legacy body',
      imageUrl: 'https://example.com/legacy.jpg',
      likeCount: 0,
      commentCount: 0,
      viewCount: 1,
      createdAt: '2026-06-24T09:00:00',
      updatedAt: '2026-06-24T09:00:00',
      likedByMe: false,
      mine: false,
      cells: [
        { postCellId: 1, sortOrder: 1, cellType: 'TEXT', textContent: 'First story', imageUrl: null },
        { postCellId: 2, sortOrder: 2, cellType: 'IMAGE', textContent: null, imageUrl: 'https://example.com/a.jpg' },
        { postCellId: 3, sortOrder: 3, cellType: 'TEXT', textContent: 'Second story', imageUrl: null },
      ],
    })
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    const cells = wrapper.findAll('[data-testid="post-content-cell"]')
    expect(cells).toHaveLength(3)
    expect(cells[0]?.text()).toContain('First story')
    expect(cells[1]?.find('img').attributes('src')).toBe('https://example.com/a.jpg')
    expect(cells[2]?.text()).toContain('Second story')
  })

  it('renders the legacy post image without cropping when cells are missing', async () => {
    fetchCommunityPost.mockResolvedValueOnce({
      postId: 3,
      userId: 9,
      authorNickname: 'writer',
      placeId: null,
      placeName: null,
      category: 'FREE',
      title: 'post',
      content: 'legacy body',
      imageUrl: 'https://example.com/legacy.jpg',
      likeCount: 0,
      commentCount: 0,
      viewCount: 1,
      createdAt: '2026-06-24T09:00:00',
      updatedAt: '2026-06-24T09:00:00',
      likedByMe: false,
      mine: false,
      cells: [],
    })
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    const image = wrapper.get('[data-testid="post-content-cell"] img')
    expect(image.attributes('src')).toBe('https://example.com/legacy.jpg')
    expect(image.classes()).toContain('object-contain')
    expect(image.classes()).not.toContain('object-cover')
  })

  it('creates a reply to the selected comment and uses one common indentation level', async () => {
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="comment-2"]').classes()).toContain('ml-8')
    expect(wrapper.get('[data-testid="comment-3"]').classes()).toContain('ml-8')
    expect(wrapper.get('[data-testid="comment-3"]').text()).toContain('@other')

    await wrapper.get('[data-testid="reply-comment-2"]').trigger('click')
    await wrapper.get('[data-testid="reply-input-2"]').setValue('reply to reply')
    await wrapper.get('[data-testid="submit-reply-2"]').trigger('click')
    await flushPromises()

    expect(createCommunityComment).toHaveBeenCalledWith(3, 'token', {
      content: 'reply to reply',
      parentCommentId: 2,
    })
  })

  it('edits my comment inline and shows edited metadata from the response', async () => {
    updateCommunityComment.mockResolvedValue([
      comment({ content: 'edited comment', edited: true, updatedAt: '2026-06-24T10:05:00' }),
    ])
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="edit-comment-1"]').trigger('click')
    await wrapper.get('[data-testid="edit-comment-input-1"]').setValue('edited comment')
    await wrapper.get('[data-testid="save-comment-edit-1"]').trigger('click')
    await flushPromises()

    expect(updateCommunityComment).toHaveBeenCalledWith(1, 'token', { content: 'edited comment' })
    expect(wrapper.get('[data-testid="comment-1"]').text()).toContain('edited comment')
    expect(wrapper.get('[data-testid="comment-1"]').text()).toContain('수정됨')
  })

  it('reloads after deletion and keeps a deleted parent placeholder without actions', async () => {
    fetchCommunityComments
      .mockResolvedValueOnce([comment()])
      .mockResolvedValueOnce([
        comment({
          content: '삭제된 댓글입니다.',
          authorNickname: '삭제된 댓글',
          mine: false,
          deleted: true,
        }),
        comment({
          commentId: 2,
          parentCommentId: 1,
          replyToNickname: '삭제된 댓글',
          content: 'remaining reply',
          mine: false,
        }),
      ])
    const wrapper = mount(CommunityDetailPage, {
      props: { postId: 3, accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="delete-comment-1"]').trigger('click')
    await flushPromises()

    expect(deleteCommunityComment).toHaveBeenCalledWith(1, 'token')
    expect(wrapper.get('[data-testid="comment-1"]').text()).toContain('삭제된 댓글입니다.')
    expect(wrapper.find('[data-testid="reply-comment-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-comment-1"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="comment-2"]').text()).toContain('@삭제된 댓글')
  })
})
