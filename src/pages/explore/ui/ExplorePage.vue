<script setup lang="ts">
import { ChevronDown, Heart, LoaderCircle, RotateCcw, Search, Star, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { fetchPlaceFilters, fetchPlaces } from '@/entities/place/api/placeApi'
import type { PlaceCategory, RegionFilter } from '@/entities/place/api/placeApi'
import { trips } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'
import KakaoMap from '@/shared/ui/KakaoMap.vue'

const pageSize = 20
const selectedPlaceId = ref<number | null>(null)
const likedIds = ref(new Set<number>())
const selectedCategory = ref('')
const selectedProvinceId = ref('')
const selectedDistrictId = ref('')
const keywordInput = ref('')
const keyword = ref('')
const page = ref(0)
const places = ref<Place[]>([])
const categories = ref<PlaceCategory[]>([])
const regions = ref<RegionFilter[]>([])
const totalElements = ref(0)
const hasNext = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const showAddModal = ref(false)
const addTarget = ref<Place | null>(null)
const addDraft = reactive({
  tripId: String(trips[0]?.id ?? ''),
  time: '13:00',
  memo: '',
})

const selectedPlace = computed(() => places.value.find((place) => place.id === selectedPlaceId.value) ?? places.value[0] ?? null)
const mapMarkers = computed(() =>
  places.value.map((place) => ({
    id: place.id,
    title: place.title,
    position: place.coordinates,
  })),
)
const mapCenter = computed(() => selectedPlace.value?.coordinates ?? { lat: 37.5665, lng: 126.978 })
const provinces = computed(() => regions.value.filter((region) => region.regionLevel === 1 && region.placeCount > 0))
const districts = computed(() =>
  regions.value.filter((region) => region.regionLevel === 2 && String(region.parentRegionId ?? '') === selectedProvinceId.value && region.placeCount > 0),
)

let filterLoadTimer: number | undefined

const emit = defineEmits<{
  openPlace: [place: Place]
  saved: [message: string]
}>()

async function loadFilters() {
  const filters = await fetchPlaceFilters()
  categories.value = filters.categories
  regions.value = filters.regions
}

async function loadPlaces(nextPage = 0) {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await fetchPlaces({
      category: selectedCategory.value || undefined,
      regionId: selectedDistrictId.value ? Number(selectedDistrictId.value) : selectedProvinceId.value ? Number(selectedProvinceId.value) : undefined,
      keyword: keyword.value || undefined,
      page: nextPage,
      size: pageSize,
    })

    places.value = nextPage === 0 ? result.content : [...places.value, ...result.content]
    page.value = result.page
    totalElements.value = result.totalElements
    hasNext.value = result.hasNext
    selectedPlaceId.value = places.value[0]?.id ?? null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '여행지를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

function submitSearch() {
  keyword.value = keywordInput.value.trim()
  void loadPlaces(0)
}

function resetFilters() {
  selectedCategory.value = ''
  selectedProvinceId.value = ''
  selectedDistrictId.value = ''
  keywordInput.value = ''
  keyword.value = ''
  void loadPlaces(0)
}

function scheduleFilterReload() {
  if (filterLoadTimer) window.clearTimeout(filterLoadTimer)
  filterLoadTimer = window.setTimeout(() => {
    void loadPlaces(0)
  }, 0)
}

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

watch(selectedProvinceId, () => {
  selectedDistrictId.value = ''
  scheduleFilterReload()
})

watch([selectedCategory, selectedDistrictId], () => {
  scheduleFilterReload()
})

onMounted(async () => {
  try {
    await loadFilters()
  } catch {
    categories.value = []
    regions.value = []
  }
  await loadPlaces(0)
})
</script>

<template>
  <section class="app-container py-5 md:py-7">
    <div class="brand-card overflow-hidden rounded-xl">
      <div class="space-y-4 border-b border-slate-200 p-4">
        <form class="flex h-12 overflow-hidden rounded-full border-2 border-brand-500 bg-slate-50 shadow-md shadow-indigo-100 sm:h-14" @submit.prevent="submitSearch">
          <input
            v-model="keywordInput"
            class="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-700 outline-none sm:text-base"
            placeholder="어떤 장소를 찾으시나요? 예: 경복궁, 강릉 카페"
          />
          <button class="grid w-14 place-items-center bg-brand-500 text-white hover:bg-brand-600" aria-label="검색">
            <Search :size="23" />
          </button>
        </form>

        <div class="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div class="rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            <div class="flex flex-wrap gap-1">
            <button
              class="min-h-9 rounded-lg px-3 text-xs font-black transition sm:text-sm"
              :class="selectedCategory === '' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-brand-100' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'"
              @click="selectedCategory = ''"
            >
              전체
            </button>
            <button
              v-for="category in categories"
              :key="category.value"
              class="min-h-9 rounded-lg px-3 text-xs font-black transition sm:text-sm"
              :class="selectedCategory === category.value ? 'bg-white text-brand-600 shadow-sm ring-1 ring-brand-100' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'"
              @click="selectedCategory = category.value"
            >
              {{ category.label }}
            </button>
            </div>
          </div>

          <div class="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-[minmax(0,170px)_minmax(0,210px)_40px] sm:items-end">
            <label class="block">
              <span class="mb-1 block px-1 text-[11px] font-black text-slate-500">시/도</span>
              <span class="select-wrap select-wrap-full">
                <select
                  v-model="selectedProvinceId"
                  class="select-control h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-black text-slate-950 outline-none transition focus:border-brand-500 focus:bg-white sm:text-sm"
                  aria-label="시도 선택"
                >
                  <option value="">전체</option>
                  <option v-for="region in provinces" :key="region.regionId" :value="String(region.regionId)">
                    {{ region.regionName }}
                  </option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <label class="block">
              <span class="mb-1 block px-1 text-[11px] font-black text-slate-500">시/군/구</span>
              <span class="select-wrap select-wrap-full">
                <select
                  v-model="selectedDistrictId"
                  class="select-control h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-black text-slate-950 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:text-slate-400 sm:text-sm"
                  aria-label="시군구 선택"
                  :disabled="!selectedProvinceId"
                >
                  <option value="">{{ selectedProvinceId ? '전체' : '시/도 선택' }}</option>
                  <option v-for="region in districts" :key="region.regionId" :value="String(region.regionId)">
                    {{ region.regionName }}
                  </option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <button
              class="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-600 transition hover:bg-brand-100"
              aria-label="필터 초기화"
              title="필터 초기화"
              @click="resetFilters"
            >
              <RotateCcw :size="17" />
            </button>
          </div>
        </div>

        <p class="text-xs font-bold text-slate-500">
          총 {{ totalElements.toLocaleString() }}개 여행지
          <span v-if="keyword"> · "{{ keyword }}" 검색 결과</span>
        </p>
      </div>

      <div class="grid lg:h-[560px] xl:h-[620px] lg:grid-cols-[390px_1fr] 2xl:grid-cols-[440px_1fr]">
        <div class="max-h-[420px] space-y-3 overflow-y-auto border-b border-slate-200 p-4 lg:max-h-none lg:border-b-0 lg:border-r">
          <div v-if="isLoading && places.length === 0" class="grid h-64 place-items-center text-sm font-black text-slate-500">
            <span class="inline-flex items-center gap-2">
              <LoaderCircle :size="18" class="animate-spin" />
              여행지를 불러오는 중
            </span>
          </div>

          <div v-else-if="errorMessage" class="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {{ errorMessage }}
          </div>

          <div v-else-if="places.length === 0" class="rounded-xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
            조건에 맞는 여행지가 없습니다.
          </div>

          <article
            v-for="place in places"
            :key="place.id"
            class="brand-card grid cursor-pointer grid-cols-[76px_1fr_32px] gap-3 rounded-xl p-3 transition hover:border-brand-500"
            @mouseenter="selectedPlaceId = place.id"
            @click="emit('openPlace', place)"
          >
            <img :src="place.image" :alt="place.title" class="size-19 rounded-lg object-cover" />
            <div class="min-w-0">
              <h3 class="truncate text-base font-black text-slate-950">{{ place.title }}</h3>
              <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
                <Star :size="14" class="text-amber-500" fill="currentColor" />
                <span class="text-amber-500">{{ place.rating.toFixed(1) }}</span>
                <span>리뷰 {{ place.reviewCount }}</span>
                <span>· {{ place.category }}</span>
              </p>
              <p class="mt-1 truncate text-xs font-bold text-slate-500">{{ place.location }}</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span v-for="tag in place.tags.slice(0, 2)" :key="tag" class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
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

          <button
            v-if="hasNext"
            class="h-11 w-full rounded-xl bg-slate-100 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
            :disabled="isLoading"
            @click="loadPlaces(page + 1)"
          >
            {{ isLoading ? '불러오는 중' : '더보기' }}
          </button>
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
              <span class="mb-1.5 block text-xs font-black text-slate-950">방문 시간</span>
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
