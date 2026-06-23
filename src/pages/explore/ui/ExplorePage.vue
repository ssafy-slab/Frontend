<script setup lang="ts">
import {
  Bed,
  Bike,
  ChevronDown,
  Heart,
  HelpCircle,
  Landmark,
  LoaderCircle,
  MapPin,
  Palette,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { fetchPlaceFilters, fetchPlaces } from '@/entities/place/api/placeApi'
import type { PlaceCategory, RegionFilter } from '@/entities/place/api/placeApi'
import type { Place, Trip } from '@/entities/travel/model/travel'
import { createTripSchedule, fetchTripSchedules, updateTripSchedule } from '@/entities/travel/api/tripApi'
import type { TripSchedulePayload, TripScheduleResponse } from '@/entities/travel/api/tripApi'
import KakaoMap from '@/shared/ui/KakaoMap.vue'
import SafeImage from '@/shared/ui/SafeImage.vue'

const props = defineProps<{
  accessToken: string
  trips: Trip[]
}>()

const pageSize = 20
const selectedPlaceId = ref<number | null>(null)
const likedIds = ref(new Set<number>())
const selectedCategory = ref('')
const selectedProvinceId = ref('')
const selectedDistrictId = ref('')
const keywordInput = ref('')
const keyword = ref('')
const selectedSort = ref<'' | 'recommended' | 'reviewCount' | 'rating'>('')
const page = ref(0)
const places = ref<Place[]>([])
const categories = ref<PlaceCategory[]>([])
const regions = ref<RegionFilter[]>([])
const totalElements = ref(0)
const hasNext = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const showAddModal = ref(false)
const isAddingToTrip = ref(false)
const replaceCandidate = ref<TripScheduleResponse | null>(null)
const addTarget = ref<Place | null>(null)
const listScroller = ref<HTMLElement | null>(null)
const loadMoreTarget = ref<HTMLElement | null>(null)
const listSheet = ref<HTMLElement | null>(null)
const isListSheetExpanded = ref(true)
const isDraggingListSheet = ref(false)
const didDragListSheet = ref(false)
const listSheetDragStartY = ref(0)
const listSheetDragDeltaY = ref(0)
const addDraft = reactive({
  tripId: '',
  date: '',
  time: '13:00',
  endTime: '14:00',
  memo: '',
})

const selectedPlace = computed(() => places.value.find((place) => place.id === selectedPlaceId.value) ?? null)
const focusedPlace = computed(() => places.value.find((place) => place.id === selectedPlaceId.value) ?? null)
const mapMarkers = computed(() =>
  (focusedPlace.value ? [focusedPlace.value] : places.value).map((place) => ({
    id: place.id,
    title: place.title,
    position: place.coordinates,
  })),
)
const mapCenter = computed(() => focusedPlace.value?.coordinates ?? places.value[0]?.coordinates ?? { lat: 37.5665, lng: 126.978 })
const mapLevel = computed(() => (focusedPlace.value ? 4 : 8))
const provinces = computed(() => regions.value.filter((region) => region.regionLevel === 1 && region.placeCount > 0))
const districts = computed(() =>
  regions.value.filter((region) => region.regionLevel === 2 && String(region.parentRegionId ?? '') === selectedProvinceId.value && region.placeCount > 0),
)
const sortOptions = [
  { value: 'recommended' as const, label: '추천순' },
  { value: 'reviewCount' as const, label: '리뷰 많은 순' },
  { value: 'rating' as const, label: '평점 높은 순' },
]
const upcomingTrips = computed(() => props.trips.filter((trip) => trip.phase === 'upcoming'))
const listSheetDragStyle = computed(() => {
  if (!isDraggingListSheet.value || !listSheet.value) return undefined

  const collapsedOffset = getCollapsedListSheetOffset()
  const baseOffset = isListSheetExpanded.value ? 0 : collapsedOffset
  const nextOffset = Math.min(Math.max(baseOffset + listSheetDragDeltaY.value, 0), collapsedOffset)
  return {
    transform: `translateY(${nextOffset}px)`,
    transition: 'none',
  }
})

function getCategoryIcon(category: Pick<PlaceCategory, 'label' | 'value'>) {
  const text = `${category.label} ${category.value}`
  if (text.includes('음식')) return Utensils
  if (text.includes('관광')) return Landmark
  if (text.includes('쇼핑')) return ShoppingBag
  if (text.includes('레저') || text.includes('스포츠')) return Bike
  if (text.includes('숙박')) return Bed
  if (text.includes('문화')) return Palette
  return Sparkles
}

let filterLoadTimer: number | undefined
let loadMoreObserver: IntersectionObserver | undefined

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
  if (isLoading.value || (nextPage > 0 && !hasNext.value)) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await fetchPlaces({
      category: selectedCategory.value || undefined,
      regionId: selectedDistrictId.value ? Number(selectedDistrictId.value) : selectedProvinceId.value ? Number(selectedProvinceId.value) : undefined,
      keyword: keyword.value || undefined,
      searchMode: 'tokenized',
      sort: selectedSort.value || undefined,
      page: nextPage,
      size: pageSize,
    })

    places.value = nextPage === 0 ? result.content : [...places.value, ...result.content]
    page.value = result.page
    totalElements.value = result.totalElements
    hasNext.value = result.hasNext
    if (nextPage === 0) selectedPlaceId.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '여행지를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

function setupLoadMoreObserver() {
  loadMoreObserver?.disconnect()
  if (!loadMoreTarget.value) return

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadPlaces(page.value + 1)
      }
    },
    {
      rootMargin: '160px 0px',
    },
  )
  loadMoreObserver.observe(loadMoreTarget.value)
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
  selectedSort.value = ''
  void loadPlaces(0)
}

