import type { CommunityComment } from '@/entities/community/api/communityApi'

export type DisplayCommunityComment = CommunityComment & {
  isReply: boolean
}

function compareComments(left: CommunityComment, right: CommunityComment) {
  const createdCompare = left.createdAt.localeCompare(right.createdAt)
  return createdCompare !== 0 ? createdCompare : left.commentId - right.commentId
}

export function flattenCommunityComments(comments: CommunityComment[]): DisplayCommunityComment[] {
  const sorted = [...comments].sort(compareComments)
  const ids = new Set(sorted.map((comment) => comment.commentId))
  const children = new Map<number, CommunityComment[]>()

  sorted.forEach((comment) => {
    if (comment.parentCommentId === null || !ids.has(comment.parentCommentId)) return
    children.set(comment.parentCommentId, [...(children.get(comment.parentCommentId) ?? []), comment])
  })

  const result: DisplayCommunityComment[] = []
  const visited = new Set<number>()

  function visit(comment: CommunityComment, isReply: boolean) {
    if (visited.has(comment.commentId)) return
    visited.add(comment.commentId)
    result.push({ ...comment, isReply })
    children.get(comment.commentId)?.forEach((child) => visit(child, true))
  }

  sorted
    .filter((comment) => comment.parentCommentId === null)
    .forEach((comment) => visit(comment, false))

  sorted
    .filter((comment) => !visited.has(comment.commentId))
    .forEach((comment) => visit(comment, comment.parentCommentId !== null))

  return result
}
