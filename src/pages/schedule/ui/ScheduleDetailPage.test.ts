import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScheduleDetailPage from './ScheduleDetailPage.vue'
import type { Trip } from '@/entities/travel/model/travel'

const { fetchChatMessages, getChatSocketUrl } = vi.hoisted(() => ({
  fetchChatMessages: vi.fn(),
  getChatSocketUrl: vi.fn(),
}))
const { fetchPlaces } = vi.hoisted(() => ({
  fetchPlaces: vi.fn(),
}))
const {
  createChecklistItem,
  createTripSchedule,
  deleteChecklistItem,
  fetchChecklistItems,
  fetchTripMembers,
  fetchTripSchedules,
  updateTripMemberRole,
  updateTripSchedule,
} = vi.hoisted(() => ({
  createChecklistItem: vi.fn(),
  createTripSchedule: vi.fn(),
  deleteChecklistItem: vi.fn(),
  fetchChecklistItems: vi.fn(),
  fetchTripMembers: vi.fn(),
  fetchTripSchedules: vi.fn(),
  updateTripMemberRole: vi.fn(),
  updateTripSchedule: vi.fn(),
}))

vi.mock('@/entities/chat/api/chatApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/chat/api/chatApi')>()
  return { ...actual, fetchChatMessages, getChatSocketUrl }
})

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return { ...actual, fetchPlaces }
})

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return {
    ...actual,
    createChecklistItem,
    createTripSchedule,
    deleteChecklistItem,
    fetchChecklistItems,
    fetchTripMembers,
    fetchTripSchedules,
    updateTripMemberRole,
    updateTripSchedule,
  }
})

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  readyState = MockWebSocket.OPEN
  sent: string[] = []
  listeners: Record<string, Array<(event: { data?: string }) => void>> = {}

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: (event: { data?: string }) => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener]
    if (type === 'open') listener({})
  }

  send(message: string) {
    this.sent.push(message)
  }

  emit(type: string, event: { data?: string }) {
    this.listeners[type]?.forEach((listener) => listener(event))
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
  }
}

