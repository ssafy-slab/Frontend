import type { CommunityComment, CommunityPostDetail, CommunityPostSummary } from '@/entities/community/api/communityApi'

export const mockCommunityPosts: CommunityPostDetail[] = [
  {
    postId: -101,
    userId: 101,
    authorNickname: '트래블러',
    placeId: null,
    placeName: '제주 가족 여행',
    category: 'TRAVEL_TIP',
    title: '부모님 모시고 가기 좋은 제주 3박 4일',
    content: '많이 걷지 않아도 풍경을 즐길 수 있는 가족 여행 코스입니다.\n\n1일차는 공항 근처에서 가볍게 식사하고 애월 해안도로를 따라 이동했습니다. 카페와 전망대 중심으로 잡으면 이동 피로가 적습니다.\n2일차는 서귀포 쪽 자연 코스를 묶고, 중간에 휴식 시간을 길게 두는 편이 좋았습니다.\n3일차는 시장과 식당 위주로 천천히 움직이면 부모님 만족도가 높았습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80',
    likeCount: 124,
    commentCount: 2,
    viewCount: 530,
    createdAt: '2026-06-22T11:00:00',
    updatedAt: '2026-06-22T11:00:00',
    likedByMe: false,
    bookmarkedByMe: false,
    mine: false,
    cells: [
      {
        postCellId: null,
        sortOrder: 1,
        cellType: 'IMAGE',
        textContent: null,
        imageUrl: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80',
      },
      {
        postCellId: null,
        sortOrder: 2,
        cellType: 'TEXT',
        textContent: '많이 걷지 않아도 풍경을 즐길 수 있는 가족 여행 코스입니다.',
        imageUrl: null,
      },
    ],
  },
  {
    postId: -102,
    userId: 102,
    authorNickname: '사진작가김',
    placeId: 4,
    placeName: '북촌 한옥마을',
    category: 'PLACE_REVIEW',
    title: '북촌 한옥마을 숨겨진 포토스팟 공유',
    content: '주말 오전에 가면 사람이 적고 골목 사진이 잘 나옵니다.\n\n큰길보다 안쪽 골목으로 들어가면 한옥 지붕선과 도심 배경이 같이 잡히는 구도가 많습니다. 주민 생활 공간이 가까워서 조용히 이동하는 것이 좋고, 삼청동 방향으로 내려오면 카페 동선도 자연스럽습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1200&q=80',
    likeCount: 89,
    commentCount: 1,
    viewCount: 412,
    createdAt: '2026-06-21T16:30:00',
    updatedAt: '2026-06-21T16:30:00',
    likedByMe: false,
    bookmarkedByMe: false,
    mine: false,
    cells: [
      {
        postCellId: null,
        sortOrder: 1,
        cellType: 'IMAGE',
        textContent: null,
        imageUrl: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1200&q=80',
      },
      {
        postCellId: null,
        sortOrder: 2,
        cellType: 'TEXT',
        textContent: '주말 오전에 가면 사람이 적고 골목 사진이 잘 나옵니다.',
        imageUrl: null,
      },
    ],
  },
]

export const mockCommunityComments: Record<number, CommunityComment[]> = {
  [-101]: [
    {
      commentId: -1001,
      postId: -101,
      commenterUserId: 201,
      authorNickname: '제주초보',
      parentCommentId: null,
      replyToNickname: null,
      content: '부모님 일정 짤 때 참고하기 좋네요.',
      createdAt: '2026-06-22T12:10:00',
      updatedAt: '2026-06-22T12:10:00',
      mine: false,
      deleted: false,
      edited: false,
    },
    {
      commentId: -1002,
      postId: -101,
      commenterUserId: 202,
      authorNickname: '느린여행',
      parentCommentId: null,
      replyToNickname: null,
      content: '휴식 시간을 길게 두는 팁 공감합니다.',
      createdAt: '2026-06-22T12:42:00',
      updatedAt: '2026-06-22T12:42:00',
      mine: false,
      deleted: false,
      edited: false,
    },
  ],
  [-102]: [
    {
      commentId: -1003,
      postId: -102,
      commenterUserId: 203,
      authorNickname: '골목산책',
      parentCommentId: null,
      replyToNickname: null,
      content: '오전 시간대에 다시 가봐야겠어요.',
      createdAt: '2026-06-21T17:02:00',
      updatedAt: '2026-06-21T17:02:00',
      mine: false,
      deleted: false,
      edited: false,
    },
  ],
}

export function findMockCommunityPost(postId: number | null | undefined) {
  return mockCommunityPosts.find((post) => post.postId === postId) ?? null
}

export function toMockCommunitySummary(post: CommunityPostDetail): CommunityPostSummary {
  return {
    ...post,
    excerpt: post.content ? post.content.replace(/\s+/g, ' ').slice(0, 90) : null,
  }
}