function toggleSort(sort: 'recommended' | 'reviewCount' | 'rating') {
  selectedSort.value = selectedSort.value === sort ? '' : sort
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
  addDraft.tripId ||= String(upcomingTrips.value[0]?.id ?? '')
  const trip = upcomingTrips.value.find((item) => String(item.id) === addDraft.tripId)
  addDraft.date = trip ? getScheduleDate(trip) : new Date().toISOString().slice(0, 10)
  showAddModal.value = true
}

function selectPlaceOnMap(place: Place) {
  selectedPlaceId.value = place.id
}

function showAllPlacesOnMap() {
  selectedPlaceId.value = null
}

function toggleListSheet() {
  isListSheetExpanded.value = !isListSheetExpanded.value
}

function handleListSheetHandleClick() {
  if (didDragListSheet.value) {
    didDragListSheet.value = false
    return
  }
  toggleListSheet()
}

function getCollapsedListSheetOffset() {
  return Math.max((listSheet.value?.offsetHeight ?? 0) - 56, 0)
}

function startListSheetDrag(event: PointerEvent) {
  if (window.innerWidth >= 768) return

  isDraggingListSheet.value = true
  didDragListSheet.value = false
  listSheetDragStartY.value = event.clientY
  listSheetDragDeltaY.value = 0
  window.addEventListener('pointermove', dragListSheet)
  window.addEventListener('pointerup', endListSheetDrag)
  window.addEventListener('pointercancel', endListSheetDrag)
}

function dragListSheet(event: PointerEvent) {
  if (!isDraggingListSheet.value) return
  listSheetDragDeltaY.value = event.clientY - listSheetDragStartY.value
  if (Math.abs(listSheetDragDeltaY.value) > 8) didDragListSheet.value = true
}

