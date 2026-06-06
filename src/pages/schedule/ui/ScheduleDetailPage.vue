<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { Bot, CalendarCheck, GripVertical, Link, MapPin, MoreVertical, Send, SquareCheck, UserCog, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'

const props = defineProps<{
  trip: Trip | null
}>()

const emit = defineEmits<{
  change: [view: string]
}>()

type ScheduleItem = {
  id: number
  time: string
  title: string
  note: string
  active?: boolean
}

type Message = {
  id: number
  author: string
  text: string
  mine?: boolean
}

type Member = {
  id: number
  name: string
  email: string
  role: string
  owner?: boolean
}

const draggedId = ref<number | null>(null)
const messageText = ref('')
const voted = ref('숙성도 노형본점')
const showInviteModal = ref(false)
const showMemberModal = ref(false)
const members = ref<Member[]>([
  { id: 1, name: '나', email: 'me@example.com', role: '소유자', owner: true },
  { id: 2, name: '지수', email: 'jisu@example.com', role: '편집 가능' },
  { id: 3, name: '민수', email: 'minsu@example.com', role: '편집 가능' },
])
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
const messages = ref<Message[]>([
  { id: 1, author: '지수', text: '우리 첫날 점심은 무조건 흑돼지 먹자! 공항 근처로.' },
  { id: 2, author: 'AI', text: '공항 근처 흑돼지 식당 3곳을 후보로 등록할까요?' },
  { id: 3, author: '나', text: '좋아. 투표 올려줘!', mine: true },
])
const scheduleItems = ref<ScheduleItem[]>([
  { id: 1, time: '12:00', title: '공항 도착', note: '렌트카 픽업' },
  { id: 2, time: '13:30', title: '점심 식사', note: '제주 흑돼지 명가', active: true },
  { id: 3, time: '10:00', title: '비자림 산책', note: '맑은 공기 마시며 힐링 타임' },
  { id: 4, time: '14:00', title: '성산일출봉', note: '정상에서 기념 사진' },
])

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)

function sendMessage() {
  const text = messageText.value.trim()
  if (!text) return
  messages.value.push({ id: Date.now(), author: '나', text, mine: true })
  messageText.value = ''
  nextTick(() => {
    window.setTimeout(() => {
      messages.value.push({ id: Date.now() + 1, author: 'AI', text: '좋아요. 해당 요청을 일정 후보에 반영해볼게요.' })
    }, 280)
  })
}

function onDrop(targetId: number) {
  if (!draggedId.value || draggedId.value === targetId) {
    draggedId.value = null
    return
  }

  const from = scheduleItems.value.findIndex((item) => item.id === draggedId.value)
  const to = scheduleItems.value.findIndex((item) => item.id === targetId)
  if (from < 0 || to < 0) {
    draggedId.value = null
    return
  }
  const [moved] = scheduleItems.value.splice(from, 1)
  if (!moved) {
    draggedId.value = null
    return
  }
  scheduleItems.value.splice(to, 0, moved)
  draggedId.value = null
}

function sendInvite() {
  if (!inviteDraft.email.trim()) return
  members.value.push({
    id: Date.now(),
    name: inviteDraft.email.trim().slice(0, 2),
    email: inviteDraft.email.trim(),
    role: inviteDraft.role,
  })
  messages.value.push({ id: Date.now(), author: 'AI', text: `${inviteDraft.email} 님에게 초대장을 보냈습니다.` })
  inviteDraft.email = ''
  inviteDraft.message = ''
  inviteDraft.role = '편집 가능'
  showInviteModal.value = false
}

