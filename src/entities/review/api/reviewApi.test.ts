import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlaceReview, deleteMyPlaceReview, fetchMyPlaceReviews, fetchPlaceReviews, updateMyPlaceReview } from './reviewApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reviewApi', () => {
  it('uses an optional token when loading reviews', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ averageRating: 0, reviewCount: 0, reviews: [], myReview: null }), { status: 200 }),
    )

    await fetchPlaceReviews(3, 'token')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/places/3/reviews'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
  })

  it('sends create, update, and delete requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ averageRating: 5, reviewCount: 1, reviews: [], myReview: null }), { status: 200 }),
    )

    await createPlaceReview(3, 'token', { rating: 5, content: '' })
    await updateMyPlaceReview(3, 'token', { rating: 4, content: 'good' })
    await deleteMyPlaceReview(3, 'token')

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ method: 'PUT' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.any(String), expect.objectContaining({ method: 'DELETE' }))
  })

  it('loads the current users reviews with authentication', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: [], totalElements: 0, page: 0, size: 10, totalPages: 0 }), { status: 200 }),
    )

    await fetchMyPlaceReviews('token', 2)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/me/reviews'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
    expect(fetchMock.mock.calls[0]?.[0]).toContain('page=2')
    expect(fetchMock.mock.calls[0]?.[0]).toContain('size=10')
  })
})