function endListSheetDrag() {
  if (!isDraggingListSheet.value) return

  const threshold = 72
  if (isListSheetExpanded.value && listSheetDragDeltaY.value > threshold) {
    isListSheetExpanded.value = false
  } else if (!isListSheetExpanded.value && listSheetDragDeltaY.value < -threshold) {
    isListSheetExpanded.value = true
  }

  isDraggingListSheet.value = false
  listSheetDragDeltaY.value = 0
  window.removeEventListener('pointermove', dragListSheet)
  window.removeEventListener('pointerup', endListSheetDrag)
  window.removeEventListener('pointercancel', endListSheetDrag)
}

function toApiTime(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

function toTimeInput(time: string | null | undefined) {
  return time ? time.slice(0, 5) : ''
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 59)
  const hours = Math.floor(clampedMinutes / 60)
  const minutes = clampedMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function ensureValidAddEndTime() {
  if (!addDraft.time) return
  if (!addDraft.endTime || timeToMinutes(addDraft.endTime) <= timeToMinutes(addDraft.time)) {
    addDraft.endTime = minutesToTime(timeToMinutes(addDraft.time) + 60)
  }
}

function getScheduleDate(trip: Trip) {
  return trip.startDate ?? new Date().toISOString().slice(0, 10)
}

function getSelectedScheduleDate(trip: Trip) {
  return addDraft.date || getScheduleDate(trip)
}

function getScheduleDayNo(trip: Trip, scheduleDate: string) {
  if (!trip.startDate) return 1
  const start = new Date(`${trip.startDate}T00:00:00`)
  const target = new Date(`${scheduleDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return 1
  return Math.max(1, Math.floor((target.getTime() - start.getTime()) / 86_400_000) + 1)
}

function buildPlaceSchedulePayload(trip: Trip, schedules: TripScheduleResponse[], existing?: TripScheduleResponse): TripSchedulePayload {
  const scheduleDate = existing?.scheduleDate ?? getSelectedScheduleDate(trip)
  const sameDateItems = schedules.filter((item) => item.scheduleDate === scheduleDate)

  return {
    placeId: addTarget.value?.id ?? null,
    scheduleDate,
    startTime: existing?.startTime ?? toApiTime(addDraft.time),
    endTime: existing?.endTime ?? toApiTime(addDraft.endTime),
    title: addTarget.value?.title ?? '',
    memo: addDraft.memo.trim() || null,
    dayNo: existing?.dayNo ?? getScheduleDayNo(trip, scheduleDate),
    sortOrder: existing?.sortOrder ?? sameDateItems.length + 1,
  }
}

async function addToTrip(forceReplace = false) {
  if (!addTarget.value) return
  if (!props.accessToken) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  const trip = upcomingTrips.value.find((item) => String(item.id) === addDraft.tripId)
  if (!trip) {
    emit('saved', '장소를 추가할 일정을 선택해주세요.')
    return
  }

  ensureValidAddEndTime()
  isAddingToTrip.value = true
  try {
    const schedules = await fetchTripSchedules(props.accessToken, trip.id)
    const scheduleDate = getSelectedScheduleDate(trip)
    const conflict = replaceCandidate.value ?? schedules.find((item) => item.scheduleDate === scheduleDate && toTimeInput(item.startTime) === addDraft.time) ?? null

    if (conflict && !forceReplace) {
      replaceCandidate.value = conflict
      return
    }

    const payload = buildPlaceSchedulePayload(trip, schedules, conflict ?? undefined)
    if (conflict) await updateTripSchedule(props.accessToken, trip.id, conflict.scheduleItemId, payload)
    else await createTripSchedule(props.accessToken, trip.id, payload)

    showAddModal.value = false
    replaceCandidate.value = null
    emit('saved', `${addTarget.value.title}을(를) ${trip.title} ${addDraft.time}에 추가했습니다.`)
    addDraft.memo = ''
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정에 장소를 추가하지 못했습니다.')
  } finally {
    isAddingToTrip.value = false
  }
}

function closeAddModal() {
  showAddModal.value = false
  replaceCandidate.value = null
}

watch(upcomingTrips, (nextTrips) => {
  if (!addDraft.tripId && nextTrips[0]) {
    addDraft.tripId = String(nextTrips[0].id)
    addDraft.date = getScheduleDate(nextTrips[0])
  }
}, { immediate: true })

watch(() => addDraft.tripId, () => {
  const trip = upcomingTrips.value.find((item) => String(item.id) === addDraft.tripId)
  addDraft.date = trip ? getScheduleDate(trip) : ''
  replaceCandidate.value = null
})

watch(() => [addDraft.date, addDraft.time], () => {
  ensureValidAddEndTime()
  replaceCandidate.value = null
})

watch(selectedProvinceId, () => {
  selectedDistrictId.value = ''
  scheduleFilterReload()
})

watch([selectedCategory, selectedDistrictId], () => {
  scheduleFilterReload()
})

watch(selectedSort, () => {
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
  await nextTick()
  setupLoadMoreObserver()
})

onBeforeUnmount(() => {
  if (filterLoadTimer) window.clearTimeout(filterLoadTimer)
  loadMoreObserver?.disconnect()
  window.removeEventListener('pointermove', dragListSheet)
  window.removeEventListener('pointerup', endListSheetDrag)
  window.removeEventListener('pointercancel', endListSheetDrag)
})
</script>

<template>
  <section class="min-h-[calc(100vh-56px)] bg-slate-50 md:h-[calc(100vh-64px)] md:overflow-hidden">
    <div class="grid min-h-[calc(100vh-56px)] bg-white shadow-sm md:h-full md:min-h-0 md:grid-cols-[340px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside
        ref="listSheet"
        class="fixed inset-x-0 bottom-[72px] z-40 flex max-h-[76vh] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-transform duration-300 md:static md:order-1 md:max-h-none md:translate-y-0 md:rounded-none md:border-r md:border-t-0 md:shadow-none"
        :class="isListSheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-56px)] md:translate-y-0'"
        :style="listSheetDragStyle"
      >
        <button
          class="grid min-h-10 touch-none place-items-center border-b border-slate-100 bg-white md:hidden"
          :aria-label="isListSheetExpanded ? '여행지 목록 접기' : '여행지 목록 펼치기'"
          @click="handleListSheetHandleClick"
          @pointerdown="startListSheetDrag"
        >
          <span class="h-1.5 w-12 rounded-full bg-slate-300"></span>
        </button>
        <div class="space-y-3 border-b border-slate-200 bg-white p-4">
        <form class="flex h-10 overflow-hidden rounded-xl border-2 border-brand-500 bg-slate-50 shadow-sm shadow-indigo-100" @submit.prevent="submitSearch">
          <input
            v-model="keywordInput"
            class="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none"
            placeholder="어떤 장소를 찾으시나요? 예: 경복궁, 강릉 카페"
          />
          <button class="grid w-11 place-items-center bg-brand-500 text-white hover:bg-brand-600" aria-label="검색">
            <Search :size="19" />
          </button>
        </form>

        <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-2">
          <label class="block">
            <span class="mb-1 block px-1 text-[11px] font-black text-slate-500">시/도</span>
            <span class="select-wrap select-wrap-full">
              <select
                v-model="selectedProvinceId"
                class="select-control h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-black text-slate-950 outline-none transition focus:border-brand-500 focus:bg-white"
                aria-label="시도 선택"
              >
                <option value="">전체</option>
                <option v-for="region in provinces" :key="region.regionId" :value="String(region.regionId)">
                  {{ region.regionName }}
                </option>
              </select>
              <ChevronDown :size="14" class="select-chevron" />
            </span>
          </label>
          <label class="block">
            <span class="mb-1 block px-1 text-[11px] font-black text-slate-500">시/군/구</span>
            <span class="select-wrap select-wrap-full">
              <select
                v-model="selectedDistrictId"
                class="select-control h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-black text-slate-950 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
                aria-label="시군구 선택"
                :disabled="!selectedProvinceId"
              >
                <option value="">{{ selectedProvinceId ? '전체' : '시/도 선택' }}</option>
                <option v-for="region in districts" :key="region.regionId" :value="String(region.regionId)">
                  {{ region.regionName }}
                </option>
              </select>
              <ChevronDown :size="14" class="select-chevron" />
            </span>
          </label>
          <button
            class="grid size-9 place-items-center rounded-md bg-brand-50 text-brand-600 transition hover:bg-brand-100"
            aria-label="필터 초기화"
            title="필터 초기화"
            @click="resetFilters"
          >
            <RotateCcw :size="16" />
          </button>
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="inline-flex items-center gap-1 font-bold transition"
              style="font-size: 12px; line-height: 16px"
              :class="selectedSort === option.value ? 'text-brand-500' : 'text-slate-500 hover:text-slate-800'"
              :aria-pressed="selectedSort === option.value"
              @click="toggleSort(option.value)"
            >
              <span
                class="size-1 rounded-full transition"
                :class="selectedSort === option.value ? 'bg-brand-500' : 'bg-slate-300'"
              />
              {{ option.label }}
            </button>
          </div>
          <span
            class="group relative grid size-5 shrink-0 cursor-help place-items-center text-slate-400"
            tabindex="0"
            aria-label="정렬 기준 안내"
          >
            <HelpCircle :size="13" />
            <span class="pointer-events-none absolute right-0 top-7 z-30 hidden w-52 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-semibold leading-4 text-white shadow-lg group-hover:block group-focus:block">
              추천순은 평균 별점과 리뷰 수를 함께 반영합니다.
            </span>
          </span>
        </div>
        <p v-if="keyword" class="text-xs font-bold text-slate-500">"{{ keyword }}" 검색 결과</p>
      </div>

        <div ref="listScroller" class="min-h-0 flex-1 overflow-y-auto border-b border-slate-200 md:border-b-0">
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
            class="group cursor-pointer border-b border-slate-100 bg-white p-4 transition hover:bg-slate-50"
            :class="selectedPlaceId === place.id ? 'bg-brand-50/70 ring-1 ring-inset ring-brand-200' : ''"
            @click="selectPlaceOnMap(place)"
          >
            <div class="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">
              <SafeImage :src="place.thumbnailImage || place.image" :alt="place.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>

            <div class="mt-3 min-w-0">
              <div class="flex min-w-0 items-start gap-3">
                <h3 class="min-w-0 flex-1 truncate text-lg font-black text-slate-950">{{ place.title }}</h3>
                <button
                  class="grid size-9 shrink-0 place-items-center text-slate-300 transition hover:text-red-400"
                  :class="likedIds.has(place.id) ? 'text-red-500' : ''"
                  aria-label="좋아요"
                  @click.stop="toggleLike(place)"
                >
                  <Heart :size="22" :fill="likedIds.has(place.id) ? 'currentColor' : 'none'" />
                </button>
              </div>
              <p class="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-500">
                <MapPin :size="14" class="shrink-0 text-brand-500" />
                <span class="truncate">{{ place.location }}</span>
              </p>
              <p class="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">{{ place.description }}</p>
              <div class="mt-3 flex items-center justify-between gap-2">
                <span v-if="Number(place.reviewCount) > 0" class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Star :size="13" class="text-amber-400" fill="currentColor" />
                  <span class="font-black text-slate-700">{{ place.rating.toFixed(1) }}</span>
                  <span>· 리뷰 {{ place.reviewCount }}</span>
                </span>
                <span v-else class="text-[11px] font-bold text-slate-400">리뷰 없음</span>
              </div>
            </div>
          </article>

          <div ref="loadMoreTarget" class="grid min-h-14 place-items-center text-xs font-black text-slate-400">
            <span v-if="isLoading && places.length > 0" class="inline-flex items-center gap-2">
              <LoaderCircle :size="15" class="animate-spin" />
              더 불러오는 중
            </span>
            <span v-else-if="hasNext">스크롤하면 더 불러옵니다</span>
          </div>
        </div>
      </aside>

        <div class="relative h-[calc(100vh-128px)] overflow-hidden bg-[#f5f1e8] sm:h-[calc(100vh-132px)] md:order-2 md:h-full">
          <div class="absolute left-3 right-3 top-3 z-20 flex flex-col gap-2 md:left-4 md:right-auto md:max-w-[calc(100%-2rem)]">
            <div class="flex max-w-full gap-2 overflow-x-auto pb-1">
              <button
                v-for="category in categories"
                :key="category.value"
                class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-black shadow-md ring-1 transition"
                :class="selectedCategory === category.value ? 'bg-brand-500 text-white ring-brand-500 hover:bg-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:text-brand-600'"
                @click="selectedCategory = selectedCategory === category.value ? '' : category.value"
              >
                <component :is="getCategoryIcon(category)" :size="16" />
                {{ category.label }}
              </button>
            </div>

          </div>

          <button
            v-if="focusedPlace"
            class="absolute left-4 top-16 z-20 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/95 px-3.5 py-2 text-xs font-black text-brand-600 shadow-md shadow-indigo-100/70 backdrop-blur transition hover:border-brand-300 hover:bg-white"
            @click="showAllPlacesOnMap"
          >
            <MapPin :size="14" />
            전체 핀 보기
          </button>

          <KakaoMap
            class="absolute inset-0"
            :center="mapCenter"
            :markers="mapMarkers"
            :selected-marker-id="selectedPlaceId"
            :level="mapLevel"
            @marker-click="selectedPlaceId = Number($event.id)"
          />

          <section
            v-if="selectedPlace"
            class="absolute left-4 right-4 top-28 z-10 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur sm:right-auto sm:w-[340px]"
          >
            <div class="relative aspect-[16/9] bg-slate-100">
              <SafeImage :src="selectedPlace.thumbnailImage || selectedPlace.image" :alt="selectedPlace.title" class="h-full w-full object-cover" />
              <button
                class="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/95 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white"
                aria-label="선택 해제"
                @click="selectedPlaceId = null"
              >
                <X :size="18" />
              </button>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-black text-brand-600">{{ selectedPlace.category }}</span>
                <span v-if="Number(selectedPlace.reviewCount) > 0" class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Star :size="13" class="text-amber-400" fill="currentColor" />
                  <span class="font-black text-slate-700">{{ selectedPlace.rating.toFixed(1) }}</span>
                  <span>· 리뷰 {{ selectedPlace.reviewCount }}</span>
                </span>
                <span v-else class="text-[11px] font-bold text-slate-400">리뷰 없음</span>
              </div>
              <h3 class="mt-2 truncate text-lg font-black text-slate-950">{{ selectedPlace.title }}</h3>
              <p class="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-500">
                <MapPin :size="14" class="shrink-0 text-brand-500" />
                <span class="truncate">{{ selectedPlace.location }}</span>
              </p>
              <p class="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">{{ selectedPlace.description }}</p>
              <div class="mt-4 flex gap-2">
                <button class="h-9 flex-1 rounded-lg bg-brand-500 text-xs font-black text-white transition hover:bg-brand-600" @click="emit('openPlace', selectedPlace)">
                  상세 보기
                </button>
                <button
                  :data-testid="`open-add-place-${selectedPlace.id}`"
                  class="h-9 rounded-lg bg-brand-100 px-4 text-[11px] font-black text-brand-600 transition hover:bg-brand-200"
                  @click="openAddModal(selectedPlace)"
                >
                  일정
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

    <Transition name="modal-fade">
      <div v-if="showAddModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">일정에 장소 추가</h2>
            <button class="text-slate-500" aria-label="닫기" @click="closeAddModal">
              <X :size="22" />
            </button>
          </div>
          <p class="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">{{ addTarget?.title }}</p>
          <div class="space-y-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">추가할 일정</span>
              <span class="select-wrap select-wrap-full">
                <select v-model="addDraft.tripId" class="brand-input select-control h-10 w-full rounded-lg px-3 text-sm outline-none" :disabled="!upcomingTrips.length">
                  <option v-for="trip in upcomingTrips" :key="trip.id" :value="String(trip.id)">
                    {{ trip.title }}
                  </option>
                </select>
                <ChevronDown :size="15" class="select-chevron" />
              </span>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">방문 날짜 / 시간</span>
              <input
                v-model="addDraft.date"
                data-testid="add-place-date"
                type="date"
                class="brand-input mb-3 h-10 w-full rounded-lg px-3 text-sm outline-none"
                :min="upcomingTrips.find((trip) => String(trip.id) === addDraft.tripId)?.startDate ?? undefined"
                :max="upcomingTrips.find((trip) => String(trip.id) === addDraft.tripId)?.endDate ?? undefined"
              />
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  v-model="addDraft.time"
                  data-testid="add-place-start-time"
                  type="time"
                  class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none"
                  aria-label="시작 시간"
                />
                <input
                  v-model="addDraft.endTime"
                  data-testid="add-place-end-time"
                  type="time"
                  class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none"
                  aria-label="종료 시간"
                  :min="addDraft.time"
                  @change="ensureValidAddEndTime"
                />
              </div>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="addDraft.memo" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 점심 식사 후보" />
            </label>
          </div>
          <p v-if="!upcomingTrips.length" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            장소를 추가할 예정 일정이 없습니다.
          </p>
          <button data-testid="confirm-add-place" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-50" :disabled="isAddingToTrip || !upcomingTrips.length" @click="addToTrip()">
            {{ isAddingToTrip ? '추가 중...' : '선택한 일정에 추가' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="replaceCandidate" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="replace-place-modal" class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-brand-500">Schedule change</p>
              <h2 class="mt-1 text-lg font-black text-slate-950">여행지를 변경하시겠습니까?</h2>
              <p class="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {{ addDraft.time }}에 이미 등록된 일정이 있습니다. 기존 여행지를 새 여행지로 변경할 수 있습니다.
              </p>
            </div>
            <button class="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500" aria-label="닫기" @click="replaceCandidate = null">
              <X :size="18" />
            </button>
          </div>

          <div class="mt-5 space-y-3">
            <div data-testid="replace-ticket-current" class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <span class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
              <span class="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current itinerary</p>
                  <p class="mt-1 truncate text-base font-black text-slate-950">{{ replaceCandidate.title }}</p>
                </div>
                <span class="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-white">{{ addDraft.time }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 px-3 text-brand-400" aria-hidden="true">
              <span class="h-px flex-1 border-t border-dashed border-brand-200" />
              <span class="grid size-7 place-items-center rounded-full bg-brand-50 text-sm font-black">↓</span>
              <span class="h-px flex-1 border-t border-dashed border-brand-200" />
            </div>

            <div data-testid="replace-ticket-new" class="relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 shadow-sm shadow-indigo-100">
              <span class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-brand-200 bg-white" />
              <span class="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-brand-200 bg-white" />
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-brand-500">New destination</p>
                  <p class="mt-1 truncate text-base font-black text-slate-950">{{ addTarget?.title }}</p>
                </div>
                <span class="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-black text-white">{{ addDraft.time }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <button data-testid="keep-existing-schedule" class="h-10 rounded-lg bg-slate-100 text-sm font-black text-slate-700 hover:bg-slate-200" @click="replaceCandidate = null">
              기존 일정 유지
            </button>
            <button data-testid="confirm-replace-place" class="h-10 rounded-lg bg-brand-500 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isAddingToTrip" @click="addToTrip(true)">
              여행지 변경
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
