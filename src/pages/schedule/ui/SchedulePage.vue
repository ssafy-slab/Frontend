<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Plane, Plus, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'
import { trips } from '@/entities/travel/model/travel'

type User = {
  email: string
  nickname: string
}

defineProps<{
  currentUser: User | null
}>()

const emit = defineEmits<{
  openTrip: [trip: Trip]
  saved: [message: string]
}>()

const localTrips = ref<Trip[]>([...trips])
const activePhase = ref<'upcoming' | 'past'>('upcoming')
const showModal = ref(false)
const draft = reactive({
  title: '',
  destination: '',
  start: '',
  end: '',
})

function createTrip() {
  if (!draft.title.trim() || !draft.destination.trim()) return

  const trip: Trip = {
    id: Date.now(),
    title: draft.title.trim(),
    destination: draft.destination.trim(),
    period: `${draft.start || '시작일'} - ${draft.end || '종료일'}`,
    description: `${draft.destination.trim()} 여행 후보를 만들었습니다. 장소를 추가하고 팀원과 조율해보세요.`,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    members: ['나'],
    status: 'AI가 일정 조율 중',
    phase: 'upcoming',
  }

  localTrips.value = [trip, ...localTrips.value]
  activePhase.value = 'upcoming'
  draft.title = ''
  draft.destination = ''
  draft.start = ''
  draft.end = ''
  showModal.value = false
  emit('saved', '새 일정이 추가되었습니다.')
}
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
          다가오는 일정 ({{ localTrips.filter((trip) => trip.phase === 'upcoming').length }})
        </button>
        <button
          class="pb-2.5"
          :class="activePhase === 'past' ? 'border-b-2 border-brand-500 text-slate-950' : 'text-slate-500'"
          @click="activePhase = 'past'"
        >
          지난 일정 ({{ localTrips.filter((trip) => trip.phase === 'past').length }})
        </button>
      </div>
      <button class="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-black text-white hover:bg-brand-600" @click="showModal = true">
        + 새 일정 만들기
      </button>
    </div>

    <div class="space-y-3">
      <article
        v-for="trip in localTrips.filter((item) => item.phase === activePhase)"
        :key="trip.id"
        class="brand-card group relative grid cursor-pointer overflow-hidden rounded-lg transition duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md sm:grid-cols-[132px_1fr]"
        @click="emit('openTrip', trip)"
      >
        <div class="relative h-28 bg-slate-200 sm:h-auto">
          <img :src="trip.image" :alt="trip.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
            <span class="text-[11px] font-black text-brand-500 sm:text-xs">상세 보기 →</span>
          </div>
        </div>
      </article>

      <p v-if="localTrips.filter((item) => item.phase === activePhase).length === 0" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">
        해당 탭에 표시할 일정이 없습니다.
      </p>
    </div>

    <Transition name="modal-fade">
      <div v-if="showModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
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
          <div>
            <span class="mb-1.5 block text-xs font-black text-slate-950">여행 기간</span>
            <div class="grid grid-cols-1 gap-2">
              <input v-model="draft.start" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="시작일 (연도-월-일)" />
              <input v-model="draft.end" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="종료일 (연도-월-일)" />
            </div>
          </div>
        </div>

        <button class="btn-primary mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm" @click="createTrip">
          <Plus :size="16" />
          일정 추가하기
        </button>
      </section>
      </div>
    </Transition>
  </section>
</template>
