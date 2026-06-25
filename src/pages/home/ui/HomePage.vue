<script setup lang="ts">
import { Flame, MapPinned, Plane } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchPlace, fetchPlaces, resolvePlaceDisplayImage } from '@/entities/place/api/placeApi'
import {
  fallbackHotPlaces,
  heroSlides,
  selectTrendingKeywords,
  type HomeAttraction,
  type HeroSlide,
} from '@/entities/home/model/homeContent'
import { mockCommunityPosts, toMockCommunitySummary } from '@/entities/community/model/mockCommunity'
import type { Place } from '@/entities/travel/model/travel'
import SafeImage from '@/shared/ui/SafeImage.vue'

const props = defineProps<{
  accessToken?: string
}>()

const emit = defineEmits<{
  change: [view: string]
  openPlace: [place: Place]
  searchPlace: [keyword: string]
  openCommunityPost: [postId: number]
}>()

type LiveHotPlace = {
  kind: 'live'
  place: Place
}

type FallbackHotPlace = HomeAttraction & {
  kind: 'fallback'
}

type HotPlaceCard = LiveHotPlace | FallbackHotPlace
type HeroCard = {
  config: HeroSlide
  place: Place | null
}

const activeSlideIndex = ref(0)
const hotPlaceCards = ref<HotPlaceCard[]>(fallbackHotPlaces.map((place) => ({ ...place, kind: 'fallback' })))
const heroCards = ref<HeroCard[]>(heroSlides.map((config) => ({ config, place: null })))
const trendingKeywords = selectTrendingKeywords()
const communityPosts = mockCommunityPosts.map(toMockCommunitySummary)
let slideTimer: number | undefined

const activeSlide = computed(() => heroCards.value[activeSlideIndex.value] ?? heroCards.value[0]!)
const rollingHotPlaces = computed(() => [...hotPlaceCards.value, ...hotPlaceCards.value, ...hotPlaceCards.value])

function isTouristAttraction(place: Place) {
  return [place.rawCategory, place.category].some((category) => category === '관광지')
}

function hasActualPlaceImage(place: Place) {
  return [place.thumbnailImage, place.detailImage, place.image].some(
    (image) => Boolean(image && image !== '/images/default-place.svg' && !image.endsWith('/images/default-place.svg')),
  )
}

function fillHotPlaces(livePlaces: Place[]) {
  const cards: HotPlaceCard[] = livePlaces
    .filter((place) => isTouristAttraction(place) && hasActualPlaceImage(place))
    .slice(0, 10)
    .map((place) => ({ kind: 'live', place }))
  const usedTitles = new Set(cards.map((card) => card.kind === 'live' ? card.place.title : card.title))

  for (const fallback of fallbackHotPlaces) {
    if (cards.length >= 10) break
    if (!usedTitles.has(fallback.title)) {
      cards.push({ ...fallback, kind: 'fallback' })
      usedTitles.add(fallback.title)
    }
  }
  hotPlaceCards.value = cards
}

async function loadHotPlaces() {
  try {
    const result = await fetchPlaces(
      { category: '관광지', sort: 'random', page: 0, size: 20 },
      props.accessToken || undefined,
    )
    fillHotPlaces(result.content)
  } catch {
    fillHotPlaces([])
  }
}

async function loadHeroPlaces() {
  heroCards.value = await Promise.all(heroSlides.map(async (config) => {
    try {
      const place = await fetchPlace(config.placeId, props.accessToken || undefined)
      return { config, place: hasActualPlaceImage(place) ? place : null }
    } catch {
      return { config, place: null }
    }
  }))
}

function openHotPlace(card: HotPlaceCard) {
  if (card.kind === 'live') {
    emit('openPlace', card.place)
    return
  }
  emit('searchPlace', card.searchKeyword)
}

function setSlide(index: number) {
  activeSlideIndex.value = index
}

function openHeroPlace() {
  const slide = activeSlide.value
  if (slide.place) {
    emit('openPlace', slide.place)
    return
  }
  emit('searchPlace', slide.config.searchKeyword)
}

function hotPlaceTitle(card: HotPlaceCard) {
  return card.kind === 'live' ? card.place.title : card.title
}

function hotPlaceDescription(card: HotPlaceCard) {
  return card.kind === 'live' ? card.place.description : card.description
}

function hotPlaceImage(card: HotPlaceCard) {
  return card.kind === 'live' ? resolvePlaceDisplayImage(card.place) : card.image
}

function hotPlaceFallbackImage(card: HotPlaceCard) {
  if (card.kind === 'fallback') return card.image
  const detailImage = card.place.detailImage
  return detailImage && detailImage !== hotPlaceImage(card) ? detailImage : '/images/default-place.svg'
}

function heroImage(card: HeroCard) {
  return card.place?.detailImage || card.config.image
}

