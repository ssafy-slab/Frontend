<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CalendarCheck, ChevronDown, Link, ListOrdered, MapPin, Pencil, Plus, Search, Send, Trash2, UserCog, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { createChatMessagePayload, createChatSubscribePayload, fetchChatMessages, getChatSocketUrl } from '@/entities/chat/api/chatApi'
import type { ChatMessageResponse, ChatSocketMessage } from '@/entities/chat/api/chatApi'
import { fetchPlaces } from '@/entities/place/api/placeApi'
import { createChecklistItem, createInviteCode, createTripSchedule, deleteChecklistItem, deleteScheduleItem, fetchChecklistItems, fetchTripMembers, fetchTripSchedules, updateTripMemberRole, updateTripSchedule } from '@/entities/travel/api/tripApi'
import type { ChecklistItemResponse, TripMemberResponse, TripMemberRole, TripSchedulePayload, TripScheduleResponse } from '@/entities/travel/api/tripApi'
import { canInviteTripMembers } from '@/entities/travel/model/tripAccess'
import type { Place } from '@/entities/travel/model/travel'

const props = defineProps<{
  trip: Trip | null
  accessToken?: string
  currentUser?: AuthUser | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
  openPlace: [placeId: number]
}>()

type ScheduleItem = {
  id: number
  scheduleItemId?: number
  placeId?: number | null
  date: string
  time: string
  endTime?: string
  title: string
  note: string
  category: string
  location: string
  active?: boolean
}

type Message = {
  id: number | string
  author: string
  text: string
  mine?: boolean
  pending?: boolean
}

type Member = {
  id: number
  name: string
  email?: string
  role: string
  apiRole?: TripMemberRole
  owner?: boolean
}

const messageText = ref('')
const showInviteModal = ref(false)
const showMemberModal = ref(false)
const showOrderModal = ref(false)
const showScheduleModal = ref(false)
const inviteCode = ref('')
const isSaving = ref(false)
const isSavingChecklist = ref(false)
const isLoadingSchedules = ref(false)
const isLoadingPlaces = ref(false)
const isLoadingChecklist = ref(false)
const isLoadingMembers = ref(false)
const isLoadingMessages = ref(false)
const chatSocket = ref<WebSocket | null>(null)
const chatListEl = ref<HTMLElement | null>(null)
const pendingChatMessages = ref<string[]>([])
const chatLoadRequestId = ref(0)
const deleteScheduleTarget = ref<ScheduleItem | null>(null)
const editingSchedule = ref<ScheduleItem | null>(null)
const selectedScheduleItemId = ref<number | null>(null)
const canInviteMembers = computed(() => canInviteTripMembers(props.trip))
const canManageTripMembers = computed(() => canInviteMembers.value && props.currentUser?.userId === props.trip?.ownerUserId)
const members = ref<Member[]>([])
const checklistTitle = ref('')
const checklist = ref<ChecklistItemResponse[]>([])
const messages = ref<Message[]>([])
const scheduleItems = ref<ScheduleItem[]>([])
const placeOptions = ref<Place[]>([])
const placeSearchQuery = ref('')
const selectedSchedulePlaceTitle = ref('')
const scheduleDraft = reactive({
  mode: 'free' as 'free' | 'place',
  placeId: '',
  title: '',
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  memo: '',
})
let placeSearchRequestId = 0

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)
const scheduleGroups = computed(() => {
  const groups = new Map<string, ScheduleItem[]>()
  sortScheduleItems(scheduleItems.value).forEach((item) => {
    groups.set(item.date, [...(groups.get(item.date) ?? []), item])
  })
  return Array.from(groups, ([date, items]) => ({ date, items }))
})

function compareScheduleItems(left: ScheduleItem, right: ScheduleItem) {
  const dateCompare = left.date.localeCompare(right.date)
  if (dateCompare !== 0) return dateCompare
  const timeCompare = left.time.localeCompare(right.time)
  if (timeCompare !== 0) return timeCompare
  return left.id - right.id
}

function sortScheduleItems(items: ScheduleItem[]) {
  return [...items].sort(compareScheduleItems)
}

function getMemberRoleLabel(role: TripMemberRole) {
  if (role === 'OWNER') return '소유자'
  if (role === 'VIEWER') return '보기만 가능'
  return '편집 가능'
}

function getApiMemberRole(role: string): 'EDITOR' | 'VIEWER' {
  return role === '보기만 가능' ? 'VIEWER' : 'EDITOR'
}

function toMember(member: TripMemberResponse): Member {
  return {
    id: member.userId,
    name: member.nickname,
    role: getMemberRoleLabel(member.memberRole),
    apiRole: member.memberRole,
    owner: member.memberRole === 'OWNER',
  }
}

