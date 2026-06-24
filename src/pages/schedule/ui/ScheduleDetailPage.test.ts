import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScheduleDetailPage from './ScheduleDetailPage.vue'
import type { Trip } from '@/entities/travel/model/travel'
import { VoteRequestError } from '@/entities/travel/api/tripVoteApi'

const { fetchChatMessages, getChatSocketUrl } = vi.hoisted(() => ({
  fetchChatMessages: vi.fn(),
  getChatSocketUrl: vi.fn(),
}))
const { fetchPlaces } = vi.hoisted(() => ({
  fetchPlaces: vi.fn(),
}))
const {
  analyzeTripChat,
  applyAiAnalysisRun,
  applyAiSuggestion,
  getAiSuggestions,
  rejectAiAnalysisRun,
  rejectAiSuggestion,
} = vi.hoisted(() => ({
  analyzeTripChat: vi.fn(),
  applyAiAnalysisRun: vi.fn(),
  applyAiSuggestion: vi.fn(),
  getAiSuggestions: vi.fn(),
  rejectAiAnalysisRun: vi.fn(),
  rejectAiSuggestion: vi.fn(),
}))
const {
  castTripVoteBallot,
  closeTripVote,
  createAiSuggestionVote,
  getTripVote,
} = vi.hoisted(() => ({
  castTripVoteBallot: vi.fn(),
  closeTripVote: vi.fn(),
  createAiSuggestionVote: vi.fn(),
  getTripVote: vi.fn(),
}))
const {
  createChecklistItem,
  createTripSchedule,
  deleteChecklistItem,
  deleteScheduleItem,
  fetchChecklistItems,
  fetchTripMembers,
  fetchTripSchedules,
  updateTripMemberRole,
  updateTripSchedule,
} = vi.hoisted(() => ({
  createChecklistItem: vi.fn(),
  createTripSchedule: vi.fn(),
  deleteChecklistItem: vi.fn(),
  deleteScheduleItem: vi.fn(),
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

vi.mock('@/entities/travel/api/tripAiApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripAiApi')>()
  return {
    ...actual,
    analyzeTripChat,
    applyAiAnalysisRun,
    applyAiSuggestion,
    getAiSuggestions,
    rejectAiAnalysisRun,
    rejectAiSuggestion,
  }
})

vi.mock('@/entities/travel/api/tripVoteApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripVoteApi')>()
  return {
    ...actual,
    castTripVoteBallot,
    closeTripVote,
    createAiSuggestionVote,
    getTripVote,
  }
})

vi.mock('@/entities/travel/api/tripApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/travel/api/tripApi')>()
  return {
    ...actual,
    createChecklistItem,
    createTripSchedule,
    deleteChecklistItem,
    deleteScheduleItem,
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

function createAiSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    aiSuggestionId: 31,
    analysisRunId: 12,
    suggestedPlaceId: 351,
    suggestedPlaceName: '해운대해수욕장',
    suggestedRegionHint: '부산 해운대구',
    title: '해운대 방문',
    summary: '오전에 해운대를 방문하는 일정',
    reason: '채팅에서 오전 방문에 합의했어요.',
    scheduleDate: '2026-07-01',
    startTime: '10:00:00',
    endTime: '12:00:00',
    dayNo: 1,
    sortOrder: 1,
    status: 'PENDING',
    voteId: null,
    appliedScheduleItemId: null,
    createdAt: '2026-06-23T12:00:00',
    appliedAt: null,
    ...overrides,
  }
}

function createVote(overrides: Record<string, unknown> = {}) {
  return {
    voteId: 41,
    tripId: 1,
    creatorUserId: 10,
    title: 'AI 일정 제안 투표',
    status: 'OPEN',
    startedAt: '2026-06-24T10:00:00',
    endedAt: null,
    options: [
      { voteOptionId: 501, placeId: null, optionTitle: '찬성', description: null, sortOrder: 1, voteCount: 1 },
      { voteOptionId: 502, placeId: null, optionTitle: '반대', description: null, sortOrder: 2, voteCount: 0 },
    ],
    selectedOptionId: null,
    totalBallotCount: 1,
    eligibleVoterCount: 3,
    votedMemberCount: 1,
    allMembersVoted: false,
    ...overrides,
  }
}