onMounted(() => {
  void loadHotPlaces()
  void loadHeroPlaces()
  slideTimer = window.setInterval(() => {
    activeSlideIndex.value = (activeSlideIndex.value + 1) % heroCards.value.length
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
            <span class="grid size-11 place-items-center rounded-full bg-white/20"><Plane :size="24" /></span>
          </button>

          <button
            class="brand-card flex items-center justify-between rounded-xl px-5 py-5 text-left hover:border-brand-500"
            @click="emit('change', 'explore')"
          >
            <span>
              <span class="block text-xl font-black text-slate-950">여행지 탐색하기</span>
              <span class="mt-1 block text-sm font-bold text-slate-500">지도와 함께 핫플레이스 찾기</span>
            </span>
            <span class="grid size-11 place-items-center rounded-full bg-brand-100 text-brand-500"><MapPinned :size="24" /></span>
          </button>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span class="inline-flex items-center gap-1 font-black text-slate-950">
            <Flame :size="16" class="text-red-500" />
            지금 뜨는 키워드:
          </span>
          <button
            v-for="keyword in trendingKeywords"
            :key="keyword.query"
            data-testid="trending-keyword"
            :data-query="keyword.query"
            class="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-500 transition hover:bg-brand-100 hover:text-brand-600"
            @click="emit('searchPlace', keyword.query)"
          >
            {{ keyword.label }}
          </button>
        </div>
      </div>

      <div
        data-testid="hero-attraction"
        class="relative h-64 cursor-pointer overflow-hidden rounded-xl bg-slate-200 text-left shadow-lg shadow-slate-300 sm:h-80 lg:h-[420px]"
        role="button"
        tabindex="0"
        @click="openHeroPlace"
        @keyup.enter="openHeroPlace"
      >
        <Transition name="hero-slide" mode="out-in">
          <SafeImage
            :key="heroImage(activeSlide)"
            :src="heroImage(activeSlide)"
            :fallback-src="activeSlide.config.image"
            :alt="activeSlide.config.title"
            class="absolute inset-0 h-full w-full object-cover"
          />
        </Transition>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-5 text-white">
          <p class="text-base font-black">{{ activeSlide.config.caption }}</p>
          <p class="mt-1 text-sm font-semibold text-white/80">{{ activeSlide.config.title }}</p>
        </div>
        <div class="absolute right-4 top-4 flex gap-1.5">
          <button
            v-for="(_, index) in heroCards"
            :key="index"
            data-testid="hero-indicator"
            class="h-2 rounded-full bg-white/70 transition-all"
            :class="activeSlideIndex === index ? 'w-6 opacity-100' : 'w-2 opacity-70'"
            :aria-label="`${index + 1}번째 이미지 보기`"
            @click.stop="setSlide(index)"
          />
        </div>
      </div>
    </div>

    <section class="relative mt-20 md:mt-24">
      <h2 class="mb-5 flex items-center gap-2.5 text-xl font-black text-slate-950 sm:text-2xl">
        <span class="section-title-icon" aria-hidden="true"><MapPinned :size="18" /></span>
        요즘 뜨는 핫플레이스
      </h2>
      <div class="hotplace-bleed">
        <div class="hotplace-marquee">
          <div class="hotplace-track flex gap-4 py-3">
            <article
              v-for="(card, index) in rollingHotPlaces"
              :key="`${hotPlaceTitle(card)}-${index}`"
              :data-testid="card.kind === 'live' ? `hot-place-live-${card.place.id}` : `hot-place-fallback-${card.title}`"
              class="hotplace-card brand-card group w-[260px] shrink-0 cursor-pointer overflow-hidden rounded-xl transition duration-300 hover:z-10 hover:border-brand-500 hover:shadow-xl"
              @click="openHotPlace(card)"
            >
              <div class="relative h-36 bg-slate-200 sm:h-40">
                <SafeImage
                  :src="hotPlaceImage(card)"
                  :fallback-src="hotPlaceFallbackImage(card)"
                  :alt="hotPlaceTitle(card)"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div class="p-4">
                <h3 class="text-base font-black text-slate-950">{{ hotPlaceTitle(card) }}</h3>
                <p class="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-500">{{ hotPlaceDescription(card) }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-20 md:mt-24">
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2.5 text-xl font-black text-slate-950 sm:text-2xl">
          <span class="section-title-icon text-red-500" aria-hidden="true"><Flame :size="18" /></span>
          커뮤니티 인기글
        </h2>
        <button class="text-sm font-black text-brand-500" @click="emit('change', 'community')">더 보기</button>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="post in communityPosts"
          :key="post.postId"
          :data-testid="`mock-community-post-${post.postId}`"
          class="brand-card cursor-pointer overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          @click="emit('openCommunityPost', post.postId)"
        >
          <div class="grid sm:grid-cols-[160px_1fr]">
            <img :src="post.imageUrl || ''" :alt="post.title" class="h-40 w-full object-cover sm:h-full" />
            <div class="p-4">
              <p class="text-xs font-black text-brand-500">{{ post.category }}</p>
              <h3 class="mt-2 text-base font-black leading-snug text-slate-950">{{ post.title }}</h3>
              <p class="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{{ post.excerpt }}</p>
              <div class="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{{ post.authorNickname }}</span>
                <span>좋아요 {{ post.likeCount }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