async function loadMembers() {
  if (!props.accessToken || !props.trip?.id || !canInviteMembers.value) return

  isLoadingMembers.value = true
  try {
    members.value = (await fetchTripMembers(props.accessToken, props.trip.id)).map(toMember)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '팀원 목록을 불러오지 못했습니다.')
  } finally {
    isLoadingMembers.value = false
  }
}

function toTimeInput(time: string | null | undefined) {
  return time ? time.slice(0, 5) : ''
}

function toApiTime(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 59)
  const hours = Math.floor(clampedMinutes / 60)
  const minutes = clampedMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getDefaultEndTime(startTime: string) {
  return minutesToTime(timeToMinutes(startTime) + 60)
}

function ensureValidEndTime() {
  if (!scheduleDraft.startTime) return
  if (!scheduleDraft.endTime || timeToMinutes(scheduleDraft.endTime) <= timeToMinutes(scheduleDraft.startTime)) {
    scheduleDraft.endTime = getDefaultEndTime(scheduleDraft.startTime)
  }
}

function getDefaultScheduleDate() {
  return props.trip?.startDate ?? new Date().toISOString().slice(0, 10)
}

function toScheduleItem(item: TripScheduleResponse): ScheduleItem {
  return {
    id: item.scheduleItemId,
    scheduleItemId: item.scheduleItemId,
    placeId: item.placeId,
    date: item.scheduleDate,
    time: toTimeInput(item.startTime),
    endTime: toTimeInput(item.endTime),
    title: item.title,
    note: item.memo ?? '',
    category: `Day ${item.dayNo}`,
    location: item.placeId ? '등록 여행지' : '자유 일정',
  }
}

async function searchSchedulePlaces() {
  const keyword = placeSearchQuery.value.trim()
  if (keyword.length < 2) {
    placeOptions.value = []
    return
  }

  const requestId = ++placeSearchRequestId
  isLoadingPlaces.value = true
  try {
    const result = await fetchPlaces({ keyword, page: 0, size: 8 })
    if (requestId === placeSearchRequestId) {
      placeOptions.value = result.content
    }
  } catch (error) {
    if (requestId === placeSearchRequestId) {
      placeOptions.value = []
      emit('saved', error instanceof Error ? error.message : '장소 목록을 불러오지 못했습니다.')
    }
  } finally {
    if (requestId === placeSearchRequestId) {
      isLoadingPlaces.value = false
    }
  }
}

function handleSchedulePlaceSearchInput() {
  if (selectedSchedulePlaceTitle.value && placeSearchQuery.value.trim() !== selectedSchedulePlaceTitle.value) {
    scheduleDraft.placeId = ''
    selectedSchedulePlaceTitle.value = ''
  }
  void searchSchedulePlaces()
}

function selectScheduleMode(mode: 'free' | 'place') {
  scheduleDraft.mode = mode
  if (mode === 'free') {
    scheduleDraft.placeId = ''
    placeSearchQuery.value = ''
    selectedSchedulePlaceTitle.value = ''
    placeOptions.value = []
    return
  }
  void searchSchedulePlaces()
}

function selectSchedulePlace(place: Place) {
  placeSearchRequestId += 1
  scheduleDraft.placeId = String(place.id)
  placeSearchQuery.value = place.title
  selectedSchedulePlaceTitle.value = place.title
  placeOptions.value = []
  isLoadingPlaces.value = false
  if (!scheduleDraft.title.trim()) {
    scheduleDraft.title = place.title
  }
}

async function loadScheduleItems() {
  if (!props.accessToken || !props.trip?.id) {
    scheduleItems.value = []
    return
  }

  isLoadingSchedules.value = true
  try {
    scheduleItems.value = sortScheduleItems((await fetchTripSchedules(props.accessToken, props.trip.id)).map(toScheduleItem))
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 불러오지 못했습니다.')
  } finally {
    isLoadingSchedules.value = false
  }
}

function resetScheduleDraft(item?: ScheduleItem) {
  editingSchedule.value = item ?? null
  scheduleDraft.mode = item?.placeId ? 'place' : 'free'
  scheduleDraft.placeId = item?.placeId ? String(item.placeId) : ''
  placeSearchQuery.value = item?.placeId ? item.title : ''
  selectedSchedulePlaceTitle.value = item?.placeId ? item.title : ''
  placeOptions.value = []
  scheduleDraft.title = item?.title ?? ''
  scheduleDraft.date = item?.date ?? getDefaultScheduleDate()
  scheduleDraft.startTime = item?.time ?? '10:00'
  scheduleDraft.endTime = item?.endTime ?? '11:00'
  scheduleDraft.memo = item?.note ?? ''
  if (scheduleDraft.mode === 'place') void searchSchedulePlaces()
}

