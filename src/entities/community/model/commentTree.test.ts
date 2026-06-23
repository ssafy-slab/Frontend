import { describe, expect, it } from 'vitest'
import type { CommunityComment } from '@/entities/community/api/communityApi'
import { flattenCommunityComments } from './commentTree'

function comment(
  commentId: number,
  parentCommentId: number | null,
  createdAt: string,
): CommunityComment {
  return {
    commentId,
    postId: 1,
    commenterUserId: commentId,
    authorNickname: `user-${commentId}`,
    parentCommentId,
    replyToNickname: parentCommentId ? `user-${parentCommentId}` : null,
    content: `comment-${commentId}`,
    createdAt,
    updatedAt: createdAt,
    mine: false,
    deleted: false,
    edited: false,
  }
}

describe('flattenCommunityComments', () => {
  it('keeps recursive reply order while rendering every reply at one visual level', () => {
    const result = flattenCommunityComments([
      comment(4, 2, '2026-06-24T10:03:00'),
      comment(2, 1, '2026-06-24T10:01:00'),
      comment(3, 1, '2026-06-24T10:02:00'),
      comment(1, null, '2026-06-24T10:00:00'),
    ])

    expect(result.map((item) => item.commentId)).toEqual([1, 2, 4, 3])
    expect(result.map((item) => item.isReply)).toEqual([false, true, true, true])
  })

  it('appends orphaned and cyclic comments once instead of looping forever', () => {
    const result = flattenCommunityComments([
      comment(1, 2, '2026-06-24T10:00:00'),
      comment(2, 1, '2026-06-24T10:01:00'),
      comment(3, 999, '2026-06-24T10:02:00'),
    ])

    expect(result.map((item) => item.commentId)).toEqual([1, 2, 3])
    expect(new Set(result.map((item) => item.commentId)).size).toBe(3)
  })
})