function removeMember(memberId: number) {
  members.value = members.value.filter((member) => member.id !== memberId)
}
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
        <button class="flex items-center rounded-full pr-1 transition hover:scale-105" aria-label="참여자 관리" @click="showMemberModal = true">
          <span
            v-for="member in members.slice(0, 4)"
            :key="member.id"
            class="-ml-2 grid size-8 first:ml-0 place-items-center rounded-full border-2 border-white bg-brand-100 text-xs font-black text-brand-600"
          >
            {{ member.name }}
          </span>
        </button>
        <button class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-white hover:bg-brand-600" @click="showInviteModal = true">
          <Link :size="17" />
          팀원 초대
        </button>
      </div>
    </header>

    <div class="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <aside class="brand-card overflow-hidden rounded-xl">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">전체 일정</h2>
          <MoreVertical :size="18" class="text-slate-500" />
        </div>
        <div class="space-y-3 p-4">
          <article
            v-for="item in scheduleItems"
            :key="item.id"
            draggable="true"
            class="schedule-drag-card rounded-lg border bg-white p-3 shadow-sm transition"
            :class="[item.active ? 'border-l-4 border-brand-500' : 'border-slate-200', draggedId === item.id ? 'scale-[0.98] opacity-50' : '']"
            @dragstart="draggedId = item.id"
            @dragover.prevent
            @drop="onDrop(item.id)"
          >
            <div class="flex items-start gap-2">
              <GripVertical :size="17" class="mt-0.5 shrink-0 text-slate-300" />
              <div>
                <h3 class="text-sm font-black text-slate-800">{{ item.time }} {{ item.title }}</h3>
                <p class="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                  <MapPin v-if="item.active" :size="14" />
                  {{ item.note }}
                </p>
              </div>
            </div>
          </article>
          <div class="rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 text-center text-xs font-bold text-slate-400">
            일정을 드래그해서 순서를 바꿔보세요
          </div>
        </div>
      </aside>

      <section class="brand-card grid min-h-[520px] grid-rows-[52px_1fr_72px] overflow-hidden rounded-xl">
        <div class="border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">일정 조율 채팅</h2>
        </div>
        <div class="space-y-4 overflow-y-auto p-4">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-pop flex gap-3"
            :class="message.mine ? 'justify-end' : ''"
          >
            <span v-if="!message.mine" class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-black" :class="message.author === 'AI' ? 'bg-brand-100 text-brand-600' : 'bg-red-100 text-red-700'">
              {{ message.author === 'AI' ? 'AI' : '지' }}
            </span>
            <p
              class="max-w-[76%] rounded-xl px-4 py-3 text-sm font-semibold leading-6"
              :class="message.mine ? 'bg-brand-500 text-white' : message.author === 'AI' ? 'border border-brand-200 bg-brand-50 text-slate-800' : 'bg-slate-100 text-slate-800'"
            >
              <Bot v-if="message.author === 'AI'" :size="17" class="mb-1 inline text-brand-500" />
              {{ message.text }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 border-t border-slate-200 p-4">
          <input v-model="messageText" class="brand-input h-10 min-w-0 flex-1 rounded-full px-4 text-sm outline-none" placeholder="메시지 또는 AI에게 할 질문 입력..." @keyup.enter="sendMessage" />
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
              <SquareCheck v-if="voted === option" :size="19" fill="currentColor" />
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
      <div v-if="showMemberModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
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
          <div class="space-y-3">
            <article v-for="member in members" :key="member.id" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span class="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-600">{{ member.name }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-black text-slate-950">{{ member.name }}</p>
                <p class="truncate text-xs font-semibold text-slate-500">{{ member.email }}</p>
              </div>
              <select v-model="member.role" class="brand-input h-9 rounded-lg px-2 text-xs font-bold outline-none" :disabled="member.owner">
                <option>소유자</option>
                <option>편집 가능</option>
                <option>보기만 가능</option>
              </select>
              <button v-if="!member.owner" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-500 hover:bg-red-100" @click="removeMember(member.id)">
                내보내기
              </button>
            </article>
          </div>
          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="showInviteModal = true; showMemberModal = false">
            새 팀원 초대하기
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showInviteModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">팀원 초대</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showInviteModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="space-y-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">이메일</span>
              <input v-model="inviteDraft.email" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="friend@example.com" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">권한</span>
              <select v-model="inviteDraft.role" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none">
                <option>편집 가능</option>
                <option>보기만 가능</option>
              </select>
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
