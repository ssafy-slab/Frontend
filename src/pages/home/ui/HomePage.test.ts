import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage.vue'

const { fetchPlace, fetchPlaces } = vi.hoisted(() => ({
  fetchPlace: vi.fn(),
  fetchPlaces: vi.fn(),
}))

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchPlace, fetchPlaces }
})

const liveAttraction = {
  id: 77,
  title: '실제 관광지',
  location: '제주특별자치도',
  category: '관광지',
  rawCategory: '관광지',
  description: 'API에서 불러온 관광지',
  image: 'https://example.com/place.jpg',
  thumbnailImage: 'https://example.com/place.jpg',
  detailImage: 'https://example.com/place-detail.jpg',
  rating: 4.6,
  reviewCount: '12',
  tags: ['관광지'],
  marker: { top: '50%', left: '50%' },
  coordinates: { lat: 33.4, lng: 126.5 },
}

describe('HomePage', () => {
  const liveAttractions = Array.from({ length: 10 }, (_, index) => ({
    ...liveAttraction,
    id: 77 + index,
    title: `실제 관광지 ${index + 1}`,
    image: `https://example.com/place-${index + 1}.jpg`,
    thumbnailImage: `https://example.com/place-${index + 1}.jpg`,
    detailImage: `https://example.com/place-detail-${index + 1}.jpg`,
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    fetchPlace.mockImplementation((placeId: number) => Promise.resolve({
      ...liveAttraction,
      id: placeId,
      title: `대표 관광지 ${placeId}`,
      image: `https://example.com/hero-thumb-${placeId}.jpg`,
      thumbnailImage: `https://example.com/hero-thumb-${placeId}.jpg`,
      detailImage: `https://example.com/hero-original-${placeId}.jpg`,
    }))
    fetchPlaces.mockResolvedValue({
      content: liveAttractions,
      totalElements: 10,
      page: 0,
      size: 20,
      hasNext: false,
    })
  })

  function mountHome() {
    return mount(HomePage, {
      props: { accessToken: '' },
      global: { plugins: [createPinia()] },
    })
  }

  it('loads the real tourist category without a review sort', async () => {
    mountHome()
    await flushPromises()

    expect(fetchPlaces).toHaveBeenCalledWith(
      { category: '관광지', sort: 'random', page: 0, size: 20 },
      undefined,
    )
  })

  it('opens a live attraction with its real place data', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.text()).toContain('실제 관광지 1')
    await wrapper.get('[data-testid="hot-place-live-77"]').trigger('click')

    expect(wrapper.emitted('openPlace')?.[0]).toEqual([liveAttractions[0]])
  })

  it('uses ten live attractions for the hot-place marquee', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="hot-place-live-"]')).toHaveLength(30)
    expect(wrapper.text()).toContain('실제 관광지 10')
  })

  it('loads five fixed famous attractions and opens their real detail', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(fetchPlace.mock.calls.map(([placeId]) => placeId)).toEqual([8, 8802, 9127, 38974, 41004])
    expect(wrapper.findAll('[data-testid="hero-indicator"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="hero-attraction"]').text()).toContain('경복궁')
    expect(wrapper.get('[data-testid="hero-attraction"] img').attributes('src')).toBe('https://example.com/hero-original-8.jpg')
    await wrapper.get('[data-testid="hero-attraction"]').trigger('click')
    expect(wrapper.emitted('openPlace')?.[0]?.[0]).toEqual(expect.objectContaining({ id: 8 }))
  })

  it('shows navigable fallback attractions when the API fails', async () => {
    fetchPlaces.mockRejectedValueOnce(new Error('network error'))
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.text()).toContain('성산일출봉')
    await wrapper.get('[data-testid="hot-place-fallback-성산일출봉"]').trigger('click')

    expect(wrapper.emitted('searchPlace')?.[0]).toEqual(['성산일출봉'])
  })

  it('skips API attractions without a real photo', async () => {
    fetchPlaces.mockResolvedValueOnce({
      content: [
        {
          ...liveAttraction,
          id: 76,
          title: '사진 없는 관광지',
          image: '/images/default-place.svg',
          thumbnailImage: '/images/default-place.svg',
          detailImage: '/images/default-place.svg',
        },
        liveAttraction,
      ],
      totalElements: 2,
      page: 0,
      size: 12,
      hasNext: false,
    })
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.text()).not.toContain('사진 없는 관광지')
    expect(wrapper.text()).toContain('실제 관광지')
  })

  it('renders live card images through SafeImage without an AI badge', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'SafeImage' }).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('AI 추천')
  })

  it('emits a real search query when a trending keyword is clicked', async () => {
    const wrapper = mountHome()
    await flushPromises()

    const keyword = wrapper.get('[data-testid="trending-keyword"]')
    const query = keyword.attributes('data-query')
    await keyword.trigger('click')

    expect(wrapper.emitted('searchPlace')?.[0]).toEqual([query])
  })

  it('opens the selected mock popular post detail', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.text()).toContain('해 뜨기 전부터 밤바다까지, 부산 하루 코스')
    await wrapper.get('[data-testid="mock-community-post--201"]').trigger('click')

    expect(wrapper.emitted('openCommunityPost')?.[0]).toEqual([-201])
  })
})