function openCreateScheduleModal() {
  resetScheduleDraft()
  showScheduleModal.value = true
}

function openEditScheduleModal(item: ScheduleItem) {
  resetScheduleDraft(item)
  showScheduleModal.value = true
}

function openScheduleFlow(item: ScheduleItem) {
  selectedScheduleItemId.value = item.id
  showOrderModal.value = true
  void nextTick(() => {
    document.querySelector(`[data-schedule-flow-item="${item.id}"]`)?.scrollIntoView({ block: 'center' })
  })
}

function openFlowPlaceDetail(item: ScheduleItem) {
  if (!item.placeId) return
  showOrderModal.value = false
  emit('openPlace', item.placeId)
}

function buildSchedulePayload(): TripSchedulePayload {
  ensureValidEndTime()
  const sameDateItems = scheduleItems.value.filter((item) => item.date === scheduleDraft.date)
  const editingSortOrder = editingSchedule.value
    ? sameDateItems.findIndex((item) => item.id === editingSchedule.value?.id) + 1
    : 0

  return {
    placeId: scheduleDraft.mode === 'place' && scheduleDraft.placeId ? Number(scheduleDraft.placeId) : null,
    scheduleDate: scheduleDraft.date,
    startTime: toApiTime(scheduleDraft.startTime),
    endTime: scheduleDraft.endTime ? toApiTime(scheduleDraft.endTime) : null,
    title: scheduleDraft.title.trim(),
    memo: scheduleDraft.memo.trim() || null,
    dayNo: Math.max(1, sameDateItems.findIndex((item) => item.date === scheduleDraft.date) + 1),
    sortOrder: editingSortOrder > 0 ? editingSortOrder : sameDateItems.length + 1,
  }
}

async function saveScheduleItem() {
  if (!scheduleDraft.title.trim() || !scheduleDraft.date || !scheduleDraft.startTime) return
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSaving.value = true
  try {
    const payload = buildSchedulePayload()
    const editingItem = editingSchedule.value
    const saved = editingItem?.scheduleItemId
      ? await updateTripSchedule(props.accessToken, props.trip.id, editingItem.scheduleItemId, payload)
      : await createTripSchedule(props.accessToken, props.trip.id, payload)
    const nextItem = toScheduleItem(saved)
    scheduleItems.value = sortScheduleItems(editingItem
      ? scheduleItems.value.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [...scheduleItems.value, nextItem])
    showScheduleModal.value = false
    editingSchedule.value = null
    emit('saved', editingItem ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 저장하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

async function loadChecklistItems() {
  if (!props.accessToken || !props.trip?.id) {
    checklist.value = []
    return
  }

  isLoadingChecklist.value = true
  try {
    checklist.value = await fetchChecklistItems(props.accessToken, props.trip.id)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 불러오지 못했습니다.')
  } finally {
    isLoadingChecklist.value = false
  }
}

async function addChecklistItem() {
  const title = checklistTitle.value.trim()
  if (!title) return
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSavingChecklist.value = true
  try {
    const created = await createChecklistItem(props.accessToken, props.trip.id, { title })
    checklist.value = [...checklist.value, created]
    checklistTitle.value = ''
    emit('saved', '체크리스트가 추가되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 추가하지 못했습니다.')
  } finally {
    isSavingChecklist.value = false
  }
}

async function removeChecklistItem(item: ChecklistItemResponse) {
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSavingChecklist.value = true
  try {
    await deleteChecklistItem(props.accessToken, props.trip.id, item.checklistItemId)
    checklist.value = checklist.value.filter((current) => current.checklistItemId !== item.checklistItemId)
    emit('saved', `${item.title}을(를) 삭제했습니다.`)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 삭제하지 못했습니다.')
  } finally {
    isSavingChecklist.value = false
  }
}

function toggleChecklistItem(item: ChecklistItemResponse) {
  checklist.value = checklist.value.map((current) => (
    current.checklistItemId === item.checklistItemId ? { ...current, done: !current.done } : current
  ))
}

function toChatMessage(message: ChatMessageResponse): Message {
  return {
    id: message.messageId,
    author: message.senderNickname,
    text: message.content,
    mine: message.senderUserId === props.currentUser?.userId,
  }
}

function scrollChatToBottom() {
  window.setTimeout(() => {
    if (!chatListEl.value) return
    chatListEl.value.scrollTop = chatListEl.value.scrollHeight
  }, 0)
}

function appendServerMessage(message: ChatMessageResponse) {
  const nextMessage = toChatMessage(message)
  const existingIndex = messages.value.findIndex((item) => item.id === nextMessage.id)
  if (existingIndex >= 0) {
    messages.value[existingIndex] = nextMessage
    scrollChatToBottom()
    return
  }

  const pendingIndex = messages.value.findIndex(
    (item) => item.pending && item.mine && nextMessage.mine && item.text === nextMessage.text,
  )
  if (pendingIndex >= 0) {
    messages.value[pendingIndex] = nextMessage
    scrollChatToBottom()
    return
  }

  messages.value.push(nextMessage)
  scrollChatToBottom()
}

function mergeLoadedChatMessages(loadedMessages: Message[]) {
  const loadedIds = new Set(loadedMessages.map((message) => message.id))
  const currentOnlyMessages = messages.value.filter((message) => !loadedIds.has(message.id))
  messages.value = [...loadedMessages, ...currentOnlyMessages]
}

async function loadChatMessages() {
  if (!props.accessToken || !props.trip?.id) return

  const requestId = ++chatLoadRequestId.value
  isLoadingMessages.value = true
  try {
    const loadedMessages = (await fetchChatMessages(props.accessToken, props.trip.id, 50)).map(toChatMessage)
    if (requestId !== chatLoadRequestId.value) return
    mergeLoadedChatMessages(loadedMessages)
    scrollChatToBottom()
  } catch (error) {
    if (requestId !== chatLoadRequestId.value) return
    emit('saved', error instanceof Error ? error.message : '채팅 메시지를 불러오지 못했습니다.')
  } finally {
    if (requestId === chatLoadRequestId.value) {
      isLoadingMessages.value = false
    }
  }
}

function closeChatSocket() {
  if (!chatSocket.value) return
  chatSocket.value.close()
  chatSocket.value = null
}

function flushPendingChatMessages() {
  if (!props.trip?.id || chatSocket.value?.readyState !== WebSocket.OPEN) return
  while (pendingChatMessages.value.length > 0) {
    const content = pendingChatMessages.value.shift()
    if (!content) continue
    chatSocket.value.send(JSON.stringify(createChatMessagePayload(props.trip.id, content)))
  }
}

function connectChatSocket() {
  closeChatSocket()
  if (!props.accessToken || !props.trip?.id) return

  const tripId = props.trip.id
  const socket = new WebSocket(getChatSocketUrl(props.accessToken))
  chatSocket.value = socket

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify(createChatSubscribePayload(tripId)))
    flushPendingChatMessages()
  })
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data) as ChatSocketMessage
    if (data.type === 'MESSAGE' && data.message) {
      appendServerMessage(data.message)
      return
    }
    if (data.type === 'ERROR' && data.error) {
      emit('saved', data.error)
    }
  })
  socket.addEventListener('error', () => {
    emit('saved', '채팅 서버에 연결하지 못했습니다.')
  })
}

