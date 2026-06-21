import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExplorePage from './ExplorePage.vue'

const { fetchPlaces, fetchPlaceFilters } = vi.hoisted(() => ({
  fetchPlaces: vi.fn(),
  fetchPlaceFilters: vi.fn(),
}))

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchPlaces, fetchPlaceFilters }
})

describe('ExplorePage review sorting', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })
    fetchPlaceFilters.mockResolvedValue({ categories: [], regions: [] })
    fetchPlaces.mockResolvedValue({
      content: [],
      totalElements: 0,
      page: 0,
      size: 20,
      hasNext: false,
    })
  })

  it('toggles a selected sort and returns to the normal order', async () => {
    const wrapper = mount(ExplorePage, {
      global: { stubs: { KakaoMap: true, SafeImage: true, Teleport: true } },
    })
    await flushPromises()

    const recommended = wrapper.get('button[aria-pressed="false"]')
    await recommended.trigger('click')
    await flushPromises()
    expect(fetchPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'recommended' }))

    await recommended.trigger('click')
    await flushPromises()
    expect(fetchPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ sort: undefined }))
  })
})
