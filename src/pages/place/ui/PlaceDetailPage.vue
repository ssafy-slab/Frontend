<script setup lang="ts">
import { CalendarPlus, CloudSun, Heart, Map, MessageSquareText, Share2, Star, Users, Zap } from 'lucide-vue-next'
import { computed, ref } from 'vue'
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
              <Star :size="16" fill="currentColor" />
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

          <div class="mt-7 grid gap-3 sm:grid-cols-2">
            <button class="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm" @click="emit('saved', '내 여행에 장소를 추가했습니다.')">
              <CalendarPlus :size="17" />
              내 여행에 추가
            </button>
            <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-100 text-sm font-black text-brand-600" @click="emit('saved', '팀 여행 후보로 추가했습니다.')">
              <Users :size="17" />
              팀 후보로 추가
            </button>
            <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="emit('saved', '공유 링크를 복사했습니다.')">
              <Share2 :size="17" />
              공유
            </button>
            <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="emit('saved', '지도 위치를 확인했습니다.')">
              <Map :size="17" />
              지도 보기
            </button>
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
        <section class="brand-card h-64 rounded-2xl bg-sky-100 p-5">
          <p class="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700">위치 지도</p>
          <div class="mt-8 grid h-36 place-items-center rounded-xl bg-white/60 text-sm font-black text-brand-500">
            {{ displayPlace.location }}
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>
