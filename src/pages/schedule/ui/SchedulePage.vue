<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Link, MoreHorizontal, Plane, Plus, Trash2, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'
import { createTrip as createTripApi, deleteTrip as deleteTripApi, fetchTrips, getTripThumbnailImage, joinTrip as joinTripApi } from '@/entities/travel/api/tripApi'
import { getTripTypeLabel } from '@/entities/travel/model/tripAccess'

type User = {
  email: string
  nickname: string
}

const props = defineProps<{
  currentUser: User | null
  accessToken?: string
}>()

const emit = defineEmits<{
  openTrip: [trip: Trip]
  saved: [message: string]
}>()

const localTrips = ref<Trip[]>([])
const activePhase = ref<'upcoming' | 'past'>('upcoming')
const showModal = ref(false)
const showJoinModal = ref(false)
const manageMode = ref(false)
const deleteTarget = ref<Trip | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref('')
const draft = reactive({
  title: '',
  destination: '',
  start: '',
  end: '',
  tripType: 'TEAM',
})
const joinDraft = reactive({
  inviteCode: '',
})

const upcomingTrips = computed(() => localTrips.value.filter((trip) => trip.phase === 'upcoming'))
const pastTrips = computed(() => localTrips.value.filter((trip) => trip.phase === 'past'))
const visibleTrips = computed(() => (activePhase.value === 'upcoming' ? upcomingTrips.value : pastTrips.value))

async function loadTrips() {
  if (!props.accessToken) return

  isLoading.value = true
  loadError.value = ''
  try {
    localTrips.value = await fetchTrips(props.accessToken)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '여행 목록을 불러오지 못했습니다.'
    emit('saved', loadError.value)
  } finally {
    isLoading.value = false
  }
}

function resetDraft() {
  draft.title = ''
  draft.destination = ''
  draft.start = ''
  draft.end = ''
  draft.tripType = 'TEAM'
}

