<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckCircle2, ChevronDown, Copy, Heart, Map, User, X } from 'lucide-vue-next'
import { trips } from '@/entities/travel/model/travel'
import KakaoMap from '@/shared/ui/KakaoMap.vue'

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

const liked = ref(false)
const showMapModal = ref(false)
const showCopyModal = ref(false)

const featuredPlace = {
  id: 'bijarim',
  title: '천년의 숲 비자림',
  category: '관광명소',
  location: '제주시 구좌읍 비자숲길 55',
  image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  coordinates: { lat: 33.4912, lng: 126.8114 },
}
const courseItems = [
  { day: '1일차', title: '애월 카페거리', time: '15:00', location: '제주시 애월읍' },
  { day: '2일차', title: featuredPlace.title, time: '10:00', location: featuredPlace.location },
  { day: '2일차', title: '성산일출봉', time: '14:00', location: '제주 서귀포시' },
]
const upcomingTrips = computed(() => trips.filter((trip) => trip.phase === 'upcoming'))
const mapMarkers = computed(() => [
  {
    id: featuredPlace.id,
    title: featuredPlace.title,
    position: featuredPlace.coordinates,
  },
])
const copyDraft = reactive({
  tripId: String(upcomingTrips.value[0]?.id ?? ''),
  startDate: '2024-11-15',
  firstTime: '10:00',
  memo: '커뮤니티 추천 코스에서 복사',
})

function confirmCopyToSchedule() {
  const targetTrip = trips.find((trip) => String(trip.id) === copyDraft.tripId)
  showCopyModal.value = false
  emit('saved', `추천 코스를 ${targetTrip?.title ?? '선택한 일정'}에 복사했습니다.`)
}
</script>