async function resetChat() {
  messages.value = []
  closeChatSocket()
  connectChatSocket()
  await loadChatMessages()
}

function sendMessage() {
  const text = messageText.value.trim()
  if (!text) return
  if (!props.trip?.id) {
    emit('saved', '채팅을 보낼 일정을 찾지 못했습니다.')
    return
  }

  messages.value.push({
    id: `pending-${Date.now()}`,
    author: props.currentUser?.nickname ?? '나',
    text,
    mine: true,
    pending: true,
  })
  messageText.value = ''
  scrollChatToBottom()

  if (chatSocket.value?.readyState === WebSocket.OPEN) {
    try {
      chatSocket.value.send(JSON.stringify(createChatMessagePayload(props.trip.id, text)))
    } catch {
      pendingChatMessages.value.push(text)
      connectChatSocket()
    }
    return
  }

  pendingChatMessages.value.push(text)
  if (!chatSocket.value || chatSocket.value.readyState === WebSocket.CLOSED || chatSocket.value.readyState === WebSocket.CLOSING) {
    connectChatSocket()
  }
}

async function generateInviteCode() {
  if (!props.trip?.id) return
  if (!props.accessToken) {
    emit('saved', '로그인이 필요합니다.')
    return
  }
  if (!canManageTripMembers.value) {
    emit('saved', '소유자만 초대 코드를 만들 수 있습니다.')
    return
  }
  if (props.trip.tripType && props.trip.tripType.toUpperCase() !== 'TEAM') {
    emit('saved', '팀 여행만 초대 코드를 만들 수 있습니다.')
    return
  }

  isSaving.value = true
  try {
    const result = await createInviteCode(props.accessToken, props.trip.id)
    inviteCode.value = result.inviteCode
    emit('saved', '초대 코드가 준비되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '초대 코드를 만들지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

async function changeMemberRole(member: Member) {
  if (!props.accessToken || !props.trip?.id || member.owner || !canManageTripMembers.value) return
  const nextRole = getApiMemberRole(member.role)
  if (member.apiRole === nextRole) return

  isSaving.value = true
  try {
    const updated = await updateTripMemberRole(props.accessToken, props.trip.id, member.id, nextRole)
    const updatedMember = toMember(updated)
    members.value = members.value.map((item) => (item.id === updatedMember.id ? updatedMember : item))
    emit('saved', `${updatedMember.name} 권한을 변경했습니다.`)
  } catch (error) {
    member.role = getMemberRoleLabel(member.apiRole ?? 'EDITOR')
    emit('saved', error instanceof Error ? error.message : '팀원 권한을 변경하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

function requestRemoveScheduleItem(item: ScheduleItem) {
  deleteScheduleTarget.value = item
}

async function confirmRemoveScheduleItem() {
  if (!deleteScheduleTarget.value) return
  const target = deleteScheduleTarget.value
  isSaving.value = true
  try {
    if (props.accessToken && props.trip?.id && target.scheduleItemId) {
      await deleteScheduleItem(props.accessToken, props.trip.id, target.scheduleItemId)
    }
    scheduleItems.value = scheduleItems.value.filter((item) => item.id !== target.id)
    deleteScheduleTarget.value = null
    emit('saved', `${target.title}을 삭제했습니다.`)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 삭제하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadMembers()
  void loadScheduleItems()
  void loadChecklistItems()
  void resetChat()
})
watch(() => [props.accessToken, props.trip?.id, props.trip?.tripType], loadMembers)
watch(() => [props.accessToken, props.trip?.id], loadScheduleItems)
watch(() => [props.accessToken, props.trip?.id], loadChecklistItems)
watch(() => [props.accessToken, props.trip?.id], () => {
  void resetChat()
})
onBeforeUnmount(closeChatSocket)
</script>

<template>
  <section class="app-container py-6">
    <button class="mb-4 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'schedule')">← 목록으로 돌아가기</button>

    <header class="brand-card mb-5 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-slate-950 sm:text-3xl">{{ trip?.title ?? '\uC120\uD0DD\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4' }}</h1>
        <p class="mt-2 text-sm font-bold text-slate-500">{{ trip?.period ?? '\uC77C\uC815 \uAE30\uAC04 \uBBF8\uC815' }} &middot; {{ trip?.destination ?? '\uBAA9\uC801\uC9C0 \uBBF8\uC815' }}</p>
      </div>
      <div class="flex items-center gap-4">
        <button v-if="canInviteMembers" class="flex items-center rounded-full pr-1 transition hover:scale-105" aria-label="참여자 관리" @click="showMemberModal = true">
          <span
            v-for="member in members.slice(0, 4)"
            :key="member.id"
            :data-testid="`member-avatar-${member.id}`"
            class="-ml-2 grid size-8 first:ml-0 place-items-center rounded-full border-2 border-white bg-brand-100 text-xs font-black text-brand-600"
          >
            {{ member.name.slice(0, 1) }}
          </span>
        </button>
        <button v-if="canInviteMembers" class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-white hover:bg-brand-600" @click="showInviteModal = true">
          <Link :size="17" />
          팀원 초대
        </button>
      </div>
    </header>

    <div class="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <aside class="brand-card flex max-h-[680px] min-h-0 flex-col overflow-hidden rounded-xl xl:max-h-[calc(100vh-180px)]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">전체 일정</h2>
          <div class="flex items-center gap-1.5">
            <button data-testid="find-places-from-schedule" class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-xs font-black text-brand-500 ring-1 ring-brand-100 hover:bg-brand-50" @click="emit('change', 'explore')">
              <Search :size="14" />
              여행지 찾기
            </button>
            <button data-testid="open-schedule-form" class="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600" aria-label="일정 추가" @click="openCreateScheduleModal">
              <Plus :size="15" />
              일정 추가
            </button>
          </div>
        </div>
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p v-if="isLoadingSchedules" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            일정을 불러오는 중입니다.
          </p>
          <p v-else-if="scheduleItems.length === 0" class="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
            아직 등록된 일정이 없습니다.
          </p>
          <section v-for="group in scheduleGroups" :key="group.date">
            <h3 class="mb-2 flex items-center gap-1.5 text-xs font-black text-brand-500">
              <CalendarCheck :size="14" />
              {{ group.date }}
            </h3>
            <div class="space-y-2">
              <article
                v-for="item in group.items"
                :key="item.id"
                class="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:border-brand-500"
                :class="[item.active ? 'border-l-4 border-brand-500' : 'border-slate-200', item.placeId ? 'cursor-pointer hover:bg-brand-50/40' : 'cursor-pointer hover:bg-slate-50']"
                :data-testid="`schedule-card-${item.scheduleItemId}`"
                @click="openScheduleFlow(item)"
              >
                <div class="min-w-0">
                  <h4 class="truncate text-sm font-black text-slate-800">{{ item.time }} {{ item.title }}</h4>
                  <p
                    v-if="item.note"
                    class="mt-1 line-clamp-2 break-words text-xs font-bold leading-5 text-slate-500"
                    :data-testid="`schedule-note-${item.scheduleItemId}`"
                  >
                    <MapPin v-if="item.active" :size="14" class="mr-1 inline-block align-[-2px]" />
                    {{ item.note }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-1 justify-self-end" :data-testid="`schedule-actions-${item.scheduleItemId}`">
                  <button class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500" :aria-label="`${item.title} 삭제`" @click.stop="requestRemoveScheduleItem(item)">
                    <Trash2 :size="16" />
                  </button>
                  <button class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-brand-50 hover:text-brand-500" :aria-label="`${item.title} 수정`" :data-testid="`edit-schedule-${item.scheduleItemId}`" @click.stop="openEditScheduleModal(item)">
                    <Pencil :size="16" />
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </aside>

      <section class="brand-card grid min-h-[520px] grid-rows-[52px_1fr_72px] overflow-hidden rounded-xl">
        <div class="border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">일정 조율 채팅</h2>
        </div>
        <div ref="chatListEl" class="space-y-4 overflow-y-auto p-4">
          <p v-if="isLoadingMessages" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            이전 채팅을 불러오는 중입니다.
          </p>
          <p v-else-if="messages.length === 0" class="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
            아직 채팅 메시지가 없습니다.
          </p>
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-pop flex gap-3"
            :class="message.mine ? 'justify-end' : ''"
          >
            <span v-if="!message.mine" class="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
              {{ message.author.slice(0, 1) }}
            </span>
            <p
              class="max-w-[76%] rounded-xl px-4 py-3 text-sm font-semibold leading-6"
              :class="message.mine ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-800'"
            >
              {{ message.text }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 border-t border-slate-200 p-4">
          <input v-model="messageText" data-testid="chat-input" class="brand-input h-10 min-w-0 flex-1 rounded-full px-4 text-sm outline-none" placeholder="메시지를 입력하세요" @keyup.enter="sendMessage" />
          <button class="grid size-10 place-items-center rounded-full bg-brand-500 text-white transition hover:scale-105" aria-label="전송" @click="sendMessage">
            <Send :size="20" />
          </button>
        </div>
      </section>

      <aside class="space-y-4">
        <section class="brand-card rounded-xl p-4">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 font-black text-slate-950">
              <CalendarCheck :size="18" />
              준비 체크리스트
            </h3>
            <span class="text-sm font-black text-brand-500">{{ doneCount }}/{{ checklist.length }} 완료</span>
          </div>
          <div class="mt-3 flex gap-2">
            <input
              v-model="checklistTitle"
              data-testid="checklist-title-input"
              class="brand-input h-10 min-w-0 flex-1 rounded-lg px-3 text-sm outline-none"
              placeholder="준비물을 입력하세요"
              :disabled="isSavingChecklist"
              @keyup.enter="addChecklistItem"
            />
            <button
              class="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="체크리스트 추가"
              :disabled="isSavingChecklist || !checklistTitle.trim()"
              @click="addChecklistItem"
            >
              <Plus :size="18" />
            </button>
          </div>
          <p v-if="isLoadingChecklist" class="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            체크리스트를 불러오는 중입니다.
          </p>
          <p v-else-if="checklist.length === 0" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
            아직 등록된 체크리스트가 없습니다.
          </p>
          <div
            v-for="item in checklist"
            v-else
            :key="item.checklistItemId"
            :data-testid="`checklist-row-${item.checklistItemId}`"
            class="check-row mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition"
            :class="item.done ? 'text-slate-400 line-through' : 'hover:bg-brand-50'"
          >
            <input
              :checked="item.done"
              type="checkbox"
              class="size-4 accent-brand-500"
              :data-testid="`checklist-done-${item.checklistItemId}`"
              @change="toggleChecklistItem(item)"
            />
            <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
            <button
              class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              :aria-label="`${item.title} 삭제`"
              :data-testid="`delete-checklist-${item.checklistItemId}`"
              :disabled="isSavingChecklist"
              @click="removeChecklistItem(item)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </section>
      </aside>
    </div>

    <Transition name="modal-fade">
      <div v-if="showScheduleModal" class="fixed inset-0 z-[85] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">{{ editingSchedule ? '일정 수정' : '일정 추가' }}</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showScheduleModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-black">
            <button
              data-testid="schedule-free-tab"
              class="h-9 rounded-md transition"
              :class="scheduleDraft.mode === 'free' ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500'"
              @click="selectScheduleMode('free')"
            >
              자유 일정
            </button>
            <button
              data-testid="schedule-place-tab"
              class="h-9 rounded-md transition"
              :class="scheduleDraft.mode === 'place' ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500'"
              @click="selectScheduleMode('place')"
            >
              장소 선택
            </button>
          </div>
          <div class="space-y-3">
            <label v-if="scheduleDraft.mode === 'place'" class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">장소</span>
              <div class="relative">
                <div class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                  <Search :size="15" class="text-slate-400" />
                  <input
                    v-model="placeSearchQuery"
                    data-testid="schedule-place-search-input"
                    class="min-w-0 flex-1 text-sm font-bold text-slate-900 outline-none"
                    placeholder="여행지 이름으로 검색"
                    @input="handleSchedulePlaceSearchInput"
                  />
                </div>
                <div v-if="placeOptions.length || isLoadingPlaces" class="absolute left-0 right-0 z-40 mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  <p v-if="isLoadingPlaces" class="px-4 py-3 text-sm font-bold text-slate-500">여행지를 검색하는 중입니다.</p>
                  <button
                    v-for="place in placeOptions"
                    :key="place.id"
                    type="button"
                    class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    :data-testid="`schedule-place-result-${place.id}`"
                    @click="selectSchedulePlace(place)"
                  >
                    <MapPin :size="16" class="mt-0.5 shrink-0 text-brand-500" />
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-black text-slate-950">{{ place.title }}</span>
                      <span class="mt-1 block truncate text-xs font-bold text-slate-500">{{ place.location }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">제목</span>
              <input v-model="scheduleDraft.title" data-testid="schedule-title-input" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="자유시간" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">날짜</span>
              <input v-model="scheduleDraft.date" data-testid="schedule-date-input" type="date" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">시작</span>
                <input v-model="scheduleDraft.startTime" data-testid="schedule-start-input" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" @change="ensureValidEndTime" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">종료</span>
                <input v-model="scheduleDraft.endTime" data-testid="schedule-end-input" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
              </label>
            </div>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="scheduleDraft.memo" data-testid="schedule-memo-input" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="숙소 근처" />
            </label>
          </div>
          <button
            data-testid="save-schedule-button"
            class="btn-primary mt-5 h-10 w-full rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSaving || !scheduleDraft.title.trim() || !scheduleDraft.date || !scheduleDraft.startTime"
            @click="saveScheduleItem"
          >
            {{ isSaving ? '저장 중' : '저장하기' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showOrderModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="schedule-flow-modal" class="modal-panel w-full max-w-lg overflow-x-hidden rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="flex items-center gap-2 text-lg font-black text-slate-950">
                <ListOrdered :size="20" class="text-brand-500" />
                일정 순서 확인
              </h2>
              <p class="mt-1.5 text-xs font-semibold text-slate-500">등록된 장소와 시간을 날짜별로 확인합니다.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showOrderModal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="max-h-[44vh] overflow-x-hidden overflow-y-auto pb-4 pr-1">
            <section v-for="group in scheduleGroups" :key="group.date" class="pb-7 last:pb-0">
              <div class="mb-4 flex items-center gap-2.5">
                <span class="grid size-8 place-items-center rounded-full bg-brand-500 text-white shadow-sm shadow-indigo-200">
                  <CalendarCheck :size="16" />
                </span>
                <h3 class="text-lg font-black text-brand-500">{{ group.date }}</h3>
              </div>

              <div class="relative ml-4 border-l-2 border-slate-200 pl-5 sm:ml-4 sm:pl-6">
                <article v-for="item in group.items" :key="item.id" class="relative mb-4 last:mb-0">
                  <span class="absolute -left-[27px] top-7 size-4 rounded-full border-[3px] border-white bg-brand-500 shadow-sm sm:-left-[31px]" />
                  <div class="grid min-w-0 gap-3 sm:grid-cols-[80px_minmax(0,1fr)]">
                    <p class="pt-6 text-xs font-bold text-slate-400">{{ item.time }}</p>
                    <div
                      class="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 transition"
                      :class="selectedScheduleItemId === item.id ? 'ring-2 ring-brand-300 bg-brand-50/50' : ''"
                      :data-schedule-flow-item="item.id"
                      :data-testid="`schedule-flow-item-${item.scheduleItemId}`"
                    >
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div class="min-w-0">
                          <p class="flex items-center gap-1.5 text-xs font-black text-brand-500">
                            <span class="size-1.5 rounded-full bg-violet-500" />
                            {{ item.category }}
                          </p>
                          <h4 class="mt-2 break-words text-base font-black text-slate-950">{{ item.title }}</h4>
                          <p v-if="item.note" class="mt-2 break-words text-xs font-bold leading-5 text-slate-500 [overflow-wrap:anywhere]">
                            {{ item.note }}
                          </p>
                          <button
                            v-if="item.placeId"
                            data-testid="open-flow-place-detail"
                            class="mt-3 inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-black text-brand-500 ring-1 ring-brand-100 transition hover:bg-brand-50"
                            @click="openFlowPlaceDetail(item)"
                          >
                            여행지 상세 보기
                          </button>
                        </div>
                        <button
                          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                          :aria-label="`${item.title} 삭제`"
                          @click="requestRemoveScheduleItem(item)"
                        >
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div class="mt-5 grid gap-3 rounded-xl bg-brand-50 p-4 text-xs font-bold leading-5 text-brand-700 sm:grid-cols-3">
            <div>
              <span class="block text-[11px] font-black text-brand-500">총 일정</span>
              {{ scheduleItems.length }}개
            </div>
            <div>
              <span class="block text-[11px] font-black text-brand-500">첫 일정</span>
              {{ scheduleItems[0]?.date ?? '날짜 미정' }} · {{ scheduleItems[0]?.time ?? '미정' }}
            </div>
            <div>
              <span class="block text-[11px] font-black text-brand-500">마지막 일정</span>
              {{ scheduleItems[scheduleItems.length - 1]?.date ?? '날짜 미정' }} · {{ scheduleItems[scheduleItems.length - 1]?.time ?? '미정' }}
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="showOrderModal = false">
              닫기
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="deleteScheduleTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">일정을 삭제하시겠습니까?</h2>
            <button class="text-slate-500" aria-label="닫기" @click="deleteScheduleTarget = null">
              <X :size="22" />
            </button>
          </div>
          <p class="text-sm font-semibold leading-6 text-slate-600">
            <span class="font-black text-slate-950">{{ deleteScheduleTarget.title }}</span> 항목을 전체 일정에서 삭제합니다.
          </p>
          <p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            확인을 누르면 이 항목이 현재 일정에서 제거됩니다.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="deleteScheduleTarget = null">
              취소
            </button>
            <button class="btn-primary h-10 rounded-lg px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="confirmRemoveScheduleItem">
              {{ isSaving ? '삭제 중' : '확인' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showMemberModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="flex items-center gap-2 text-xl font-black text-slate-950">
              <UserCog :size="22" class="text-brand-500" />
              참여자 관리
            </h2>
            <button class="text-slate-500" aria-label="닫기" @click="showMemberModal = false">
              <X :size="22" />
            </button>
          </div>
          <p v-if="isLoadingMembers" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            팀원 목록을 불러오는 중입니다.
          </p>
          <div class="space-y-3">
            <article v-for="member in members" :key="member.id" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span class="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-600">{{ member.name.slice(0, 1) }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-black text-slate-950">{{ member.name }}</p>
                <p class="truncate text-xs font-semibold text-slate-500">{{ member.email ?? '팀원' }}</p>
              </div>
              <span v-if="member.owner" class="rounded-lg bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                소유자
              </span>
              <span v-else-if="canManageTripMembers" class="select-wrap">
                <select v-model="member.role" class="brand-input select-control h-9 rounded-lg px-2 text-xs font-bold outline-none" :disabled="isSaving" @change="changeMemberRole(member)">
                  <option>편집 가능</option>
                  <option>보기만 가능</option>
                </select>
                <ChevronDown :size="14" class="select-chevron" />
              </span>
              <span v-else class="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                {{ member.role }}
              </span>
            </article>
          </div>
          <button v-if="canManageTripMembers" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="showInviteModal = true; showMemberModal = false">
            새 팀원 초대하기
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showInviteModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">팀원 초대</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showInviteModal = false">
              <X :size="22" />
            </button>
          </div>
          <section class="rounded-xl bg-brand-50 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-black text-brand-500">팀 여행 초대 코드</p>
                <p class="mt-1 text-sm font-bold text-slate-600">코드를 공유하면 팀원이 일정에 바로 참여할 수 있습니다.</p>
              </div>
              <button class="h-9 shrink-0 rounded-lg bg-brand-500 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="generateInviteCode">
                {{ isSaving ? '생성 중' : '코드 생성' }}
              </button>
            </div>
            <p v-if="inviteCode" class="mt-3 rounded-lg bg-white px-3 py-2 text-center text-lg font-black tracking-widest text-slate-950">
              {{ inviteCode }}
            </p>
            <p v-else class="mt-3 rounded-lg bg-white/70 px-3 py-2 text-center text-xs font-bold text-slate-500">
              코드 생성을 누르면 초대 코드가 표시됩니다.
            </p>
          </section>
        </section>
      </div>
    </Transition>
  </section>
</template>
