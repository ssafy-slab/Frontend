import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'

export type PlaceReview = {
  reviewId: number
  userId: number
  authorNickname: string
  rating: number
  content: string | null
  createdAt: string
  updatedAt: string
  mine: boolean
}

export type PlaceReviewSummary = {
  averageRating: number
  reviewCount: number
  reviews: PlaceReview[]
  myReview: PlaceReview | null
}

export type PlaceReviewPayload = {
  rating: number
  content?: string
}

export type MyPlaceReview = {
  reviewId: number
  placeId: number
  placeName: string
  category: string | null
  thumbnailImageUrl: string
  rating: number
  content: string | null
  createdAt: string
  updatedAt: string
}

export type MyPlaceReviewPage = {
  content: MyPlaceReview[]
  totalElements: number
  page: number
  size: number
  totalPages: number
}

async function request(
  placeId: number,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  token?: string,
  payload?: PlaceReviewPayload,
) {
  const path = method === 'PUT' || method === 'DELETE'
    ? `/api/places/${placeId}/reviews/me`
    : `/api/places/${placeId}/reviews`
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (payload) headers['Content-Type'] = 'application/json'

  const response = await fetch(new URL(path, apiBaseUrl).toString(), {
    method,
    headers,
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 409) throw new Error('이미 작성한 리뷰가 있습니다.')
    throw new Error(`리뷰 요청에 실패했습니다. (${response.status})`)
  }
  return response.json() as Promise<PlaceReviewSummary>
}

export function fetchPlaceReviews(placeId: number, token?: string) {
  return request(placeId, 'GET', token)
}

export function createPlaceReview(placeId: number, token: string, payload: PlaceReviewPayload) {
  return request(placeId, 'POST', token, payload)
}

export function updateMyPlaceReview(placeId: number, token: string, payload: PlaceReviewPayload) {
  return request(placeId, 'PUT', token, payload)
}

export function deleteMyPlaceReview(placeId: number, token: string) {
  return request(placeId, 'DELETE', token)
}

export async function fetchMyPlaceReviews(token: string, page = 0, size = 10) {
  const url = new URL('/api/users/me/reviews', apiBaseUrl)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(size))
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    throw new Error(`내 리뷰를 불러오지 못했습니다. (${response.status})`)
  }
  return response.json() as Promise<MyPlaceReviewPage>
}
