import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScheduleDetailPage from './ScheduleDetailPage.vue'
import type { Trip } from '@/entities/travel/model/travel'

const { fetchTripMembers, updateTripMemberRole } = vi.hoisted(() => ({
  fetchTripMembers: vi.fn(),
  updateTripMemberRole: vi.fn(),
}))

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return { ...actual, fetchTripMembers, updateTripMemberRole }
})

function createTrip(tripType: string): Trip {
  return {
    id: 1,
    title: '테스트 일정',
    destination: tripType === 'TEAM' ? '팀 여행' : '개인 여행',
    period: '2026-07-01 - 2026-07-03',
    description: '테스트 일정입니다.',
    image: '',
    members: ['나'],
    status: 'PLANNING',
    tripType,
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    phase: 'upcoming',
  }
}

describe('ScheduleDetailPage collaboration controls', () => {
  beforeEach(() => {
    fetchTripMembers.mockResolvedValue([
      { userId: 10, nickname: 'owner', memberRole: 'OWNER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T10:00:00' },
      { userId: 20, nickname: 'member', memberRole: 'EDITOR', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' },
    ])
    updateTripMemberRole.mockResolvedValue({ userId: 20, nickname: 'member', memberRole: 'VIEWER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' })
  })

  it('hides participant management for personal trips', () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('PERSONAL'),
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })

    expect(wrapper.find('[aria-label="참여자 관리"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('팀원 초대')
  })

  it('shows participant management for team trips', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('[aria-label="참여자 관리"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('팀원 초대')
    expect(fetchTripMembers).toHaveBeenCalledWith('token', 1)
  })

  it('does not allow changing a participant role to owner', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[aria-label="참여자 관리"]').trigger('click')

    const optionLabels = wrapper.findAll('select option').map((option) => option.text())
    expect(optionLabels).not.toContain('소유자')
    expect(wrapper.text()).toContain('소유자')
  })

  it('renders database members and removes the kick member action', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[aria-label="참여자 관리"]').trigger('click')

    expect(wrapper.text()).toContain('owner')
    expect(wrapper.text()).toContain('member')
    expect(wrapper.text()).not.toContain('지수')
    expect(wrapper.text()).not.toContain('민수')
    expect(wrapper.text()).toContain('편집 가능')
    expect(wrapper.text()).not.toContain('내보내기')
  })

  it('does not show mock members while database members are loading', () => {
    fetchTripMembers.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })

    expect(wrapper.text()).not.toContain('지수')
    expect(wrapper.text()).not.toContain('민수')
  })
})
