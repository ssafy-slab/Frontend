<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CalendarCheck, ChevronDown, Link, ListOrdered, MapPin, Plus, Send, SquareCheck, Trash2, UserCog, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { createChatMessagePayload, createChatSubscribePayload, fetchChatMessages, getChatSocketUrl } from '@/entities/chat/api/chatApi'
import type { ChatMessageResponse, ChatSocketMessage } from '@/entities/chat/api/chatApi'
import { createInviteCode, deleteScheduleItem, fetchTripMembers, updateTripMemberRole } from '@/entities/travel/api/tripApi'
import type { TripMemberResponse, TripMemberRole } from '@/entities/travel/api/tripApi'
import { canInviteTripMembers } from '@/entities/travel/model/tripAccess'

const props = defineProps<{
  trip: Trip | null
  accessToken?: string
  currentUser?: AuthUser | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

type ScheduleItem = {
  id: number
  scheduleItemId?: number
  date: string
  time: string
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
const voted = ref('숙성도 노형본점')
const showInviteModal = ref(false)
const showMemberModal = ref(false)
const showOrderModal = ref(false)
const inviteCode = ref('')
const isSaving = ref(false)
const isLoadingMembers = ref(false)
const isLoadingMessages = ref(false)
const chatSocket = ref<WebSocket | null>(null)
const chatListEl = ref<HTMLElement | null>(null)
const pendingChatMessages = ref<string[]>([])
const deleteScheduleTarget = ref<ScheduleItem | null>(null)
const canInviteMembers = computed(() => canInviteTripMembers(props.trip))
const members = ref<Member[]>([])
const inviteDraft = reactive({
  email: '',
  role: '편집 가능',
  message: '',
})
const checklist = ref([
  { id: 1, text: '렌트카 예약', done: true },
  { id: 2, text: '첫날 점심 후보 확정', done: false },
  { id: 3, text: '비 오는 날 대체 코스 추가', done: false },
])
const messages = ref<Message[]>([])
const scheduleItems = ref<ScheduleItem[]>([
  { id: 1, date: '2024.11.15(금)', time: '12:00~13:00', title: '공항 도착', note: '렌트카 픽업', category: '이동', location: '제주국제공항' },
  { id: 2, date: '2024.11.15(금)', time: '13:30~15:00', title: '점심 식사', note: '제주 흑돼지 명가', category: '음식점', location: '제주시 흑돼지 거리', active: true },
  { id: 3, date: '2024.11.16(토)', time: '10:00~12:00', title: '비자림 산책', note: '맑은 공기 마시며 힐링 타임', category: '관광명소', location: '제주시 구좌읍 비자숲길' },
  { id: 4, date: '2024.11.16(토)', time: '14:00~16:00', title: '성산일출봉', note: '정상에서 기념 사진', category: '관광명소', location: '서귀포시 성산읍' },
])

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)
const scheduleGroups = computed(() => {
  const groups = new Map<string, ScheduleItem[]>()
  scheduleItems.value.forEach((item) => {
    groups.set(item.date, [...(groups.get(item.date) ?? []), item])
  })
  return Array.from(groups, ([date, items]) => ({ date, items }))
})

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

async function loadChatMessages() {
  if (!props.accessToken || !props.trip?.id) return

  isLoadingMessages.value = true
  try {
    messages.value = (await fetchChatMessages(props.accessToken, props.trip.id, 50)).map(toChatMessage)
    scrollChatToBottom()
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '채팅 메시지를 불러오지 못했습니다.')
  } finally {
    isLoadingMessages.value = false
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
  await loadChatMessages()
  connectChatSocket()
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

function sendInvite() {
  if (!inviteDraft.email.trim()) return
  emit('saved', `${inviteDraft.email} 님은 초대 코드로 참여할 수 있습니다.`)
  inviteDraft.email = ''
  inviteDraft.message = ''
  inviteDraft.role = '편집 가능'
  showInviteModal.value = false
}

async function generateInviteCode() {
  if (!props.trip?.id) return
  if (!props.accessToken) {
    emit('saved', '로그인이 필요합니다.')
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
  if (!props.accessToken || !props.trip?.id || member.owner) return
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
  void resetChat()
})
watch(() => [props.accessToken, props.trip?.id, props.trip?.tripType], loadMembers)
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
        <h1 class="text-2xl font-black text-slate-950 sm:text-3xl">{{ trip?.title ?? '제주도 먹방 원정대' }}</h1>
        <p class="mt-2 text-sm font-bold text-slate-500">{{ trip?.period ?? '2024.11.15 - 2024.11.17' }} · {{ trip?.destination ?? '제주도' }}</p>
      </div>
      <div class="flex items-center gap-4">
        <button v-if="canInviteMembers" class="flex items-center rounded-full pr-1 transition hover:scale-105" aria-label="참여자 관리" @click="showMemberModal = true">
          <span
            v-for="member in members.slice(0, 4)"
            :key="member.id"
            class="-ml-2 grid size-8 first:ml-0 place-items-center rounded-full border-2 border-white bg-brand-100 text-xs font-black text-brand-600"
          >
            {{ member.name }}
          </span>
        </button>
        <button v-if="canInviteMembers" class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-white hover:bg-brand-600" @click="showInviteModal = true">
          <Link :size="17" />
          팀원 초대
        </button>
      </div>
    </header>

    <div class="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <aside class="brand-card overflow-hidden rounded-xl">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">전체 일정</h2>
          <button class="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600" aria-label="일정 순서 확인" @click="showOrderModal = true">
            <Plus :size="15" />
            순서 확인
          </button>
        </div>
        <div class="space-y-4 p-4">
          <section v-for="group in scheduleGroups" :key="group.date">
            <h3 class="mb-2 flex items-center gap-1.5 text-xs font-black text-brand-500">
              <CalendarCheck :size="14" />
              {{ group.date }}
            </h3>
            <div class="space-y-2">
              <article
                v-for="item in group.items"
                :key="item.id"
                class="rounded-lg border bg-white p-3 shadow-sm transition hover:border-brand-500"
                :class="item.active ? 'border-l-4 border-brand-500' : 'border-slate-200'"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h4 class="text-sm font-black text-slate-800">{{ item.time }} {{ item.title }}</h4>
                    <p class="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                      <MapPin v-if="item.active" :size="14" />
                      {{ item.note }}
                    </p>
                  </div>
                  <button class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500" :aria-label="`${item.title} 삭제`" @click="requestRemoveScheduleItem(item)">
                    <Trash2 :size="16" />
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
          <h3 class="font-black text-slate-950">Q. 첫날 점심 식당은?</h3>
          <div class="mt-3 space-y-2">
            <button
              v-for="option in ['숙성도 노형본점', '돈사돈 본관']"
              :key="option"
              class="vote-option flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-black transition"
              :class="voted === option ? 'border-2 border-brand-500 bg-brand-50 text-brand-500' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
              @click="voted = option"
            >
              {{ option }} {{ option === '숙성도 노형본점' ? '(2명)' : '(0명)' }}
              <SquareCheck v-if="voted === option" :size="19" />
              <span v-else class="size-5 rounded-full border-2 border-slate-400" />
            </button>
          </div>
          <button class="btn-primary mt-3 h-10 w-full rounded-lg text-sm">일정에 추가하기</button>
        </section>

        <section class="brand-card rounded-xl p-4">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 font-black text-slate-950">
              <CalendarCheck :size="18" />
              준비 체크리스트
            </h3>
            <span class="text-sm font-black text-brand-500">{{ doneCount }}/{{ checklist.length }} 완료</span>
          </div>
          <label
            v-for="item in checklist"
            :key="item.id"
            class="check-row mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition"
            :class="item.done ? 'text-slate-400 line-through' : 'hover:bg-brand-50'"
          >
            <input v-model="item.done" type="checkbox" class="size-4 accent-brand-500" />
            {{ item.text }}
          </label>
        </section>
      </aside>
    </div>

    <Transition name="modal-fade">
      <div v-if="showOrderModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
          <div class="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 class="flex items-center gap-2 text-lg font-black text-slate-950">
                <ListOrdered :size="20" class="text-brand-500" />
                일정 순서 확인
              </h2>
              <p class="mt-1 text-xs font-semibold text-slate-500">등록된 장소와 시간을 날짜별로 확인합니다.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showOrderModal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="max-h-[56vh] overflow-y-auto pr-1">
            <section v-for="group in scheduleGroups" :key="group.date" class="pb-6 last:pb-0">
              <div class="mb-3 flex items-center gap-2">
                <span class="grid size-8 place-items-center rounded-full bg-brand-500 text-white shadow-sm shadow-indigo-200">
                  <CalendarCheck :size="16" />
                </span>
                <h3 class="text-lg font-black text-brand-500">{{ group.date }}</h3>
              </div>

              <div class="relative ml-4 border-l-2 border-slate-200 pl-4 sm:ml-4 sm:pl-5">
                <article v-for="item in group.items" :key="item.id" class="relative mb-3 last:mb-0">
                  <span class="absolute -left-[25px] top-6 size-4 rounded-full border-[3px] border-white bg-brand-500 shadow-sm sm:-left-[29px]" />
                  <div class="grid gap-2 sm:grid-cols-[92px_1fr]">
                    <p class="pt-5 text-xs font-bold text-slate-400">{{ item.time }}</p>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p class="flex items-center gap-1.5 text-xs font-black text-brand-500">
                            <span class="size-1.5 rounded-full bg-violet-500" />
                            {{ item.category }}
                          </p>
                          <h4 class="mt-1.5 text-base font-black text-slate-950">{{ item.title }}</h4>
                          <p class="mt-1 text-xs font-bold leading-5 text-slate-500">{{ item.note }} / {{ item.location }}</p>
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

          <div class="mt-3 grid gap-2 rounded-xl bg-brand-50 p-3 text-xs font-bold leading-5 text-brand-700 sm:grid-cols-3">
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
      <div v-if="deleteScheduleTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
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
      <div v-if="showMemberModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
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
              <span class="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-600">{{ member.name }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-black text-slate-950">{{ member.name }}</p>
                <p class="truncate text-xs font-semibold text-slate-500">{{ member.email ?? '팀원' }}</p>
              </div>
              <span v-if="member.owner" class="rounded-lg bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                소유자
              </span>
              <span v-else class="select-wrap">
                <select v-model="member.role" class="brand-input select-control h-9 rounded-lg px-2 text-xs font-bold outline-none" :disabled="isSaving" @change="changeMemberRole(member)">
                  <option>편집 가능</option>
                  <option>보기만 가능</option>
                </select>
                <ChevronDown :size="14" class="select-chevron" />
              </span>
            </article>
          </div>
          <button v-if="canInviteMembers" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="showInviteModal = true; showMemberModal = false">
            새 팀원 초대하기
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showInviteModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">팀원 초대</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showInviteModal = false">
              <X :size="22" />
            </button>
          </div>
          <section class="mb-4 rounded-xl bg-brand-50 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-black text-brand-500">팀 여행 초대 코드</p>
                <p class="mt-1 text-sm font-bold text-slate-600">코드를 공유하면 상대가 일정에 바로 참여할 수 있습니다.</p>
              </div>
              <button class="h-9 shrink-0 rounded-lg bg-brand-500 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="generateInviteCode">
                {{ isSaving ? '생성 중' : '코드 생성' }}
              </button>
            </div>
            <p v-if="inviteCode" class="mt-3 rounded-lg bg-white px-3 py-2 text-center text-lg font-black tracking-widest text-slate-950">
              {{ inviteCode }}
            </p>
          </section>
          <div class="space-y-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">이메일</span>
              <input v-model="inviteDraft.email" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="friend@example.com" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">권한</span>
              <span class="select-wrap select-wrap-full">
                <select v-model="inviteDraft.role" class="brand-input select-control h-10 w-full rounded-lg px-3 text-sm outline-none">
                  <option>편집 가능</option>
                  <option>보기만 가능</option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">초대 메시지</span>
              <input v-model="inviteDraft.message" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="같이 일정 짜보자!" />
            </label>
          </div>
          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="sendInvite">
            초대 보내기
          </button>
        </section>
      </div>
    </Transition>
  </section>
</template>