function createTrip(tripType: string, ownerUserId = 10): Trip {
  return {
    id: 1,
    ownerUserId,
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
    vi.clearAllMocks()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    fetchChatMessages.mockResolvedValue([
      {
        messageId: 10,
        tripId: 1,
        senderUserId: 20,
        senderNickname: '경석',
        messageType: 'TEXT',
        content: '안녕',
        createdAt: '2026-06-22T13:35:00',
      },
    ])
    getChatSocketUrl.mockReturnValue('ws://localhost:8080/ws/chats?token=token')
    fetchPlaces.mockResolvedValue({
      content: [
        {
          id: 100,
          title: 'Haeundae Beach',
          location: 'Busan',
          category: 'Beach',
          description: '',
          image: '',
          rating: 0,
          reviewCount: '0',
          tags: [],
          marker: { top: '50%', left: '50%' },
          coordinates: { lat: 35.1587, lng: 129.1604 },
        },
      ],
      totalElements: 1,
      page: 0,
      size: 20,
      hasNext: false,
    })
    fetchTripMembers.mockResolvedValue([
      { userId: 10, nickname: 'owner', memberRole: 'OWNER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T10:00:00' },
      { userId: 20, nickname: 'member', memberRole: 'EDITOR', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' },
    ])
    updateTripMemberRole.mockResolvedValue({ userId: 20, nickname: 'member', memberRole: 'VIEWER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' })
    fetchTripSchedules.mockResolvedValue([
      {
        scheduleItemId: 99,
        tripId: 1,
        placeId: null,
        createdByUserId: 10,
        dayNo: 1,
        scheduleDate: '2026-07-01',
        startTime: '15:00:00',
        endTime: '16:00:00',
        title: '자유시간',
        memo: '숙소 근처',
        sortOrder: 2,
        createdAt: '2026-06-23T10:00:00',
        updatedAt: '2026-06-23T10:00:00',
      },
    ])
    createTripSchedule.mockResolvedValue({
      scheduleItemId: 100,
      tripId: 1,
      placeId: null,
      createdByUserId: 10,
      dayNo: 1,
      scheduleDate: '2026-07-01',
      startTime: '18:00:00',
      endTime: '19:00:00',
      title: '저녁',
      memo: '해산물',
      sortOrder: 3,
      createdAt: '2026-06-23T11:00:00',
      updatedAt: '2026-06-23T11:00:00',
    })
    updateTripSchedule.mockResolvedValue({
      scheduleItemId: 99,
      tripId: 1,
      placeId: null,
      createdByUserId: 10,
      dayNo: 1,
      scheduleDate: '2026-07-01',
      startTime: '17:00:00',
      endTime: '18:00:00',
      title: '수정된 자유시간',
      memo: '카페 근처',
      sortOrder: 2,
      createdAt: '2026-06-23T10:00:00',
      updatedAt: '2026-06-23T11:10:00',
    })
    fetchChecklistItems.mockResolvedValue([
      {
        checklistItemId: 99,
        tripId: 1,
        assigneeUserId: 20,
        title: '여권 챙기기',
        done: false,
        dueAt: '2026-07-01T09:00:00',
        createdAt: '2026-06-23T10:00:00',
        completedAt: null,
      },
    ])
    createChecklistItem.mockResolvedValue({
      checklistItemId: 100,
      tripId: 1,
      assigneeUserId: null,
      title: '충전기 챙기기',
      done: false,
      dueAt: null,
      createdAt: '2026-06-23T10:05:00',
      completedAt: null,
    })
    deleteChecklistItem.mockResolvedValue(undefined)
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

  it('hides member role controls when the current user is not the trip owner', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM', 10),
        accessToken: 'token',
        currentUser: {
          userId: 20,
          email: 'editor@example.com',
          nickname: 'editor',
          role: 'USER',
          localAccount: true,
        },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[aria-label="참여자 관리"]').trigger('click')

    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('새 팀원 초대하기')
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

  it('loads previous chat messages for the trip', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: '나', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    expect(fetchChatMessages).toHaveBeenCalledWith('token', 1, 50)
    expect(getChatSocketUrl).toHaveBeenCalledWith('token')
    expect(wrapper.text()).toContain('안녕')
  })

  it('subscribes to the chat socket before the previous message load finishes', async () => {
    fetchChatMessages.mockReturnValue(new Promise(() => {}))

    mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: 'me', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    expect(socket.sent).toContain(JSON.stringify({ type: 'SUBSCRIBE', tripId: 1 }))
  })

  it('shows my chat message immediately after sending', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: 'me', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="chat-input"]').setValue('show right away')
    await wrapper.get('[data-testid="chat-input"]').trigger('keyup.enter')

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    expect(socket.sent).toContain(JSON.stringify({ type: 'CHAT', tripId: 1, content: 'show right away' }))
    expect(wrapper.text()).toContain('show right away')
  })

  it('keeps a pending chat message when the initial message load finishes later', async () => {
    let resolveMessages: (messages: Awaited<ReturnType<typeof fetchChatMessages>>) => void = () => {}
    fetchChatMessages.mockReturnValue(new Promise((resolve) => {
      resolveMessages = resolve
    }))

    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: 'me', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.get('[data-testid="chat-input"]').setValue('do not erase me')
    await wrapper.get('[data-testid="chat-input"]').trigger('keyup.enter')
    expect(wrapper.text()).toContain('do not erase me')

    resolveMessages([
      {
        messageId: 10,
        tripId: 1,
        senderUserId: 20,
        senderNickname: 'member',
        messageType: 'TEXT',
        content: 'older server message',
        createdAt: '2026-06-22T13:35:00',
      },
    ])
    await flushPromises()

    expect(wrapper.text()).toContain('older server message')
    expect(wrapper.text()).toContain('do not erase me')
  })

  it('reconnects and sends the next chat when the socket was closed after a previous send', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: 'me', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="chat-input"]').setValue('first message')
    await wrapper.get('[data-testid="chat-input"]').trigger('keyup.enter')

    const firstSocket = MockWebSocket.instances[0]
    if (!firstSocket) throw new Error('chat socket was not created')
    firstSocket.readyState = MockWebSocket.CLOSED

    await wrapper.get('[data-testid="chat-input"]').setValue('second message')
    await wrapper.get('[data-testid="chat-input"]').trigger('keyup.enter')

    const secondSocket = MockWebSocket.instances[1]
    if (!secondSocket) throw new Error('chat socket was not reconnected')
    expect(secondSocket.sent).toContain(JSON.stringify({ type: 'SUBSCRIBE', tripId: 1 }))
    expect(secondSocket.sent).toContain(JSON.stringify({ type: 'CHAT', tripId: 1, content: 'second message' }))
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.text()).toContain('second message')
  })

  it('appends chat messages received from another user over websocket', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 8, email: 'me@test.com', nickname: 'me', role: 'USER', localAccount: true },
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    })
    await flushPromises()

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    socket.emit('message', {
      data: JSON.stringify({
        type: 'MESSAGE',
        tripId: 1,
        message: {
          messageId: 11,
          tripId: 1,
          senderUserId: 20,
          senderNickname: 'member',
          messageType: 'TEXT',
          content: 'live from teammate',
          createdAt: '2026-06-22T13:36:00',
        },
        error: null,
      }),
    })
    await flushPromises()

    expect(wrapper.text()).toContain('live from teammate')
  })

  it('loads schedule items for the trip', async () => {
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

    expect(fetchTripSchedules).toHaveBeenCalledWith('token', 1)
    expect(wrapper.text()).toContain('15:00 자유시간')
    expect(wrapper.text()).toContain('숙소 근처')
  })

  it('keeps schedule card actions fixed and clamps long notes', async () => {
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

    expect(wrapper.get('[data-testid="schedule-card-99"]').classes()).toContain('grid')
    expect(wrapper.get('[data-testid="schedule-note-99"]').classes()).toContain('line-clamp-2')
    expect(wrapper.get('[data-testid="schedule-actions-99"]').classes()).toEqual(expect.arrayContaining(['grid', 'grid-cols-2']))
  })

  it('opens the schedule flow modal focused on the clicked place schedule card', async () => {
    fetchTripSchedules.mockResolvedValueOnce([
      {
        scheduleItemId: 120,
        tripId: 1,
        placeId: 100,
        createdByUserId: 10,
        dayNo: 1,
        scheduleDate: '2026-07-01',
        startTime: '10:00:00',
        endTime: '11:00:00',
        title: 'Haeundae Beach',
        memo: 'long beach memo',
        sortOrder: 1,
        createdAt: '2026-06-23T10:00:00',
        updatedAt: '2026-06-23T10:00:00',
      },
    ])
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

    await wrapper.get('[data-testid="schedule-card-120"]').trigger('click')

    expect(wrapper.get('[data-testid="schedule-flow-modal"]').text()).toContain('Haeundae Beach')
    expect(wrapper.get('[data-testid="schedule-flow-modal"]').text()).toContain('long beach memo')
    expect(wrapper.get('[data-testid="schedule-flow-modal"]').text()).not.toContain('장소 #100')
    expect(wrapper.get('[data-testid="schedule-flow-item-120"]').classes()).toEqual(expect.arrayContaining(['ring-2', 'ring-brand-300']))
    expect(wrapper.emitted('openPlace')).toBeUndefined()
    await wrapper.get('[data-testid="open-flow-place-detail"]').trigger('click')

    expect(wrapper.emitted('openPlace')).toEqual([[100]])
  })

  it('opens the schedule flow modal focused on the clicked free schedule card', async () => {
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

    await wrapper.get('[data-testid="schedule-card-99"]').trigger('click')

    expect(wrapper.get('[data-testid="schedule-flow-modal"]').text()).toContain('자유시간')
    expect(wrapper.get('[data-testid="schedule-flow-item-99"]').classes()).toEqual(expect.arrayContaining(['ring-2', 'ring-brand-300']))
    expect(wrapper.emitted('openPlace')).toBeUndefined()
  })

  it('creates a free schedule item through the schedule API', async () => {
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

    await wrapper.get('[data-testid="open-schedule-form"]').trigger('click')
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('저녁')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-01')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('18:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('19:00')
    await wrapper.get('[data-testid="schedule-memo-input"]').setValue('해산물')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(createTripSchedule).toHaveBeenCalledWith('token', 1, {
      placeId: null,
      scheduleDate: '2026-07-01',
      startTime: '18:00:00',
      endTime: '19:00:00',
      title: '저녁',
      memo: '해산물',
      dayNo: 1,
      sortOrder: 2,
    })
    expect(wrapper.text()).toContain('18:00 저녁')
  })

  it('creates a place schedule item when a place is selected in the place tab', async () => {
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

    await wrapper.get('[data-testid="open-schedule-form"]').trigger('click')
    await wrapper.get('[data-testid="schedule-place-tab"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="schedule-place-search-input"]').setValue('Haeundae')
    await flushPromises()
    await wrapper.get('[data-testid="schedule-place-result-100"]').trigger('click')
    expect(wrapper.find('[data-testid="schedule-place-result-100"]').exists()).toBe(false)
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Haeundae walk')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-01')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('10:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('11:30')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(fetchPlaces).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'Haeundae', page: 0, size: 8 }))
    expect(createTripSchedule).toHaveBeenCalledWith('token', 1, expect.objectContaining({
      placeId: 100,
      scheduleDate: '2026-07-01',
      startTime: '10:00:00',
      endTime: '11:30:00',
      title: 'Haeundae walk',
    }))
  })

  it('clears the selected place when the place search text changes after selection', async () => {
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

    await wrapper.get('[data-testid="open-schedule-form"]').trigger('click')
    await wrapper.get('[data-testid="schedule-place-tab"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="schedule-place-search-input"]').setValue('Haeundae')
    await flushPromises()
    await wrapper.get('[data-testid="schedule-place-result-100"]').trigger('click')
    await wrapper.get('[data-testid="schedule-place-search-input"]').setValue('Other place')
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Changed place')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-01')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('10:00')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(createTripSchedule).toHaveBeenCalledWith('token', 1, expect.objectContaining({
      placeId: null,
      title: 'Changed place',
    }))
  })

  it('updates a schedule item through the schedule API', async () => {
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

    await wrapper.get('[data-testid="edit-schedule-99"]').trigger('click')
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('수정된 자유시간')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('17:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('18:00')
    await wrapper.get('[data-testid="schedule-memo-input"]').setValue('카페 근처')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(updateTripSchedule).toHaveBeenCalledWith('token', 1, 99, expect.objectContaining({
      scheduleDate: '2026-07-01',
      startTime: '17:00:00',
      endTime: '18:00:00',
      title: '수정된 자유시간',
      memo: '카페 근처',
    }))
    expect(wrapper.text()).toContain('17:00 수정된 자유시간')
  })

  it('loads checklist items for the trip', async () => {
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

    expect(fetchChecklistItems).toHaveBeenCalledWith('token', 1)
    expect(wrapper.text()).toContain('여권 챙기기')
    expect(wrapper.text()).toContain('0/1')
  })

  it('creates and deletes checklist items through the checklist API', async () => {
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

    await wrapper.get('[data-testid="checklist-title-input"]').setValue('충전기 챙기기')
    await wrapper.get('[data-testid="checklist-title-input"]').trigger('keyup.enter')
    await flushPromises()

    expect(createChecklistItem).toHaveBeenCalledWith('token', 1, { title: '충전기 챙기기' })
    expect(wrapper.text()).toContain('충전기 챙기기')

    await wrapper.get('[data-testid="delete-checklist-99"]').trigger('click')
    await flushPromises()

    expect(deleteChecklistItem).toHaveBeenCalledWith('token', 1, 99)
    expect(wrapper.text()).not.toContain('여권 챙기기')
  })

  it('toggles checklist completion locally when the checkbox is clicked', async () => {
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

    const checkbox = wrapper.get('[data-testid="checklist-done-99"]')
    await checkbox.setValue(true)

    expect(wrapper.text()).toContain('1/1')
    expect(wrapper.get('[data-testid="checklist-row-99"]').classes()).toContain('line-through')

    await checkbox.setValue(false)

    expect(wrapper.text()).toContain('0/1')
    expect(wrapper.get('[data-testid="checklist-row-99"]').classes()).not.toContain('line-through')
  })
})
