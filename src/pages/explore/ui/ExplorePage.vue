<script setup lang="ts">
import { ChevronDown, Heart, Search, Star, X } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import { places, trips } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'
import KakaoMap from '@/shared/ui/KakaoMap.vue'

const selectedPlaceId = ref(places[0]?.id ?? 0)
const likedIds = ref(new Set(places.filter((place) => place.liked).map((place) => place.id)))
const filters = ['전체', '관광명소', '음식점', '숙소', '카페']
const selectedFilter = ref('전체')
const sortOption = ref('추천순')
const showAddModal = ref(false)
const addTarget = ref<Place | null>(null)
const addDraft = reactive({
  tripId: String(trips[0]?.id ?? ''),
  time: '13:00',
  memo: '',
})

const selectedPlace = computed(() => places.find((place) => place.id === selectedPlaceId.value) ?? places[0])
const mapMarkers = computed(() =>
  places.map((place) => ({
    id: place.id,
    title: place.title,
    position: place.coordinates,
  })),
)
const mapCenter = computed(() => selectedPlace.value?.coordinates ?? places[0]?.coordinates ?? { lat: 37.5665, lng: 126.978 })

const emit = defineEmits<{
  openPlace: [place: Place]
  saved: [message: string]
}>()

function toggleLike(place: Place) {
  const next = new Set(likedIds.value)
  if (next.has(place.id)) next.delete(place.id)
  else {
    next.add(place.id)
    emit('saved', `${place.title}을(를) 좋아요에 추가했습니다.`)
  }
  likedIds.value = next
}

function openAddModal(place: Place) {
  addTarget.value = place
  showAddModal.value = true
}

function addToTrip() {
  if (!addTarget.value) return
  const trip = trips.find((item) => String(item.id) === addDraft.tripId)
  showAddModal.value = false
  emit('saved', `${addTarget.value.title}을(를) ${trip?.title ?? '선택한 일정'} ${addDraft.time}에 추가했습니다.`)
  addDraft.memo = ''
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
          <label class="select-wrap">
            <select
              v-model="sortOption"
              class="select-control h-9 rounded-full border border-slate-200 bg-slate-50 pl-4 text-xs font-black text-slate-950 outline-none sm:text-sm"
              aria-label="정렬"
            >
              <option>추천순</option>
              <option>평점순</option>
              <option>리뷰순</option>
            </select>
            <ChevronDown :size="15" class="select-chevron" />
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
              <button class="mt-2 rounded-md bg-brand-100 px-2 py-1 text-[11px] font-black text-brand-500" @click.stop="openAddModal(place)">
                + 일정
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

        <div class="relative h-[360px] overflow-hidden bg-[#f5f1e8] lg:h-auto">
          <div class="absolute left-4 top-4 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
            Kakao Map
          </div>

          <KakaoMap
            class="absolute inset-0"
            :center="mapCenter"
            :markers="mapMarkers"
            :selected-marker-id="selectedPlaceId"
            :level="8"
            @marker-click="selectedPlaceId = Number($event.id)"
          />

          <section
            v-if="selectedPlace"
            class="absolute left-4 right-4 top-16 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:left-auto sm:w-72"
          >
            <p class="text-xs font-black text-brand-500">{{ selectedPlace.category }}</p>
            <h3 class="mt-1 text-base font-black text-slate-950">{{ selectedPlace.title }}</h3>
            <p class="mt-1 text-xs font-bold text-slate-500">{{ selectedPlace.location }}</p>
            <p class="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{{ selectedPlace.description }}</p>
            <div class="mt-3 flex gap-2">
              <button class="h-8 flex-1 rounded-lg bg-brand-500 text-xs font-black text-white" @click="emit('openPlace', selectedPlace)">
                상세 보기
              </button>
              <button class="h-8 rounded-lg bg-brand-100 px-3 text-[11px] font-black text-brand-600" @click="openAddModal(selectedPlace)">
                + 일정
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>

    <Transition name="modal-fade">
      <div v-if="showAddModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">일정에 장소 추가</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showAddModal = false">
              <X :size="22" />
            </button>
          </div>
          <p class="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">{{ addTarget?.title }}</p>
          <div class="space-y-3">
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
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">방문 시간대</span>
              <input v-model="addDraft.time" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="addDraft.memo" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 점심 식사 후보" />
            </label>
          </div>
          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="addToTrip">
            선택한 일정에 추가
          </button>
        </section>
      </div>
    </Transition>
  </section>
</template>
