<script setup lang="ts">
import { ChevronDown, Crosshair, Heart, Minus, Plus, Search, Star } from 'lucide-vue-next'
import { ref } from 'vue'
import { places } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'

const selectedPlaceId = ref(places[0]?.id ?? 0)
const likedIds = ref(new Set(places.filter((place) => place.liked).map((place) => place.id)))
const filters = ['전체', '관광명소', '음식점', '숙소', '카페']
const selectedFilter = ref('전체')
const sortOption = ref('추천순')

const emit = defineEmits<{
  openPlace: [place: Place]
  saved: [message: string]
}>()

function toggleLike(place: Place) {
  const next = new Set(likedIds.value)
  if (next.has(place.id)) {
    next.delete(place.id)
  } else {
    next.add(place.id)
    emit('saved', `${place.title}을(를) 좋아요에 추가했습니다.`)
  }
  likedIds.value = next
}
</script>

<template>
  <section class="app-container py-5 md:py-7">
    <div class="brand-card overflow-hidden rounded-xl">
      <div class="space-y-4 border-b border-slate-200 p-4">
        <div class="flex h-12 overflow-hidden rounded-full border-2 border-brand-500 bg-slate-50 shadow-md shadow-indigo-100 sm:h-14">
          <input
            class="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-700 outline-none sm:text-base"
            placeholder="어떤 장소를 찾으시나요? 예: 제주도 오션뷰 카페"
          />
          <button class="grid w-14 place-items-center bg-brand-500 text-white hover:bg-brand-600" aria-label="검색">
            <Search :size="23" />
          </button>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in filters"
              :key="filter"
              class="rounded-full px-3 py-1.5 text-xs font-black sm:text-sm"
              :class="selectedFilter === filter ? 'border border-brand-500 bg-brand-50 text-brand-500' : 'bg-slate-100 text-slate-950 hover:bg-brand-50'"
              @click="selectedFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
          <label class="relative inline-flex w-fit items-center">
            <select
              v-model="sortOption"
              class="appearance-none rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-8 text-xs font-black text-slate-950 outline-none sm:text-sm"
              aria-label="정렬"
            >
              <option>추천순</option>
              <option>평점순</option>
              <option>리뷰순</option>
            </select>
            <ChevronDown :size="16" class="pointer-events-none absolute right-3 text-slate-700" />
          </label>
        </div>
      </div>

      <div class="grid lg:h-[560px] xl:h-[620px] lg:grid-cols-[360px_1fr] 2xl:grid-cols-[420px_1fr]">
        <div class="max-h-[420px] space-y-3 overflow-y-auto border-b border-slate-200 p-4 lg:max-h-none lg:border-b-0 lg:border-r">
          <article
            v-for="place in places.filter((item) => selectedFilter === '전체' || item.category === selectedFilter)"
            :key="place.id"
            class="brand-card grid cursor-pointer grid-cols-[76px_1fr_32px] gap-3 rounded-xl p-3 transition hover:border-brand-500"
            @mouseenter="selectedPlaceId = place.id"
            @click="emit('openPlace', place)"
          >
            <img :src="place.image" :alt="place.title" class="size-19 rounded-lg object-cover" />
            <div>
              <h3 class="text-base font-black text-slate-950">{{ place.title }}</h3>
              <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
                <Star :size="14" class="text-amber-500" fill="currentColor" />
                <span class="text-amber-500">{{ place.rating }}</span>
                <span>리뷰 {{ place.reviewCount }}</span>
                <span>· {{ place.category }}</span>
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span v-for="tag in place.tags" :key="tag" class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                  {{ tag }}
                </span>
              </div>
              <button class="mt-2 rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-black text-brand-500" @click.stop="emit('saved', `${place.title}을(를) 일정에 추가했습니다.`)">
                + 일정 추가
              </button>
            </div>
            <button
              class="like-button grid size-8 place-items-center rounded-full transition"
              :class="likedIds.has(place.id) ? 'liked bg-red-50 text-red-500' : 'text-slate-300 hover:bg-slate-100 hover:text-red-400'"
              aria-label="좋아요"
              @click.stop="toggleLike(place)"
            >
              <Heart :size="20" :fill="likedIds.has(place.id) ? 'currentColor' : 'none'" />
            </button>
          </article>
        </div>

        <div class="relative h-[360px] overflow-hidden lg:h-auto">
          <img
            src="https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?auto=format&fit=crop&w=1500&q=80"
            alt="지도"
            class="h-full w-full object-cover"
          />
          <button
            v-for="place in places"
            :key="place.id"
            class="absolute -translate-x-1/2 -translate-y-full text-red-500 drop-shadow-lg transition"
            :class="selectedPlaceId === place.id ? 'scale-125' : ''"
            :style="{ top: place.marker.top, left: place.marker.left }"
            :aria-label="`${place.title} 지도 마커`"
            @click="emit('openPlace', place)"
          >
            <span class="relative block">
              <span class="absolute left-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full bg-white" />
              <svg viewBox="0 0 48 64" class="relative h-11 w-9 fill-current">
                <path d="M24 0C10.9 0 0 10.7 0 24c0 18 24 40 24 40s24-22 24-40C48 10.7 37.1 0 24 0Z" />
              </svg>
            </span>
          </button>

          <div class="absolute bottom-4 right-4 flex flex-col gap-2">
            <button class="grid size-10 place-items-center rounded-lg bg-white text-slate-950 shadow-lg" aria-label="확대">
              <Plus :size="21" />
            </button>
            <button class="grid size-10 place-items-center rounded-lg bg-white text-slate-950 shadow-lg" aria-label="축소">
              <Minus :size="21" />
            </button>
            <button class="grid size-10 place-items-center rounded-lg bg-white text-brand-500 shadow-lg" aria-label="현재 위치">
              <Crosshair :size="21" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
