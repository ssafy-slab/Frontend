export type CommunitySort = 'latest' | 'popular' | 'comments'

export type CommunityPostSummary = {
  postId: number
  userId: number
  authorNickname: string
  placeId: number | null
  placeName: string | null
  category: string
  title: string
  excerpt: string | null
  imageUrl: string | null
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
  likedByMe: boolean
  mine: boolean
}

export type CommunityPostDetail = Omit<CommunityPostSummary, 'excerpt'> & {
  content: string | null
}

export type CommunityPostPayload = {
  category: string
  title: string
  content?: string
  imageUrl?: string
  placeId?: number | null
}

export type CommunityImageResponse = {
  imageUrl: string
}

export type CommunityComment = {
  commentId: number
  postId: number
  commenterUserId: number
  authorNickname: string
  parentCommentId: number | null
  content: string
  createdAt: string
  updatedAt: string
  mine: boolean
}

export type CommunityCommentPayload = {
  content: string
  parentCommentId?: number | null
}

export type CommunityPostSearchParams = {
  category?: string
  keyword?: string
  sort?: CommunitySort
  page?: number
  size?: number
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'

export function resolveCommunityImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return ''
  if (/^(https?:|data:|blob:)/.test(imageUrl)) return imageUrl
  return new URL(imageUrl, apiBaseUrl).toString()
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, apiBaseUrl)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

function authHeaders(token?: string, hasBody = false) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (hasBody) headers['Content-Type'] = 'application/json'
  return headers
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 403) throw new Error('권한이 없습니다.')
    if (response.status === 404) throw new Error('요청한 항목을 찾을 수 없습니다.')
    throw new Error(`커뮤니티 요청에 실패했습니다. (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function fetchCommunityPosts(params: CommunityPostSearchParams, token?: string) {
  return requestJson<CommunityPostSummary[]>(
    buildUrl('/api/community/posts', {
      category: params.category,
      keyword: params.keyword,
      sort: params.sort,
      page: params.page,
      size: params.size,
    }),
    { headers: authHeaders(token) },
  )
}

export function fetchCommunityPost(postId: number, token?: string) {
  return requestJson<CommunityPostDetail>(buildUrl(`/api/community/posts/${postId}`), {
    headers: authHeaders(token),
  })
}

export function createCommunityPost(token: string, payload: CommunityPostPayload) {
  return requestJson<CommunityPostDetail>(buildUrl('/api/community/posts'), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
}

export function updateCommunityPost(postId: number, token: string, payload: CommunityPostPayload) {
  return requestJson<CommunityPostDetail>(buildUrl(`/api/community/posts/${postId}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
}

export async function deleteCommunityPost(postId: number, token: string) {
  const response = await fetch(buildUrl(`/api/community/posts/${postId}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 403) throw new Error('권한이 없습니다.')
    if (response.status === 404) throw new Error('요청한 항목을 찾을 수 없습니다.')
    throw new Error(`게시글 삭제에 실패했습니다. (${response.status})`)
  }
}

export function uploadCommunityImage(token: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  return requestJson<CommunityImageResponse>(buildUrl('/api/community/images'), {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  })
}

export async function toggleCommunityPostLike(postId: number, token: string) {
  const response = await fetch(buildUrl(`/api/community/posts/${postId}/like`), {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    throw new Error(`좋아요 처리에 실패했습니다. (${response.status})`)
  }
}

export function fetchCommunityComments(postId: number, token?: string) {
  return requestJson<CommunityComment[]>(buildUrl(`/api/community/posts/${postId}/comments`), {
    headers: authHeaders(token),
  })
}

export function createCommunityComment(postId: number, token: string, payload: CommunityCommentPayload) {
  return requestJson<CommunityComment[]>(buildUrl(`/api/community/posts/${postId}/comments`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
}
