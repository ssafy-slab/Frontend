import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
} from './communityApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('community comment API', () => {
  it('creates a reply with its direct parent comment id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )

    await createCommunityComment(3, 'token', {
      content: 'reply',
      parentCommentId: 41,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/community/posts/3/comments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'reply', parentCommentId: 41 }),
      }),
    )
  })

  it('updates and deletes comments through author-only endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await updateCommunityComment(41, 'token', { content: 'edited' })
    await deleteCommunityComment(41, 'token')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/community/comments/41'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ content: 'edited' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/community/comments/41'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('returns comment-specific permission and missing-parent messages', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))

    await expect(updateCommunityComment(41, 'token', { content: 'edited' }))
      .rejects.toThrow('댓글 작성자만 수정하거나 삭제할 수 있습니다.')
    await expect(createCommunityComment(3, 'token', { content: 'reply', parentCommentId: 41 }))
      .rejects.toThrow('답변할 댓글이 삭제되었습니다.')
  })
})
