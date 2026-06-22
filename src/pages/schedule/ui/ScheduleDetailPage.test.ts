import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScheduleDetailPage from './ScheduleDetailPage.vue'
import type { Trip } from '@/entities/travel/model/travel'

const { fetchChatMessages, getChatSocketUrl } = vi.hoisted(() => ({
  fetchChatMessages: vi.fn(),
  getChatSocketUrl: vi.fn(),
}))
const { fetchTripMembers, updateTripMemberRole } = vi.hoisted(() => ({
  fetchTripMembers: vi.fn(),
  updateTripMemberRole: vi.fn(),
}))

vi.mock('@/entities/chat/api/chatApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/chat/api/chatApi')>()
  return { ...actual, fetchChatMessages, getChatSocketUrl }
})

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return { ...actual, fetchTripMembers, updateTripMemberRole }
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
})
