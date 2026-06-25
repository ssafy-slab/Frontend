import { describe, expect, it } from 'vitest'
import { findMockCommunityPost, mockCommunityPosts } from './mockCommunity'

describe('mock community posts', () => {
  it('contains exactly two rich demo posts with reserved ids', () => {
    expect(mockCommunityPosts).toHaveLength(2)
    expect(mockCommunityPosts.every((post) => post.postId < 0)).toBe(true)
    expect(mockCommunityPosts.every((post) => (post.cells?.length ?? 0) >= 3)).toBe(true)
  })

  it('resolves both mock details locally', () => {
    for (const post of mockCommunityPosts) {
      expect(findMockCommunityPost(post.postId)?.title).toBe(post.title)
    }
  })
})
