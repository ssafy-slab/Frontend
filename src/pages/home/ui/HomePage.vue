<script setup lang="ts">
import { Bot, Flame, MapPinned, Plane, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { hotKeywords, hotPlaces, places } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'

const emit = defineEmits<{
  change: [view: string]
  openPlace: [place: Place]
}>()

const showScheduleModal = ref(false)

function getLinkedPlace(index: number): Place {
  return places[index % places.length] ?? places[0]!
}
</script>

<template>
  <section class="app-container py-6 md:py-9">
    <div class="grid items-center gap-7 lg:grid-cols-[1fr_0.9fr]">
      <div>
        <h1 class="text-3xl font-black leading-tight tracking-[-0.02em] text-slate-950 sm:text-4xl lg:text-5xl">
          이번 주말,<br />
          어디로 떠나볼까요?
        </h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
          AI가 취향에 맞는 일정을 짜주고, 친구들과의 대화로 쉽게 일정을 조율해 보세요.
        </p>

        <div class="mt-6 grid gap-3 sm:max-w-lg">
          <button
            class="flex items-center justify-between rounded-xl bg-brand-500 px-5 py-5 text-left text-white shadow-sm hover:bg-brand-600"
            @click="showScheduleModal = true"
          >
            <span>
              <span class="block text-xl font-black">새 일정 만들기</span>
              <span class="mt-1 block text-sm font-bold text-brand-100">AI 맞춤 추천 및 팀원 초대하기</span>
            </span>
            <span class="grid size-11 place-items-center rounded-full bg-white/20">
              <Plane :size="24" />
            </span>
          </button>

          <button
            class="brand-card flex items-center justify-between rounded-xl px-5 py-5 text-left hover:border-brand-500"
            @click="emit('change', 'explore')"
          >
            <span>
              <span class="block text-xl font-black text-slate-950">여행지 탐색하기</span>
              <span class="mt-1 block text-sm font-bold text-slate-500">지도와 함께 핫플레이스 찾기</span>
            </span>
            <span class="grid size-11 place-items-center rounded-full bg-brand-100 text-brand-500">
              <MapPinned :size="24" />
            </span>
          </button>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span class="inline-flex items-center gap-1 font-black text-slate-950">
            <Flame :size="16" class="text-red-500" fill="currentColor" />
            지금 뜨는 키워드:
          </span>
          <button v-for="keyword in hotKeywords" :key="keyword" class="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-500">
            {{ keyword }}
          </button>
        </div>
      </div>

      <img
        src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80"
        alt="베네치아 운하"
        class="h-64 w-full rounded-xl object-cover shadow-lg shadow-slate-300 sm:h-80 lg:h-[420px]"
      />
    </div>

    <section class="mt-10 md:mt-12">
      <h2 class="mb-5 flex items-center gap-2 text-xl font-black text-slate-950 sm:text-2xl">
        <MapPinned :size="24" class="text-brand-500" fill="currentColor" />
        요즘 뜨는 핫플레이스
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(place, index) in hotPlaces"
          :key="place.title"
          class="brand-card group cursor-pointer overflow-hidden rounded-xl transition duration-200 hover:-translate-y-1 hover:border-brand-500 hover:shadow-md"
          @click="emit('openPlace', getLinkedPlace(index))"
        >
          <div class="relative h-36 bg-slate-200 sm:h-40">
            <img :src="place.image" :alt="place.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <span
              v-if="place.aiPick"
              class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-black text-white"
            >
              <Bot :size="13" />
              AI 추천
            </span>
          </div>
          <div class="p-4">
            <h3 class="text-base font-black text-slate-950">{{ place.title }}</h3>
            <p class="mt-1.5 text-sm font-semibold text-slate-500">{{ place.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <Transition name="modal-fade">
      <div v-if="showScheduleModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-xl font-black text-slate-950">
            <Plane :size="24" class="text-brand-500" />
            새 일정 만들기
          </h2>
          <button class="text-slate-500" aria-label="닫기" @click="showScheduleModal = false">
            <X :size="24" />
          </button>
        </div>

        <div class="space-y-3.5">
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">여행 제목</span>
            <input class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 부산 힐링 여행" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">목적지</span>
            <input class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="어디로 떠나시나요?" />
          </label>
          <div>
            <span class="mb-1.5 block text-xs font-black text-slate-950">여행 기간</span>
            <div class="grid gap-2 sm:grid-cols-[1fr_18px_1fr] sm:items-center">
              <input class="brand-input h-10 rounded-lg px-3 text-sm outline-none" placeholder="연도-월-일" />
              <span class="hidden text-center text-xs font-bold text-slate-500 sm:block">~</span>
              <input class="brand-input h-10 rounded-lg px-3 text-sm outline-none" placeholder="연도-월-일" />
            </div>
          </div>
          <div>
            <span class="mb-1.5 block text-xs font-black text-slate-950">여행 유형</span>
            <div class="flex flex-wrap gap-1.5">
              <button class="rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-500">나홀로 여행</button>
              <button class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">친구와 함께</button>
              <button class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">가족 여행</button>
            </div>
          </div>
        </div>

        <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="showScheduleModal = false">
          일정 상세 만들기
        </button>
      </section>
      </div>
    </Transition>
  </section>
</template>
