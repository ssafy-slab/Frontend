import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SchedulePage from './SchedulePage.vue'

const { createTrip, fetchTrips, updateTrip } = vi.hoisted(() => ({
  createTrip: vi.fn(),
  fetchTrips: vi.fn(),
  updateTrip: vi.fn(),
}))

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return {
    ...actual,
    createTrip,
    fetchTrips,
    updateTrip,
  }
})

describe('SchedulePage trip creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchTrips.mockResolvedValue([])
    createTrip.mockResolvedValue({
      id: 1,
      title: '부산 여행',
      destination: '팀 여행',
      period: '일정 미정',
      description: '새로운 여행 일정을 만들었습니다.',
      image: '/images/default-place.svg',
      members: ['여'],
      status: 'PLANNING',
      tripType: 'TEAM',
      startDate: null,
      endDate: null,
      phase: 'upcoming',
    })
  })

  it('creates a trip without asking for an unused destination', async () => {
    const wrapper = mount(SchedulePage, {
      props: {
        currentUser: { email: 'test@example.com', nickname: '여행자' },
        accessToken: 'access-token',
      },
      global: {
        stubs: {
          Plane: true,
          Plus: true,
          X: true,
          Link: true,
          MoreHorizontal: true,
          Trash2: true,
        },
      },
    })
    await flushPromises()

    const openButton = wrapper.findAll('button').find((button) => button.text().includes('새 일정 만들기'))
    expect(openButton).toBeDefined()
    await openButton!.trigger('click')

    const textInputs = wrapper.findAll('input').filter((input) => !input.attributes('type'))
    expect(textInputs).toHaveLength(1)
    expect(wrapper.text()).not.toContain('목적지')

    await textInputs[0]!.setValue('부산 여행')
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('일정 추가하기'))
    expect(createButton).toBeDefined()
    await createButton!.trigger('click')
    await flushPromises()

    expect(createTrip).toHaveBeenCalledWith('access-token', {
      title: '부산 여행',
      description: '새로운 여행 일정을 만들었습니다. 장소를 추가하고 팀원과 조율해보세요.',
      tripType: 'TEAM',
      startDate: null,
      endDate: null,
    })
  })

  it('edits a trip title and date range from management mode', async () => {
    fetchTrips.mockResolvedValueOnce([{
      id: 9,
      ownerUserId: 3,
      title: '기존 여행',
      destination: '팀 여행',
      period: '2026-07-01 - 2026-07-03',
      description: '기존 설명',
      image: '/images/default-place.svg',
      members: ['나'],
      status: 'PLANNING',
      tripType: 'TEAM',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      phase: 'upcoming',
    }])
    updateTrip.mockResolvedValueOnce({
      id: 9,
      ownerUserId: 3,
      title: '수정된 여행',
      destination: '팀 여행',
      period: '2026-08-01 - 2026-08-05',
      description: '기존 설명',
      image: '/images/default-place.svg',
      members: ['나'],
      status: 'PLANNING',
      tripType: 'TEAM',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      phase: 'upcoming',
    })

    const wrapper = mount(SchedulePage, {
      props: {
        currentUser: { email: 'test@example.com', nickname: '여행자' },
        accessToken: 'access-token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="toggle-trip-management"]').trigger('click')
    await wrapper.get('[data-testid="edit-trip-9"]').trigger('click')

    expect(wrapper.get('[data-testid="edit-trip-title"]').element).toHaveProperty('value', '기존 여행')
    expect(wrapper.get('[data-testid="edit-trip-start"]').element).toHaveProperty('value', '2026-07-01')
    expect(wrapper.get('[data-testid="edit-trip-end"]').element).toHaveProperty('value', '2026-07-03')

    await wrapper.get('[data-testid="edit-trip-title"]').setValue('수정된 여행')
    await wrapper.get('[data-testid="edit-trip-start"]').setValue('2026-08-01')
    await wrapper.get('[data-testid="edit-trip-end"]').setValue('2026-08-05')
    await wrapper.get('[data-testid="save-trip-edit"]').trigger('click')
    await flushPromises()

    expect(updateTrip).toHaveBeenCalledWith('access-token', 9, {
      title: '수정된 여행',
      description: '기존 설명',
      tripType: 'TEAM',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    })
    expect(wrapper.text()).toContain('수정된 여행')
    expect(wrapper.text()).toContain('2026-08-01 - 2026-08-05')
  })

  it('does not save when the end date is before the start date', async () => {
    fetchTrips.mockResolvedValueOnce([{
      id: 9,
      title: '기존 여행',
      destination: '팀 여행',
      period: '2026-07-01 - 2026-07-03',
      description: '기존 설명',
      image: '',
      members: ['나'],
      status: 'PLANNING',
      tripType: 'TEAM',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      phase: 'upcoming',
    }])
    const wrapper = mount(SchedulePage, {
      props: {
        currentUser: { email: 'test@example.com', nickname: '여행자' },
        accessToken: 'access-token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="toggle-trip-management"]').trigger('click')
    await wrapper.get('[data-testid="edit-trip-9"]').trigger('click')
    await wrapper.get('[data-testid="edit-trip-start"]').setValue('2026-08-05')
    await wrapper.get('[data-testid="edit-trip-end"]').setValue('2026-08-01')

    expect(wrapper.get('[data-testid="trip-edit-date-error"]').text()).toContain('종료일')
    expect(wrapper.get('[data-testid="save-trip-edit"]').attributes('disabled')).toBeDefined()
    expect(updateTrip).not.toHaveBeenCalled()
  })
})