async function createTrip() {
  if (!draft.title.trim() || !draft.destination.trim()) return

  isSaving.value = true
  try {
    const payload = {
      title: draft.title.trim(),
      description: `${draft.destination.trim()} 여행 후보를 만들었습니다. 장소를 추가하고 팀원과 조율해보세요.`,
      tripType: draft.tripType,
      startDate: draft.start || null,
      endDate: draft.end || null,
    }
    const trip: Trip = props.accessToken
      ? await createTripApi(props.accessToken, payload)
      : {
          id: Date.now(),
          title: draft.title.trim(),
          destination: getTripTypeLabel(draft.tripType),
          period: `${draft.start || '시작일'} - ${draft.end || '종료일'}`,
          description: payload.description,
          image: getTripThumbnailImage(),
          members: [props.currentUser?.nickname.slice(0, 1) || '나'],
          status: 'AI가 일정 조율 중',
          tripType: draft.tripType,
          startDate: draft.start || null,
          endDate: draft.end || null,
          phase: 'upcoming',
        }

    localTrips.value = [trip, ...localTrips.value]
    activePhase.value = 'upcoming'
    resetDraft()
    showModal.value = false
    emit('saved', '새 일정이 추가되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '새 일정을 추가하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

function requestDeleteTrip(trip: Trip) {
  if (!props.accessToken && trip.members.length > 1) {
    emit('saved', '초대된 유저가 있는 일정은 삭제할 수 없습니다.')
    return
  }
  deleteTarget.value = trip
}

async function confirmDeleteTrip() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  isSaving.value = true
  try {
    if (props.accessToken) await deleteTripApi(props.accessToken, target.id)
    localTrips.value = localTrips.value.filter((item) => item.id !== target.id)
    emit('saved', `${target.title} 일정이 삭제되었습니다.`)
    deleteTarget.value = null
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 삭제하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

async function joinTrip() {
  const inviteCode = joinDraft.inviteCode.trim()
  if (!inviteCode) return
  if (!props.accessToken) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSaving.value = true
  try {
    const trip = await joinTripApi(props.accessToken, inviteCode)
    localTrips.value = [trip, ...localTrips.value.filter((item) => item.id !== trip.id)]
    activePhase.value = 'upcoming'
    joinDraft.inviteCode = ''
    showJoinModal.value = false
    emit('saved', `${trip.title} 일정에 참여했습니다.`)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '초대 코드로 참여하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadTrips)
watch(() => props.accessToken, loadTrips)
</script>

<template>
  <section class="app-container py-5 md:py-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex gap-4 text-lg font-black sm:text-xl">
        <button
          class="pb-2.5"
          :class="activePhase === 'upcoming' ? 'border-b-2 border-brand-500 text-slate-950' : 'text-slate-500'"
          @click="activePhase = 'upcoming'"
        >
          다가오는 일정 ({{ upcomingTrips.length }})
        </button>
        <button
          class="pb-2.5"
          :class="activePhase === 'past' ? 'border-b-2 border-brand-500 text-slate-950' : 'text-slate-500'"
          @click="activePhase = 'past'"
        >
          지난 일정 ({{ pastTrips.length }})
        </button>
      </div>
      <div class="flex flex-wrap justify-start gap-2 sm:justify-end">
        <button class="inline-flex items-center gap-1 rounded-lg bg-white px-3.5 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50" @click="showJoinModal = true">
          <Link :size="15" />
          초대 코드 참여
        </button>
        <button class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-200" @click="manageMode = !manageMode">
          <MoreHorizontal :size="15" />
          {{ manageMode ? '관리 종료' : '일정 관리' }}
        </button>
        <button class="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-black text-white hover:bg-brand-600" @click="showModal = true">
          + 새 일정 만들기
        </button>
      </div>
    </div>

    <p v-if="isLoading" class="mb-3 rounded-lg bg-brand-50 px-4 py-3 text-sm font-black text-brand-600">
      내 여행 일정을 불러오는 중입니다.
    </p>
    <p v-else-if="loadError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-black text-red-500">
      {{ loadError }} 기존 임시 일정을 표시합니다.
    </p>

    <div class="space-y-3">
      <article
        v-for="trip in visibleTrips"
        :key="trip.id"
        class="brand-card group relative grid overflow-hidden rounded-lg transition duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md sm:grid-cols-[132px_1fr]"
        :class="manageMode ? '' : 'cursor-pointer'"
        @click="!manageMode && emit('openTrip', trip)"
      >
        <div class="relative h-28 bg-slate-200 sm:h-auto">
          <img :src="trip.image" :alt="trip.title" class="h-full w-full object-cover" />
          <span v-if="trip.dday" class="absolute left-2.5 top-2.5 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-black text-white">
            {{ trip.dday }}
          </span>
        </div>
        <div class="p-3.5 sm:p-4">
          <div class="flex flex-wrap gap-1.5 text-[11px] font-black text-slate-500">
            <span class="rounded-full bg-slate-100 px-2.5 py-1">✈ {{ trip.destination }}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1">{{ trip.period }}</span>
          </div>
          <h2 class="mt-2.5 text-lg font-black text-slate-950 sm:text-xl">{{ trip.title }}</h2>
          <p class="mt-1.5 text-xs font-semibold text-slate-500 sm:text-sm">{{ trip.description }}</p>
          <div class="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <div class="flex items-center">
              <span
                v-for="member in trip.members"
                :key="member"
                class="-ml-1.5 grid size-7 first:ml-0 place-items-center rounded-full border-2 border-white text-[11px] font-black"
                :class="member === '지수' ? 'bg-red-100 text-red-700' : member === '민수' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ member }}
              </span>
            </div>
            <button
              v-if="manageMode"
              class="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSaving || (!accessToken && trip.members.length > 1)"
              :title="!accessToken && trip.members.length > 1 ? '초대된 유저가 없어야 삭제할 수 있습니다.' : '일정 삭제'"
              @click.stop="requestDeleteTrip(trip)"
            >
              <Trash2 :size="14" />
              삭제
            </button>
            <span v-else class="text-[11px] font-black text-brand-500 sm:text-xs">상세 보기 →</span>
          </div>
        </div>
      </article>

      <p v-if="visibleTrips.length === 0" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">
        해당 탭에 표시할 일정이 없습니다.
      </p>
    </div>

    <Transition name="modal-fade">
      <div v-if="showModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl sm:max-w-md">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="flex items-center gap-2 text-xl font-black text-slate-950">
              <Plane :size="24" class="text-brand-500" />
              새 일정 만들기
            </h2>
            <button class="text-slate-500" aria-label="닫기" @click="showModal = false">
              <X :size="24" />
            </button>
          </div>

          <div class="space-y-3.5">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">여행 제목</span>
              <input v-model="draft.title" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 부산 힐링 여행" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">목적지</span>
              <input v-model="draft.destination" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="어디로 떠나시나요?" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">여행 유형</span>
              <select v-model="draft.tripType" class="brand-input select-control h-10 w-full rounded-lg px-3 text-sm outline-none">
                <option value="TEAM">팀 여행</option>
                <option value="PERSONAL">개인 여행</option>
              </select>
            </label>
            <div>
              <span class="mb-1.5 block text-xs font-black text-slate-950">여행 기간</span>
              <div class="grid grid-cols-1 gap-2">
                <input v-model="draft.start" type="date" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
                <input v-model="draft.end" type="date" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
              </div>
            </div>
          </div>

          <button class="btn-primary mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="createTrip">
            <Plus :size="16" />
            {{ isSaving ? '추가 중' : '일정 추가하기' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showJoinModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">초대 코드로 참여</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showJoinModal = false">
              <X :size="22" />
            </button>
          </div>
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">초대 코드</span>
            <input v-model="joinDraft.inviteCode" class="brand-input h-10 w-full rounded-lg px-3 text-sm uppercase outline-none" placeholder="ABCD1234" @keyup.enter="joinTrip" />
          </label>
          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="joinTrip">
            {{ isSaving ? '참여 중' : '참여하기' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="deleteTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">일정을 삭제하시겠습니까?</h2>
            <button class="text-slate-500" aria-label="닫기" @click="deleteTarget = null">
              <X :size="22" />
            </button>
          </div>
          <p class="text-sm font-semibold leading-6 text-slate-600">
            {{ deleteTarget.title }} 일정은 삭제 후 되돌릴 수 없습니다.
          </p>
          <p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-500">
            로그인 상태에서는 서버 권한 기준에 따라 삭제됩니다.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="deleteTarget = null">
              취소
            </button>
            <button class="h-10 rounded-lg bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="confirmDeleteTrip">
              {{ isSaving ? '삭제 중' : '삭제하기' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
