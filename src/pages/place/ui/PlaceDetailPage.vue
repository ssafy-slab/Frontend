<script setup lang="ts">
import { CalendarPlus, ChevronDown, CloudSun, Heart, Map, MessageSquareText, Share2, Star, Vote, X, Zap } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import { trips } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'

const props = defineProps<{
  place: Place | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

const liked = ref(false)
const review = ref('')
const showAddModal = ref(false)
const showMapModal = ref(false)
const addMode = ref<'trip' | 'candidate'>('trip')
const addDraft = reactive({
  tripId: String(trips.find((trip) => trip.phase === 'upcoming')?.id ?? ''),
  time: '13:00',
  memo: '',
})
const reviews = ref([
  { author: '여행자민', text: '오전 시간대가 한적해서 사진 찍기 좋았어요.' },
  { author: '지수', text: '주차 가능 여부가 표시되어 있어서 일정 짜기 편했습니다.' },
])

const displayPlace = computed(() => props.place)

function addReview() {
  const text = review.value.trim()
  if (!text) return
  reviews.value.unshift({ author: '나', text })
  review.value = ''
  emit('saved', '리뷰가 등록되었습니다.')
}

function openAddModal() {
  addMode.value = 'trip'
  showAddModal.value = true
}

function submitAddPlace() {
  if (!displayPlace.value) return
  const trip = trips.find((item) => String(item.id) === addDraft.tripId)
  const target = trip?.title ?? '선택한 일정'
  const message =
    addMode.value === 'trip'
      ? `${displayPlace.value.title}을(를) ${target} ${addDraft.time}에 추가했습니다.`
      : `${displayPlace.value.title}을(를) ${target} 팀 후보 투표로 올렸습니다.`

  showAddModal.value = false
  addDraft.memo = ''
  emit('saved', message)
}
</script>

<template>
  <section v-if="displayPlace" class="app-container py-6 md:py-8">
    <button class="mb-5 text-sm font-black text-slate-500" @click="emit('change', 'explore')">← 탐색으로 돌아가기</button>

    <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="relative h-72 overflow-hidden bg-slate-200 sm:h-96 lg:h-[460px]">
          <img :src="displayPlace.image" :alt="displayPlace.title" class="h-full w-full object-cover transition duration-700 hover:scale-105" />
          <button
            class="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/90 text-slate-400 shadow-md backdrop-blur transition hover:text-red-500"
            :class="liked ? 'text-red-500' : ''"
            aria-label="좋아요"
            @click="liked = !liked"
          >
            <Heart :size="22" :fill="liked ? 'currentColor' : 'none'" />
          </button>
        </div>

        <div class="p-5 sm:p-7">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-black text-brand-600">{{ displayPlace.category }}</span>
            <span class="inline-flex items-center gap-1 text-sm font-black text-amber-500">
              <Star :size="16" />
              {{ displayPlace.rating }}
            </span>
            <span class="text-sm font-bold text-slate-500">리뷰 {{ displayPlace.reviewCount }}</span>
          </div>

          <h1 class="mt-4 text-3xl font-black text-slate-950">{{ displayPlace.title }}</h1>
          <p class="mt-2 text-sm font-bold text-slate-500">{{ displayPlace.location }}</p>
          <p class="mt-5 text-base leading-7 text-slate-600">{{ displayPlace.description }}</p>

          <div class="mt-5 flex flex-wrap gap-2">
            <span v-for="tag in displayPlace.tags" :key="tag" class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
              {{ tag }}
            </span>
          </div>

          <div class="mt-7 grid gap-3">
            <button class="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-lg text-base" @click="openAddModal">
              <CalendarPlus :size="17" />
              내 여행에 추가하기
            </button>
            <div class="grid gap-3 sm:grid-cols-2">
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="emit('saved', '공유 링크를 복사했습니다.')">
                <Share2 :size="17" />
                공유
              </button>
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="showMapModal = true">
                <Map :size="17" />
                지도 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
      <section class="brand-card rounded-2xl p-5">
        <h2 class="mb-4 flex items-center gap-2 text-lg font-black text-slate-950">
          <MessageSquareText :size="20" class="text-brand-500" />
          리뷰 작성
        </h2>
        <div class="flex gap-3">
          <input v-model="review" class="brand-input h-11 min-w-0 flex-1 rounded-lg px-4 text-sm outline-none" placeholder="방문 팁이나 후기를 남겨보세요." @keyup.enter="addReview" />
          <button class="btn-primary h-11 rounded-lg px-5 text-sm" @click="addReview">등록</button>
        </div>
        <div class="mt-4 space-y-3">
          <article v-for="item in reviews" :key="`${item.author}-${item.text}`" class="rounded-lg bg-slate-50 p-4">
            <p class="text-sm font-black text-slate-950">{{ item.author }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ item.text }}</p>
          </article>
        </div>
      </section>

      <aside class="space-y-4">
        <section class="brand-card rounded-2xl p-5">
          <h2 class="mb-4 text-lg font-black text-slate-950">부가 정보</h2>
          <div class="grid gap-3 text-sm">
            <p class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span class="inline-flex items-center gap-2 font-bold text-slate-500"><CloudSun :size="16" /> 날씨</span>
              <span class="font-black text-slate-800">맑음 23도</span>
            </p>
            <p class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span class="inline-flex items-center gap-2 font-bold text-slate-500"><Zap :size="16" /> 충전소</span>
              <span class="font-black text-slate-800">1.2km</span>
            </p>
          </div>
        </section>
        <section class="brand-card h-64 cursor-pointer rounded-2xl bg-sky-100 p-5" @click="showMapModal = true">
          <p class="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700">위치 지도</p>
          <div class="mt-8 grid h-36 place-items-center rounded-xl bg-white/60 text-sm font-black text-brand-500">
            {{ displayPlace.location }}
          </div>
        </section>
      </aside>
    </div>

    <Transition name="modal-fade">
      <div v-if="showAddModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black text-slate-950">여행에 추가하기</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">{{ displayPlace.title }}을(를) 추가할 방식을 선택하세요.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showAddModal = false">
              <X :size="22" />
            </button>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button
              class="rounded-xl border p-4 text-left transition"
              :class="addMode === 'trip' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @click="addMode = 'trip'"
            >
              <CalendarPlus :size="20" />
              <span class="mt-2 block text-sm font-black">일정에 바로 추가</span>
              <span class="mt-1 block text-xs font-bold text-slate-500">시간을 지정해 내 일정에 넣습니다.</span>
            </button>
            <button
              class="rounded-xl border p-4 text-left transition"
              :class="addMode === 'candidate' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @click="addMode = 'candidate'"
            >
              <Vote :size="20" />
              <span class="mt-2 block text-sm font-black">팀 후보로 올리기</span>
              <span class="mt-1 block text-xs font-bold text-slate-500">팀원이 투표할 장소 후보로 등록합니다.</span>
            </button>
          </div>

          <div class="mt-4 space-y-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">추가할 일정</span>
              <span class="select-wrap select-wrap-full">
                <select v-model="addDraft.tripId" class="brand-input select-control h-10 w-full rounded-lg px-3 text-sm outline-none">
                  <option v-for="trip in trips.filter((item) => item.phase === 'upcoming')" :key="trip.id" :value="String(trip.id)">
                    {{ trip.title }}
                  </option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <label v-if="addMode === 'trip'" class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">방문 시간</span>
              <input v-model="addDraft.time" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="addDraft.memo" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :placeholder="addMode === 'trip' ? '예: 노을 시간에 방문' : '예: 첫날 저녁 후보'" />
            </label>
          </div>

          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="submitAddPlace">
            {{ addMode === 'trip' ? '선택한 일정에 추가' : '팀 후보로 등록' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showMapModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 class="text-lg font-black text-slate-950">지도 보기</h2>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ displayPlace.title }} · {{ displayPlace.location }}</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showMapModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="relative h-[360px] overflow-hidden bg-[#f5f1e8] kakao-map-mock">
            <div class="absolute left-[12%] top-[18%] h-20 w-40 rounded-[45%] bg-emerald-100/90" />
            <div class="absolute right-[12%] top-[16%] h-28 w-44 rounded-[45%] bg-emerald-100/80" />
            <div class="absolute bottom-[12%] left-[18%] h-28 w-52 rounded-[45%] bg-sky-100/80" />
            <div class="absolute left-[15%] top-[44%] h-3 w-[74%] -rotate-12 rounded-full bg-white shadow-sm" />
            <div class="absolute left-[8%] top-[38%] h-3 w-[70%] rotate-[22deg] rounded-full bg-white shadow-sm" />
            <div class="absolute left-[46%] top-[10%] h-[78%] w-3 rotate-[6deg] rounded-full bg-white shadow-sm" />
            <div class="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full text-brand-500 drop-shadow-lg">
              <span class="relative block">
                <span class="absolute left-1/2 top-2 z-10 size-3 -translate-x-1/2 rounded-full border border-white/80 bg-white shadow-sm" />
                <svg viewBox="0 0 48 64" class="relative h-12 w-10 fill-current">
                  <path d="M24 0C10.9 0 0 10.7 0 24c0 18 24 40 24 40s24-22 24-40C48 10.7 37.1 0 24 0Z" />
                </svg>
              </span>
            </div>
            <div class="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <p class="text-xs font-black text-brand-500">{{ displayPlace.category }}</p>
              <h3 class="mt-1 text-base font-black text-slate-950">{{ displayPlace.title }}</h3>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ displayPlace.location }}</p>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
