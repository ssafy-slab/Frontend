<script setup lang="ts">
import { Bot, Flame, MapPinned, Plane } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { hotKeywords, hotPlaces, places, posts } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'

const emit = defineEmits<{
  change: [view: string]
  openPlace: [place: Place]
}>()

type HeroSlide = {
  image: string
  title: string
  caption: string
  placeId: number
}

const heroSlides: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1400&q=80',
    title: '제주 오름',
    caption: '바람 따라 걷는 자연 코스',
    placeId: 3,
  },
  {
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    title: '강릉 안목해변',
    caption: '커피 향 가득한 바다 여행',
    placeId: 1,
  },
  {
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1400&q=80',
    title: '서울 북촌 한옥마을',
    caption: '도심 속 전통 골목 산책',
    placeId: 4,
  },
  {
    image: 'https://images.unsplash.com/photo-1506812574058-fc75fa93fead?auto=format&fit=crop&w=1400&q=80',
    title: '부산 광안리',
    caption: '야경이 예쁜 해변 코스',
    placeId: 4,
  },
  {
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1400&q=80',
    title: '서울 남산',
    caption: '노을과 야경을 함께 보는 하루',
    placeId: 4,
  },
]

const rollingHotPlaces = [...hotPlaces, ...hotPlaces, ...hotPlaces]
const activeSlideIndex = ref(0)
let slideTimer: number | undefined

const activeSlide = computed<HeroSlide>(() => heroSlides[activeSlideIndex.value] ?? heroSlides[0]!)

function getLinkedPlace(index: number): Place {
  return places[index % places.length] ?? places[0]!
}

function setSlide(index: number) {
  activeSlideIndex.value = index
}

function openHeroPlace() {
  const place = places.find((item) => item.id === activeSlide.value.placeId) ?? places[0]
  if (place) emit('openPlace', place)
}

onMounted(() => {
  slideTimer = window.setInterval(() => {
    activeSlideIndex.value = (activeSlideIndex.value + 1) % heroSlides.length
  }, 4000)
})

onUnmounted(() => {
  if (slideTimer) window.clearInterval(slideTimer)
})
</script>

<template>
  <section class="app-container py-6 md:py-9">
    <div class="grid items-center gap-7 lg:grid-cols-[1fr_0.9fr]">
      <div>
        <h1 class="text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
          이번 주말,<br />
          어디로 떠나볼까요?
        </h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
          AI가 취향에 맞는 일정을 짜주고, 친구들과 대화로 쉽게 일정을 조율해보세요.
        </p>

        <div class="mt-6 grid gap-3 sm:max-w-lg">
          <button
            class="flex items-center justify-between rounded-xl bg-brand-500 px-5 py-5 text-left text-white shadow-sm hover:bg-brand-600"
            @click="emit('change', 'schedule')"
          >
            <span>
              <span class="block text-xl font-black">일정 탭으로 이동</span>
              <span class="mt-1 block text-sm font-bold text-brand-100">내 여행 일정 확인하고 새 일정 만들기</span>
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

      <div class="relative h-64 cursor-pointer overflow-hidden rounded-xl bg-slate-200 text-left shadow-lg shadow-slate-300 sm:h-80 lg:h-[420px]" role="button" tabindex="0" @click="openHeroPlace" @keyup.enter="openHeroPlace">
        <Transition name="hero-slide" mode="out-in">
          <img
            :key="activeSlide.image"
            :src="activeSlide.image"
            :alt="activeSlide.title"
            class="absolute inset-0 h-full w-full object-cover"
          />
        </Transition>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/65 to-transparent p-4 text-white">
          <p class="text-sm font-black">{{ activeSlide.caption }}</p>
          <p class="mt-1 text-xs font-semibold text-white/80">{{ activeSlide.title }}</p>
        </div>
        <div class="absolute right-4 top-4 flex gap-1.5">
          <button
            v-for="(_, index) in heroSlides"
            :key="index"
            class="h-2 rounded-full bg-white/70 transition-all"
            :class="activeSlideIndex === index ? 'w-6 opacity-100' : 'w-2 opacity-70'"
            :aria-label="`${index + 1}번째 이미지 보기`"
            @click.stop="setSlide(index)"
          />
        </div>
      </div>
    </div>

    <section class="relative mt-20 md:mt-24">
      <h2 class="mb-5 flex items-center gap-2 text-xl font-black text-slate-950 sm:text-2xl">
        <MapPinned :size="24" class="text-brand-500" fill="currentColor" />
        요즘 뜨는 핫플레이스
      </h2>
      <div class="hotplace-bleed">
        <div class="hotplace-marquee">
          <div class="hotplace-track flex gap-4 py-3">
            <article
              v-for="(place, index) in rollingHotPlaces"
              :key="`${place.title}-${index}`"
              class="hotplace-card brand-card group w-[260px] shrink-0 cursor-pointer overflow-hidden rounded-xl transition duration-300 hover:z-10 hover:border-brand-500 hover:shadow-xl"
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
        </div>
      </div>
    </section>

    <section class="mt-20 md:mt-24">
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="text-xl font-black text-slate-950 sm:text-2xl">커뮤니티 인기글</h2>
        <button class="text-sm font-black text-brand-500" @click="emit('change', 'community')">더 보기</button>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="post in posts"
          :key="post.id"
          class="brand-card cursor-pointer overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          @click="emit('change', 'community-detail')"
        >
          <div class="grid sm:grid-cols-[160px_1fr]">
            <img :src="post.image" :alt="post.title" class="h-40 w-full object-cover sm:h-full" />
            <div class="p-4">
              <p class="text-xs font-black text-brand-500">{{ post.category }}</p>
              <h3 class="mt-2 text-base font-black leading-snug text-slate-950">{{ post.title }}</h3>
              <p class="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{{ post.excerpt }}</p>
              <div class="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{{ post.author }}</span>
                <span>좋아요 {{ post.likes }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