describe('ScheduleDetailPage collaboration controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAiSuggestions.mockReset()
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
    getAiSuggestions.mockResolvedValue([])
    analyzeTripChat.mockResolvedValue({
      analysisRunId: 12,
      triggerType: 'BUTTON',
      status: 'SUCCEEDED',
      suggestions: [createAiSuggestion()],
    })
    applyAiSuggestion.mockResolvedValue(createAiSuggestion({ status: 'APPLIED', appliedScheduleItemId: 200 }))
    rejectAiSuggestion.mockResolvedValue(createAiSuggestion({ status: 'REJECTED' }))
    applyAiAnalysisRun.mockResolvedValue([createAiSuggestion({ status: 'APPLIED', appliedScheduleItemId: 200 })])
    rejectAiAnalysisRun.mockResolvedValue([createAiSuggestion({ status: 'REJECTED' })])
    createAiSuggestionVote.mockResolvedValue(createVote())
    getTripVote.mockResolvedValue(createVote())
    castTripVoteBallot.mockResolvedValue(createVote({ selectedOptionId: 501, totalBallotCount: 2, votedMemberCount: 2 }))
    closeTripVote.mockResolvedValue(createVote({
      status: 'CLOSED',
      endedAt: '2026-06-24T11:00:00',
      votedMemberCount: 3,
      allMembersVoted: true,
    }))
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

  it('shows an always-visible empty AI suggestion section and loads pending suggestions', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(getAiSuggestions).toHaveBeenCalledWith('token', 1, 'PENDING')
    expect(wrapper.get('[data-testid="ai-suggestions-section"]').text()).toContain('아직 도착한 AI 일정 제안이 없습니다.')
  })

  it('keeps chat messages inside a fixed-height scroll area', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="schedule-chat-section"]').classes()).toContain('h-[520px]')
    expect(wrapper.get('[data-testid="schedule-chat-list"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'overflow-y-auto']),
    )
  })

  it('gives the full schedule more desktop height', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.get('aside').classes()).toContain('xl:min-h-[480px]')
    expect(wrapper.get('aside').classes()).toContain('xl:max-h-[calc(100vh-300px)]')
    expect(wrapper.html()).toContain('xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]')
  })

  it('paginates AI suggestions three at a time', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ aiSuggestionId: 31, title: 'Suggestion 1' }),
      createAiSuggestion({ aiSuggestionId: 32, title: 'Suggestion 2' }),
      createAiSuggestion({ aiSuggestionId: 33, title: 'Suggestion 3' }),
      createAiSuggestion({ aiSuggestionId: 34, title: 'Suggestion 4' }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Suggestion 1')
    expect(wrapper.text()).toContain('Suggestion 3')
    expect(wrapper.text()).not.toContain('Suggestion 4')
    expect(wrapper.get('[data-testid="ai-page-indicator"]').text()).toContain('1 / 2')

    await wrapper.get('[data-testid="ai-page-next"]').trigger('click')

    expect(wrapper.text()).not.toContain('Suggestion 1')
    expect(wrapper.text()).toContain('Suggestion 4')
    expect(wrapper.get('[data-testid="ai-page-indicator"]').text()).toContain('2 / 2')

    await wrapper.get('[data-testid="ai-page-previous"]').trigger('click')
    expect(wrapper.text()).toContain('Suggestion 1')
  })

  it('vertically centers the applied status beside card actions', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'APPLIED', appliedScheduleItemId: 200 }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('PERSONAL'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    const appliedStatus = wrapper.get('[data-testid="ai-applied-status-31"]')
    expect(appliedStatus.classes()).toEqual(expect.arrayContaining(['inline-flex', 'min-h-8', 'items-center', 'justify-center']))
  })

  it('shows analysis results immediately below the chat', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="ai-additional-request"]').setValue('바다를 먼저 가고 싶어요')
    await wrapper.get('[data-testid="analyze-trip-chat"]').trigger('click')
    await flushPromises()

    expect(analyzeTripChat).toHaveBeenCalledWith('token', 1, {
      messageLimit: 100,
      additionalRequest: '바다를 먼저 가고 싶어요',
    })
    expect(wrapper.get('[data-testid="ai-suggestions-section"]').text()).toContain('해운대 방문')
  })

  it('shows a no-result notice and toast when manual analysis cannot make suggestions', async () => {
    analyzeTripChat.mockResolvedValueOnce({
      analysisRunId: 12,
      triggerType: 'BUTTON',
      status: 'NO_RESULT',
      suggestions: [],
    })
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="analyze-trip-chat"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="ai-no-result"]').text()).toContain('AI가 일정을 판단하지 못했습니다.')
    expect(wrapper.emitted('saved')).toContainEqual(['AI가 일정을 판단하지 못했습니다.'])
  })

  it('reloads suggestions when the current trip receives an AI analysis completion event', async () => {
    getAiSuggestions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createAiSuggestion({ aiSuggestionId: 32, title: '새 AI 제안' })])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    socket.emit('message', {
      data: JSON.stringify({
        type: 'AI_ANALYSIS_COMPLETED',
        tripId: 1,
        analysisRunId: 13,
      }),
    })
    await flushPromises()

    expect(getAiSuggestions).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('새 AI 제안')
    expect(wrapper.emitted('saved')).toContainEqual(['새로운 AI 일정 제안이 도착했습니다.'])
  })

  it('shows a no-result notice when the current trip receives a no-result event', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()
    getAiSuggestions.mockClear()

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    const message = '메시지가 너무 적거나 일정 관련 내용이 없어 제안을 만들지 못했습니다.'
    socket.emit('message', {
      data: JSON.stringify({
        type: 'AI_ANALYSIS_NO_RESULT',
        tripId: 1,
        analysisRunId: 12,
        reasonCode: 'NO_SCHEDULE_CONTEXT',
        message,
      }),
    })
    await flushPromises()

    expect(getAiSuggestions).toHaveBeenCalledWith('token', 1, 'PENDING')
    expect(wrapper.get('[data-testid="ai-no-result"]').text()).toContain(message)
    expect(wrapper.emitted('saved')).toContainEqual([message])
  })

  it('ignores a no-result event for another trip', async () => {
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()
    getAiSuggestions.mockClear()
    const savedCount = wrapper.emitted('saved')?.length ?? 0

    const socket = MockWebSocket.instances[0]
    if (!socket) throw new Error('chat socket was not created')
    socket.emit('message', {
      data: JSON.stringify({
        type: 'AI_ANALYSIS_NO_RESULT',
        tripId: 2,
        analysisRunId: 12,
        reasonCode: 'INSUFFICIENT_MESSAGES',
        message: '',
      }),
    })
    await flushPromises()

    expect(getAiSuggestions).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="ai-no-result"]').exists()).toBe(false)
    expect(wrapper.emitted('saved')?.length ?? 0).toBe(savedCount)
  })

  it('applies and rejects individual suggestions for a personal trip', async () => {
    getAiSuggestions
      .mockResolvedValueOnce([
        createAiSuggestion(),
        createAiSuggestion({ aiSuggestionId: 32, title: 'DB 미연결 일정', suggestedPlaceId: null }),
      ])
      .mockResolvedValue([])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('PERSONAL'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="open-ai-place-31"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="open-ai-place-32"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('DB에 연결되지 않은 장소지만 자유 일정으로 적용할 수 있습니다.')
    expect(wrapper.get('[data-testid="apply-ai-suggestion-31"]').text()).toContain('수락')
    expect(wrapper.find('[data-testid="create-ai-vote-31"]').exists()).toBe(false)
    await wrapper.get('[data-testid="apply-ai-suggestion-31"]').trigger('click')
    await flushPromises()

    expect(applyAiSuggestion).toHaveBeenCalledWith('token', 1, 31)
    expect(fetchTripSchedules).toHaveBeenCalledTimes(2)

    getAiSuggestions.mockResolvedValueOnce([])
    await wrapper.get('[data-testid="ai-status-REJECTED"]').trigger('click')
    await flushPromises()
    getAiSuggestions.mockResolvedValueOnce([createAiSuggestion({ aiSuggestionId: 33 })])
    await wrapper.get('[data-testid="ai-status-PENDING"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reject-ai-suggestion-33"]').trigger('click')
    await flushPromises()

    expect(rejectAiSuggestion).toHaveBeenCalledWith('token', 1, 33)
  })

  it('applies every pending suggestion in a personal analysis run and refreshes schedules', async () => {
    getAiSuggestions
      .mockResolvedValueOnce([createAiSuggestion(), createAiSuggestion({ aiSuggestionId: 32 })])
      .mockResolvedValueOnce([])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('PERSONAL'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="apply-ai-run-12"]').trigger('click')
    await flushPromises()

    expect(applyAiAnalysisRun).toHaveBeenCalledWith('token', 1, 12)
    expect(fetchTripSchedules).toHaveBeenCalledTimes(2)
  })

  it('creates a vote instead of showing direct apply for a pending team suggestion', async () => {
    getAiSuggestions
      .mockResolvedValueOnce([createAiSuggestion()])
      .mockResolvedValueOnce([createAiSuggestion({ status: 'VOTING', voteId: 41 })])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="apply-ai-suggestion-31"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="apply-ai-run-12"]').exists()).toBe(false)
    await wrapper.get('[data-testid="create-ai-vote-31"]').trigger('click')
    await flushPromises()

    expect(createAiSuggestionVote).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="create-ai-vote-modal"]').text()).toContain('해운대 방문')
    expect(wrapper.get('[data-testid="create-ai-vote-modal"]').text()).toContain('2026년 7월 1일')
    expect(wrapper.get('[data-testid="create-ai-vote-modal"]').text()).toContain('해운대해수욕장')

    await wrapper.get('[data-testid="confirm-create-ai-vote"]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(createAiSuggestionVote).toHaveBeenCalledWith('token', 1, 31)
    expect(getAiSuggestions).toHaveBeenLastCalledWith('token', 1, 'VOTING')
    expect(wrapper.text()).toContain('투표 진행 중')
    expect(wrapper.find('[data-testid="create-ai-vote-modal"]').exists()).toBe(false)
  })

  it('does not create a team suggestion vote when confirmation is cancelled', async () => {
    getAiSuggestions.mockResolvedValueOnce([createAiSuggestion()])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="create-ai-vote-31"]').trigger('click')
    await wrapper.get('[data-testid="cancel-create-ai-vote"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(createAiSuggestionVote).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="create-ai-vote-modal"]').exists()).toBe(false)
  })

  it('vertically centers the rejected status beside card actions', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'REJECTED' }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('PERSONAL'),
        accessToken: 'token',
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    const rejectedStatus = wrapper.get('[data-testid="ai-rejected-status-31"]')
    expect(rejectedStatus.classes()).toEqual(expect.arrayContaining(['inline-flex', 'min-h-8', 'items-center', 'justify-center']))
  })

  it('shows team vote progress and prevents closing before every member votes', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 20, email: 'editor@test.com', nickname: 'editor', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('투표 진행 중')
    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()

    expect(getTripVote).toHaveBeenCalledWith('token', 1, 41)
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('찬성')
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('투표 완료 1/3')
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('모든 팀원이 투표하면 종료됩니다.')
    expect(wrapper.get('[data-testid="close-ai-vote"]').attributes('disabled')).toBeDefined()
  })

  it('automatically closes and refreshes an AI vote after the final editor ballot', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    castTripVoteBallot.mockResolvedValueOnce(createVote({
      selectedOptionId: 501,
      totalBallotCount: 3,
      votedMemberCount: 3,
      allMembersVoted: true,
    }))
    getTripVote
      .mockResolvedValueOnce(createVote())
      .mockResolvedValueOnce(createVote({
        status: 'CLOSED',
        endedAt: '2026-06-24T11:00:00',
        totalBallotCount: 3,
        votedMemberCount: 3,
        allMembersVoted: true,
      }))
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 20, email: 'editor@test.com', nickname: 'editor', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="cast-vote-option-501"]').trigger('click')
    await flushPromises()

    expect(castTripVoteBallot).toHaveBeenCalledWith('token', 1, 41, 501)
    expect(closeTripVote).toHaveBeenCalledWith('token', 1, 41)
    expect(getAiSuggestions).toHaveBeenCalled()
    expect(fetchTripSchedules).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('투표 종료')
  })

  it('does not automatically close after the final ballot when the user cannot edit the trip', async () => {
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    castTripVoteBallot.mockResolvedValueOnce(createVote({
      selectedOptionId: 501,
      totalBallotCount: 3,
      votedMemberCount: 3,
      allMembersVoted: true,
    }))
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 30, email: 'viewer@test.com', nickname: 'viewer', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="cast-vote-option-501"]').trigger('click')
    await flushPromises()

    expect(closeTripVote).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('투표 완료 3/3')
  })

  it('keeps a vote open when closing fails with a schedule conflict', async () => {
    closeTripVote.mockRejectedValueOnce(new VoteRequestError(
      409,
      '투표 또는 제안 상태가 변경되었거나 일정 시간이 충돌합니다. 최신 상태를 확인해 주세요.',
      'Schedule time conflicts with an existing item',
    ))
    getTripVote.mockResolvedValue(createVote({ votedMemberCount: 3, allMembersVoted: true }))
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 10, email: 'owner@test.com', nickname: 'owner', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="close-ai-vote"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('일정 시간이 충돌합니다')
    expect(wrapper.find('[data-testid="close-ai-vote"]').exists()).toBe(true)
    expect(fetchTripSchedules).toHaveBeenCalledTimes(1)
  })

  it('recovers without a failure toast when another client already closed the vote', async () => {
    closeTripVote.mockRejectedValueOnce(new VoteRequestError(
      409,
      '투표 또는 제안 상태가 변경되었거나 일정 시간이 충돌합니다. 최신 상태를 확인해 주세요.',
      'Vote is already closed',
    ))
    getTripVote
      .mockResolvedValueOnce(createVote({ votedMemberCount: 3, allMembersVoted: true }))
      .mockResolvedValueOnce(createVote({
        status: 'CLOSED',
        endedAt: '2026-06-24T11:00:00',
        votedMemberCount: 3,
        allMembersVoted: true,
      }))
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 10, email: 'owner@test.com', nickname: 'owner', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="close-ai-vote"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('투표 종료')
    expect(fetchTripSchedules).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('saved') ?? []).not.toContainEqual([
      '투표 또는 제안 상태가 변경되었거나 일정 시간이 충돌합니다. 최신 상태를 확인해 주세요.',
    ])
  })

  it('reloads and keeps the vote open when the server says members are still missing', async () => {
    castTripVoteBallot.mockResolvedValueOnce(createVote({
      selectedOptionId: 501,
      totalBallotCount: 3,
      votedMemberCount: 3,
      allMembersVoted: true,
    }))
    closeTripVote.mockRejectedValueOnce(new VoteRequestError(
      409,
      '투표 또는 제안 상태가 변경되었거나 일정 시간이 충돌합니다. 최신 상태를 확인해 주세요.',
      'All trip members must vote before closing',
    ))
    getTripVote
      .mockResolvedValueOnce(createVote())
      .mockResolvedValueOnce(createVote({ votedMemberCount: 2, allMembersVoted: false }))
    getAiSuggestions.mockResolvedValueOnce([
      createAiSuggestion({ status: 'VOTING', voteId: 41 }),
    ])
    const wrapper = mount(ScheduleDetailPage, {
      props: {
        trip: createTrip('TEAM'),
        accessToken: 'token',
        currentUser: { userId: 10, email: 'owner@test.com', nickname: 'owner', role: 'USER', localAccount: true },
      },
      global: { stubs: { Transition: false } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-ai-vote-31"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="cast-vote-option-501"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('투표 완료 2/3')
    expect(wrapper.get('[data-testid="ai-vote-modal"]').text()).toContain('모든 팀원이 투표하면 종료됩니다.')
    expect(wrapper.get('[data-testid="close-ai-vote"]').attributes('disabled')).toBeDefined()
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
    expect(wrapper.get('[data-testid="schedule-flow-modal"]').text()).toContain('ITINERARY')
    expect(wrapper.get('[data-testid="schedule-rail-track"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-rail-sleeper-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-station-node-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-ticket-notch-left-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-ticket-notch-right-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-ticket-perforation-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-ticket-time-120"]').text()).toContain('10:00')
    expect(wrapper.get('[data-testid="schedule-ticket-serration-left-120"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="schedule-ticket-serration-right-120"]')).toBeTruthy()
    expect(wrapper.find('[data-testid="schedule-ticket-number-stub-120"]').exists()).toBe(false)
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

  it('blocks creating a schedule item when the end time is before the start time', async () => {
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
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Late dinner')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-01')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('20:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('19:00')

    expect(wrapper.get('[data-testid="save-schedule-button"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(createTripSchedule).not.toHaveBeenCalled()
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

  it('uses the trip date range to calculate the schedule day number', async () => {
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
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Second day cafe')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-02')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('09:00')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(createTripSchedule).toHaveBeenCalledWith('token', 1, expect.objectContaining({
      scheduleDate: '2026-07-02',
      dayNo: 2,
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

  it('blocks updating a schedule item when the end time is before the start time', async () => {
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
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('18:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('17:00')

    expect(wrapper.get('[data-testid="save-schedule-button"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(updateTripSchedule).not.toHaveBeenCalled()
  })

  it('asks before replacing an existing schedule when a new item has the same start time', async () => {
    updateTripSchedule.mockResolvedValue({
      scheduleItemId: 99,
      tripId: 1,
      placeId: null,
      createdByUserId: 10,
      dayNo: 1,
      scheduleDate: '2026-07-01',
      startTime: '15:00:00',
      endTime: '16:30:00',
      title: 'Replacement schedule',
      memo: 'new memo',
      sortOrder: 1,
      createdAt: '2026-06-23T10:00:00',
      updatedAt: '2026-06-23T11:10:00',
    })

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
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Replacement schedule')
    await wrapper.get('[data-testid="schedule-date-input"]').setValue('2026-07-01')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('15:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('16:30')
    await wrapper.get('[data-testid="schedule-memo-input"]').setValue('new memo')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="replace-schedule-modal"]').text()).toContain('자유시간')
    expect(createTripSchedule).not.toHaveBeenCalled()
    expect(updateTripSchedule).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="confirm-replace-schedule"]').trigger('click')
    await flushPromises()

    expect(updateTripSchedule).toHaveBeenCalledWith('token', 1, 99, {
      placeId: null,
      scheduleDate: '2026-07-01',
      startTime: '15:00:00',
      endTime: '16:30:00',
      title: 'Replacement schedule',
      memo: 'new memo',
      dayNo: 1,
      sortOrder: 1,
    })
    expect(createTripSchedule).not.toHaveBeenCalled()
    expect(deleteScheduleItem).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('15:00 Replacement schedule')
  })

  it('asks before replacing another schedule when an edited start time conflicts', async () => {
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
        title: 'Original schedule',
        memo: '',
        sortOrder: 1,
        createdAt: '2026-06-23T10:00:00',
        updatedAt: '2026-06-23T10:00:00',
      },
      {
        scheduleItemId: 120,
        tripId: 1,
        placeId: null,
        createdByUserId: 10,
        dayNo: 1,
        scheduleDate: '2026-07-01',
        startTime: '17:00:00',
        endTime: '18:00:00',
        title: 'Conflicting schedule',
        memo: '',
        sortOrder: 2,
        createdAt: '2026-06-23T10:00:00',
        updatedAt: '2026-06-23T10:00:00',
      },
    ])
    updateTripSchedule.mockResolvedValue({
      scheduleItemId: 99,
      tripId: 1,
      placeId: null,
      createdByUserId: 10,
      dayNo: 1,
      scheduleDate: '2026-07-01',
      startTime: '17:00:00',
      endTime: '18:00:00',
      title: 'Moved schedule',
      memo: '',
      sortOrder: 2,
      createdAt: '2026-06-23T10:00:00',
      updatedAt: '2026-06-23T11:10:00',
    })
    deleteScheduleItem.mockResolvedValue(undefined)

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
    await wrapper.get('[data-testid="schedule-title-input"]').setValue('Moved schedule')
    await wrapper.get('[data-testid="schedule-start-input"]').setValue('17:00')
    await wrapper.get('[data-testid="schedule-end-input"]').setValue('18:00')
    await wrapper.get('[data-testid="save-schedule-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="replace-schedule-modal"]').text()).toContain('Conflicting schedule')
    expect(updateTripSchedule).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="confirm-replace-schedule"]').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(updateTripSchedule).toHaveBeenCalledWith('token', 1, 99, expect.objectContaining({
      startTime: '17:00:00',
      endTime: '18:00:00',
      title: 'Moved schedule',
      sortOrder: 2,
    }))
    expect(deleteScheduleItem).toHaveBeenCalledWith('token', 1, 120)
    expect(deleteScheduleItem.mock.invocationCallOrder[0]!).toBeLessThan(updateTripSchedule.mock.invocationCallOrder[0]!)
    expect(wrapper.text()).toContain('17:00 Moved schedule')
    expect(wrapper.find('[data-testid="schedule-card-120"]').exists()).toBe(false)
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