<template>
  <section class="app-container max-w-[880px] py-8">
    <button class="mb-5 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'community')">← 목록으로 돌아가기</button>

    <article class="brand-card rounded-2xl p-5 sm:p-8">
      <span class="inline-flex rounded-full bg-brand-500 px-3 py-1.5 text-xs font-black text-white">베스트 일정</span>
      <h1 class="mt-5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        부모님 모시고 가기 좋은 제주 3박 4일 코스 공유합니다!
      </h1>
      <div class="mt-5 flex flex-col gap-2 border-b border-slate-200 pb-6 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span class="flex items-center gap-2"><User :size="16" /> 트래블러 · 2시간 전</span>
        <span>조회수 1,420 · 좋아요 {{ liked ? 125 : 124 }}</span>
      </div>

      <div class="mt-6 space-y-6 text-base font-semibold leading-8 text-slate-700">
        <p>
          안녕하세요! 이번 연휴에 부모님을 모시고 제주도에 다녀왔습니다.
          많이 걷지 않고 편안하게 풍경을 즐길 수 있는 코스 위주로 일정을 짰는데 부모님께서 정말 만족하셨어요.
        </p>
        <img
          src="https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80"
          alt="서울 야경"
          class="h-72 w-full rounded-xl object-cover sm:h-[420px]"
        />
        <p>
          특히 2일차에 방문했던 <strong class="font-black text-slate-950">비자림</strong>은 숲길이 평탄해서 걷기 너무 좋았습니다.
          주변 식당도 깔끔한 곳이 많으니 제 일정표 참고하셔서 즐거운 가족 여행 되시길 바랍니다.
        </p>

        <div class="grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4 sm:grid-cols-[96px_1fr]">
          <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80" alt="비자림" class="size-24 rounded-lg object-cover" />
          <div>
            <h3 class="font-black text-slate-950">천년의 숲 비자림</h3>
            <p class="mt-2 text-sm text-slate-500">제주시 구좌읍 비자숲길 55</p>
            <button class="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-slate-950" @click="showMapModal = true">
              <Map :size="15" />
              지도 보기
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button
          class="like-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition"
          :class="liked ? 'liked bg-red-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'"
          @click="liked = !liked"
        >
          <Heart :size="16" :fill="liked ? 'currentColor' : 'none'" />
          좋아요 {{ liked ? 125 : 124 }}
        </button>
        <button class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800" @click="showCopyModal = true">
          <Copy :size="16" />
          내 일정으로 복사하기
        </button>
      </div>

      <section class="mt-8 border-t border-slate-200 pt-8">
        <h2 class="mb-5 text-lg font-black text-slate-950">댓글 <span class="text-brand-500">12</span></h2>
        <div class="mb-5 flex items-center gap-3">
          <span class="grid size-9 place-items-center rounded-full bg-slate-300 text-sm font-black text-slate-600">Me</span>
          <input class="brand-input h-11 min-w-0 flex-1 rounded-lg px-4 text-sm outline-none" placeholder="칭찬과 격려의 댓글을 남겨주세요." />
          <button class="h-11 rounded-lg bg-brand-500 px-5 text-sm font-black text-white">등록</button>
        </div>
        <div class="space-y-4">
          <div class="flex gap-3">
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">U</span>
            <div class="flex-1 rounded-lg bg-slate-100 p-4">
              <div class="mb-2 flex justify-between text-sm font-bold text-slate-500">
                <strong class="text-slate-950">바다바라기</strong>
                <span>1시간 전</span>
              </div>
              <p class="text-sm text-slate-700">좋은 정보 감사합니다. 혹시 비자림 갈 때 주말 주차는 붐비지 않았나요?</p>
            </div>
          </div>
          <div class="ml-8 flex gap-3 sm:ml-12">
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">M</span>
            <div class="flex-1 rounded-lg border-2 border-brand-500 bg-white p-4">
              <div class="mb-2 flex justify-between text-sm font-bold text-slate-500">
                <strong class="text-slate-950">트래블러 <span class="rounded bg-brand-500 px-2 py-1 text-xs text-white">작성자</span></strong>
                <span>45분 전</span>
              </div>
              <p class="text-sm text-slate-700">@바다바라기 저는 토요일 오전 10시쯤 갔는데 여유 있었습니다.</p>
            </div>
          </div>
        </div>
      </section>
    </article>

    <Transition name="modal-fade">
      <div v-if="showMapModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 class="text-lg font-black text-slate-950">지도 보기</h2>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ featuredPlace.title }} · {{ featuredPlace.location }}</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showMapModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="relative h-[360px] overflow-hidden bg-slate-100">
            <KakaoMap
              class="absolute inset-0"
              :center="featuredPlace.coordinates"
              :markers="mapMarkers"
              :selected-marker-id="featuredPlace.id"
              :level="4"
            />
            <div class="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <p class="text-xs font-black text-brand-500">{{ featuredPlace.category }}</p>
              <h3 class="mt-1 text-base font-black text-slate-950">{{ featuredPlace.title }}</h3>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ featuredPlace.location }}</p>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showCopyModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="flex items-center gap-2 text-xl font-black text-slate-950">
                <Copy :size="20" class="text-brand-500" />
                내 일정으로 복사하기
              </h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">커뮤니티 추천 코스를 내 여행 일정 초안으로 가져옵니다.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showCopyModal = false">
              <X :size="22" />
            </button>
          </div>

          <div class="rounded-xl bg-slate-50 p-4">
            <h3 class="mb-3 text-sm font-black text-slate-950">복사될 코스</h3>
            <div class="space-y-2">
              <article v-for="item in courseItems" :key="`${item.day}-${item.title}`" class="flex gap-3 rounded-lg bg-white p-3">
                <span class="grid h-8 min-w-12 place-items-center rounded-md bg-brand-50 text-xs font-black text-brand-500">{{ item.day }}</span>
                <div class="min-w-0">
                  <p class="text-sm font-black text-slate-950">{{ item.time }} {{ item.title }}</p>
                  <p class="mt-1 text-xs font-bold text-slate-500">{{ item.location }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="mt-4 grid gap-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">복사할 일정</span>
              <span class="select-wrap select-wrap-full">
                <select v-model="copyDraft.tripId" class="brand-input select-control h-10 w-full rounded-lg px-3 text-sm outline-none">
                  <option v-for="trip in upcomingTrips" :key="trip.id" :value="String(trip.id)">
                    {{ trip.title }}
                  </option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">시작일</span>
                <input v-model="copyDraft.startDate" type="date" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">첫 방문 시간</span>
                <input v-model="copyDraft.firstTime" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
              </label>
            </div>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="copyDraft.memo" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
          </div>

          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button class="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm" @click="confirmCopyToSchedule">
              <CheckCircle2 :size="17" />
              복사하기
            </button>
            <button class="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="showCopyModal = false">
              닫기
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
