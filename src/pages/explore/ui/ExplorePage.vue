<script setup lang="ts">
import {
  Bed,
  Bike,
  CalendarPlus,
  ChevronDown,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Fuel,
  Heart,
  HelpCircle,
  Landmark,
  LoaderCircle,
  MapPin,
  Palette,
  Pill,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Sun,
  Utensils,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { fetchPlaceFilters, fetchPlaceNearbyFacilities, fetchPlaces, fetchPlaceWeather, likePlace, resolvePlaceDisplayImage, unlikePlace } from '@/entities/place/api/placeApi'
import type { NearbyFacilitiesResponse, NearbyFacilityType, PlaceCategory, PlaceWeather, RegionFilter } from '@/entities/place/api/placeApi'
import { createPlaceReview, deleteMyPlaceReview, fetchPlaceReviews, updateMyPlaceReview } from '@/entities/review/api/reviewApi'
import type { PlaceReview, PlaceReviewSummary } from '@/entities/review/api/reviewApi'
import type { Place, Trip } from '@/entities/travel/model/travel'
import { createTripSchedule, fetchTripSchedules, updateTripSchedule } from '@/entities/travel/api/tripApi'
import type { TripSchedulePayload, TripScheduleResponse } from '@/entities/travel/api/tripApi'
import KakaoMap from '@/shared/ui/KakaoMap.vue'
import SafeImage from '@/shared/ui/SafeImage.vue'

const props = defineProps<{
  accessToken: string
  trips: Trip[]
  targetPlace?: Place | null
  initialKeyword?: string
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
const weather = ref<PlaceWeather | null>(null)
const nearbyFacilities = ref<NearbyFacilitiesResponse | null>(null)
const reviews = ref<PlaceReview[]>([])
const myReview = ref<PlaceReview | null>(null)
const reviewText = ref('')
const reviewRating = ref(0)
const weatherLoading = ref(false)
const weatherFailed = ref(false)
const facilitiesLoading = ref(false)
const reviewsLoading = ref(false)
const reviewSaving = ref(false)
const detailMessage = ref('')
const showReviewModal = ref(false)
const reviewPage = ref(0)
const reviewPageSize = 3
const isDesktopViewport = ref(window.innerWidth >= 768)
const listScroller = ref<HTMLElement | null>(null)
const loadMoreTarget = ref<HTMLElement | null>(null)
const listSheet = ref<HTMLElement | null>(null)
type ListSheetPosition = 'expanded' | 'middle' | 'collapsed'
const SHEET_COLLAPSED_VISIBLE_HEIGHT = 56
const MOBILE_SELECTED_PLACE_CENTER_LAT_OFFSET = 0.0018
const listSheetPosition = ref<ListSheetPosition>('middle')
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

const selectedPlace = computed(() =>
  places.value.find((place) => place.id === selectedPlaceId.value)
  ?? (props.targetPlace?.id === selectedPlaceId.value ? props.targetPlace : null),
)
const focusedPlace = computed(() => selectedPlace.value)
const mapMarkers = computed(() =>
  places.value.map((place) => ({
    id: place.id,
    title: place.title,
    position: place.coordinates,
    category: place.category,
  })),
)
const mapCenter = computed(() => {
  if (focusedPlace.value) {
    const center = focusedPlace.value.coordinates
    if (!isDesktopViewport.value) {
      return {
        ...center,
        lat: center.lat - MOBILE_SELECTED_PLACE_CENTER_LAT_OFFSET,
      }
    }
    return center
  }
  return places.value[0]?.coordinates ?? { lat: 37.5665, lng: 126.978 }
})
const mapLevel = computed(() => {
  if (focusedPlace.value) return isDesktopViewport.value ? 4 : 3
  return 4
})
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
const nearbyFacilityTypes: { type: NearbyFacilityType; label: string; icon: typeof Fuel }[] = [
  { type: 'GAS_STATION', label: '주유소', icon: Fuel },
  { type: 'PHARMACY', label: '약국', icon: Pill },
  { type: 'CONVENIENCE_STORE', label: '편의점', icon: Store },
]
const nearbyFacilityItems = computed(() => nearbyFacilityTypes.map((item) => {
  const facilities = nearbyFacilities.value?.groups.find((group) => group.facilityType === item.type)?.facilities ?? []
  const nearest = [...facilities].sort((left, right) => Number(left.distanceM ?? Infinity) - Number(right.distanceM ?? Infinity))[0] ?? null
  return { ...item, nearest }
}))
const reviewPageCount = computed(() => Math.max(1, Math.ceil(reviews.value.length / reviewPageSize)))
const paginatedReviews = computed(() => reviews.value.slice(reviewPage.value * reviewPageSize, (reviewPage.value + 1) * reviewPageSize))
const futureWeatherForecasts = computed(() =>
  (weather.value?.dailyForecasts ?? [])
    .filter((forecast) => !['오늘', 'TODAY'].includes(String(forecast.dayLabel ?? '').toUpperCase()))
    .slice(0, 3),
)
const todayWeatherDate = computed(() => {
  const todayForecast = weather.value?.dailyForecasts?.find((forecast) =>
    ['오늘', 'TODAY'].includes(String(forecast.dayLabel ?? '').toUpperCase()),
  )
  const date = todayForecast?.forecastDate ? new Date(`${todayForecast.forecastDate}T00:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) return '오늘'
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `오늘 · ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`
})

function hasPlaceImage(place: Place) {
  const candidates = [place.detailImage, place.thumbnailImage, place.image]
  return candidates.some((image) => Boolean(image && !image.endsWith('/images/default-place.svg') && image !== '/images/default-place.svg'))
}

function placeImage(place: Place, detail = false) {
  return resolvePlaceDisplayImage(place, detail)
}
const listSheetDragStyle = computed(() => {
  if (!listSheet.value) return undefined

  const offsets = getListSheetOffsets()
  const baseOffset = offsets[listSheetPosition.value]
  const nextOffset = isDraggingListSheet.value
    ? Math.min(Math.max(baseOffset + listSheetDragDeltaY.value, 0), offsets.collapsed)
    : baseOffset
  return {
    transform: `translateY(${nextOffset}px)`,
    transition: isDraggingListSheet.value ? 'none' : undefined,
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
  closePlace: []
  saved: [message: string]
  consumedInitialKeyword: []
}>()

function consumeInitialKeyword() {
  const nextKeyword = props.initialKeyword?.trim()
  if (!nextKeyword) return false
  keywordInput.value = nextKeyword
  keyword.value = nextKeyword
  selectedPlaceId.value = null
  emit('consumedInitialKeyword')
  return true
}

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
    }, props.accessToken || undefined)

    places.value = nextPage === 0 ? result.content : [...places.value, ...result.content]
    likedIds.value = new Set(places.value.filter((place) => place.liked).map((place) => place.id))
    page.value = result.page
    totalElements.value = result.totalElements
    hasNext.value = result.hasNext
    if (nextPage === 0) selectedPlaceId.value = props.targetPlace?.id ?? null
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

async function toggleLike(place: Place) {
  if (!props.accessToken) {
    emit('saved', '로그인 후 좋아요를 누를 수 있습니다.')
    return
  }
  const next = new Set(likedIds.value)
  const wasLiked = next.has(place.id)
  if (wasLiked) next.delete(place.id)
  else next.add(place.id)
  likedIds.value = next
  try {
    if (wasLiked) await unlikePlace(place.id, props.accessToken)
    else await likePlace(place.id, props.accessToken)
  } catch (error) {
    const rollback = new Set(likedIds.value)
    if (wasLiked) rollback.add(place.id)
    else rollback.delete(place.id)
    likedIds.value = rollback
    emit('saved', error instanceof Error ? error.message : '여행지 좋아요 처리에 실패했습니다.')
  }
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

function closePlaceOverlay() {
  selectedPlaceId.value = null
  emit('closePlace')
}

function formatTemperature(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}°C` : '-'
}

function formatForecastTemperature(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}°` : '-'
}

function formatDistance(value: number | string | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${Math.round(parsed)}m` : ''
}

function weatherLabel(sky: string | number | null, precipitation: string | number | null) {
  const precipitationCode = String(precipitation ?? '').toUpperCase()
  if (precipitationCode && !['0', 'NONE', 'PTY_0'].includes(precipitationCode)) {
    if (precipitationCode.includes('SNOW') || precipitationCode === '3') return '눈'
    return '비'
  }
  const skyCode = String(sky ?? '').toUpperCase()
  if (['1', 'CLEAR', 'SUNNY', 'SKY_1'].includes(skyCode)) return '맑음'
  if (['3', 'MOSTLY_CLOUDY', 'PARTLY_CLOUDY', 'SKY_3'].includes(skyCode)) return '구름많음'
  return '흐림'
}

function weatherIcon(sky: string | number | null, precipitation: string | number | null) {
  const label = weatherLabel(sky, precipitation)
  if (label === '눈') return CloudSnow
  if (label === '비') return CloudRain
  if (label === '맑음') return Sun
  if (label === '구름많음') return CloudSun
  return Cloud
}

function applyReviewSummary(summary: PlaceReviewSummary) {
  reviews.value = summary.reviews
  myReview.value = summary.myReview
  reviewRating.value = summary.myReview?.rating ?? 0
  reviewText.value = summary.myReview?.content ?? ''
  if (selectedPlace.value) {
    selectedPlace.value.rating = Number(summary.averageRating)
    selectedPlace.value.reviewCount = String(summary.reviewCount)
  }
  reviewPage.value = 0
}

let detailRequestId = 0
async function loadWeather(placeId: number, requestId = detailRequestId) {
  weatherLoading.value = true
  weatherFailed.value = false
  weather.value = null

  try {
    const result = await fetchPlaceWeather(placeId)
    if (requestId !== detailRequestId) return
    weather.value = result
    weatherFailed.value = !result.available
  } catch {
    if (requestId !== detailRequestId) return
    weatherFailed.value = true
  } finally {
    if (requestId === detailRequestId) weatherLoading.value = false
  }
}

function retryWeather() {
  if (!selectedPlace.value || weatherLoading.value) return
  void loadWeather(selectedPlace.value.id)
}

async function loadPlaceDetails(placeId: number) {
  const requestId = ++detailRequestId
  facilitiesLoading.value = true
  reviewsLoading.value = true
  detailMessage.value = ''
  weather.value = null
  weatherFailed.value = false
  nearbyFacilities.value = null
  reviews.value = []
  reviewPage.value = 0
  myReview.value = null
  reviewText.value = ''
  reviewRating.value = 0

  void loadWeather(placeId, requestId)

  void fetchPlaceNearbyFacilities(placeId, { limit: 10, types: nearbyFacilityTypes.map((item) => item.type) })
    .then((result) => {
      if (requestId === detailRequestId) nearbyFacilities.value = result
    })
    .catch(() => undefined)
    .finally(() => {
      if (requestId === detailRequestId) facilitiesLoading.value = false
    })

  void fetchPlaceReviews(placeId, props.accessToken || undefined)
    .then((result) => {
      if (requestId === detailRequestId) applyReviewSummary(result)
    })
    .catch((error) => {
      if (requestId === detailRequestId) detailMessage.value = error instanceof Error ? error.message : '리뷰를 불러오지 못했습니다.'
    })
    .finally(() => {
      if (requestId === detailRequestId) reviewsLoading.value = false
    })
}

async function savePlaceReview() {
  if (!selectedPlace.value) return
  if (!props.accessToken) {
    emit('saved', '리뷰를 작성하려면 로그인이 필요합니다.')
    return
  }
  if (!reviewRating.value) {
    detailMessage.value = '별점을 선택해주세요.'
    return
  }
  reviewSaving.value = true
  detailMessage.value = ''
  try {
    const editing = Boolean(myReview.value)
    const payload = { rating: reviewRating.value, content: reviewText.value.trim() }
    const summary = editing
      ? await updateMyPlaceReview(selectedPlace.value.id, props.accessToken, payload)
      : await createPlaceReview(selectedPlace.value.id, props.accessToken, payload)
    applyReviewSummary(summary)
    showReviewModal.value = false
    emit('saved', editing ? '리뷰가 저장되었습니다.' : '리뷰가 등록되었습니다.')
  } catch (error) {
    detailMessage.value = error instanceof Error ? error.message : '리뷰를 저장하지 못했습니다.'
  } finally {
    reviewSaving.value = false
  }
}

async function deletePlaceReview() {
  if (!selectedPlace.value || !props.accessToken || !myReview.value) return
  reviewSaving.value = true
  try {
    applyReviewSummary(await deleteMyPlaceReview(selectedPlace.value.id, props.accessToken))
    showReviewModal.value = false
    emit('saved', '리뷰가 삭제되었습니다.')
  } catch (error) {
    detailMessage.value = error instanceof Error ? error.message : '리뷰를 삭제하지 못했습니다.'
  } finally {
    reviewSaving.value = false
  }
}

function toggleListSheet() {
  const next: Record<ListSheetPosition, ListSheetPosition> = {
    collapsed: 'middle',
    middle: 'expanded',
    expanded: 'collapsed',
  }
  listSheetPosition.value = next[listSheetPosition.value]
}

function handleListSheetHandleClick() {
  if (didDragListSheet.value) {
    didDragListSheet.value = false
    return
  }
  toggleListSheet()
}

function getListSheetOffsets() {
  const height = window.innerHeight
  return {
    expanded: 0,
    middle: Math.round(height * 0.46),
    collapsed: Math.max(height - SHEET_COLLAPSED_VISIBLE_HEIGHT, 0),
  }
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

  const offsets = getListSheetOffsets()
  const currentOffset = offsets[listSheetPosition.value] + listSheetDragDeltaY.value
  listSheetPosition.value = (Object.entries(offsets) as [ListSheetPosition, number][])
    .reduce((nearest, candidate) =>
      Math.abs(candidate[1] - currentOffset) < Math.abs(nearest[1] - currentOffset) ? candidate : nearest,
    )[0]

  isDraggingListSheet.value = false
  listSheetDragDeltaY.value = 0
  window.removeEventListener('pointermove', dragListSheet)
  window.removeEventListener('pointerup', endListSheetDrag)
  window.removeEventListener('pointercancel', endListSheetDrag)
}

function updateViewportMode() {
  isDesktopViewport.value = window.innerWidth >= 768
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

watch(
  () => selectedPlace.value?.id,
  (placeId) => {
    if (!placeId) return
    if (!isDesktopViewport.value && listSheetPosition.value === 'collapsed') listSheetPosition.value = 'middle'
    void loadPlaceDetails(placeId)
  },
)

watch(
  () => props.targetPlace,
  (place) => {
    if (place) selectedPlaceId.value = place.id
  },
  { immediate: true },
)

watch(
  () => props.accessToken,
  () => {
    if (selectedPlace.value) void loadPlaceDetails(selectedPlace.value.id)
  },
)

watch(
  () => props.initialKeyword,
  (nextKeyword, previousKeyword) => {
    if (!nextKeyword?.trim() || nextKeyword === previousKeyword) return
    if (consumeInitialKeyword()) void loadPlaces(0)
  },
)

onMounted(async () => {
  window.addEventListener('resize', updateViewportMode)
  consumeInitialKeyword()
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
  window.removeEventListener('resize', updateViewportMode)
})
</script>

<template>
  <section class="h-[calc(100dvh-56px)] bg-slate-50 md:h-[calc(100vh-64px)] md:overflow-hidden">
    <div class="grid h-full bg-white shadow-sm md:min-h-0 md:grid-cols-[340px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside
        ref="listSheet"
        data-testid="explore-list-sheet"
        :data-sheet-position="listSheetPosition"
        class="fixed inset-x-0 bottom-0 z-[80] flex h-dvh min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-transform duration-300 md:static md:order-1 md:z-auto md:h-auto md:max-h-none md:!transform-none md:rounded-none md:border-r md:border-t-0 md:shadow-none"
        :style="listSheetDragStyle"
      >
        <button
          data-testid="list-sheet-handle"
          class="grid min-h-10 touch-none place-items-center border-b border-slate-100 bg-white md:hidden"
          :aria-label="listSheetPosition === 'expanded' ? '여행지 목록 내리기' : '여행지 목록 올리기'"
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
            :data-testid="`place-list-item-${place.id}`"
            class="group cursor-pointer border-b border-slate-100 bg-white p-4 transition hover:bg-slate-50"
            :class="selectedPlaceId === place.id ? 'bg-slate-50' : ''"
            @click="selectPlaceOnMap(place)"
          >
            <div class="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">
              <SafeImage :src="placeImage(place)" :alt="place.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div
                v-if="!hasPlaceImage(place)"
                :data-testid="`place-list-image-fallback-${place.id}`"
                class="absolute inset-0 grid place-items-center bg-slate-950/45 px-5 text-center text-xs font-black text-white"
              >
                이미지 준비 중
              </div>
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

        <div class="relative h-full overflow-hidden bg-[#f5f1e8] md:order-2">
          <div class="absolute left-3 right-3 top-3 z-40 flex items-start gap-2 md:left-4 md:right-4">
            <div
              v-if="!selectedPlace"
              data-testid="map-category-filters"
              class="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
            >
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

          <KakaoMap
            class="absolute inset-0"
            :center="mapCenter"
            :markers="mapMarkers"
            :selected-marker-id="selectedPlaceId"
            :level="mapLevel"
            @marker-click="selectedPlaceId = Number($event.id)"
          />

          <Teleport to="body" :disabled="isDesktopViewport">
            <section
              v-if="selectedPlace"
              data-testid="place-detail-overlay"
              data-mobile-portal="true"
              :data-sheet-position="listSheetPosition"
              :style="listSheetDragStyle"
              class="fixed inset-x-0 bottom-0 z-[90] h-dvh overflow-hidden rounded-t-2xl bg-white shadow-2xl md:absolute md:inset-auto md:bottom-4 md:left-4 md:top-4 md:h-auto md:!transform-none md:z-50 md:w-[min(420px,calc(100%-2rem))] md:rounded-2xl md:border md:border-slate-200"
            >
            <button
              data-testid="place-detail-sheet-handle"
              class="grid min-h-10 w-full touch-none place-items-center bg-white md:hidden"
              :aria-label="listSheetPosition === 'expanded' ? '여행지 상세 내리기' : '여행지 상세 올리기'"
              @click="handleListSheetHandleClick"
              @pointerdown="startListSheetDrag"
            >
              <span class="h-1.5 w-12 rounded-full bg-slate-300"></span>
            </button>
            <button
              data-testid="close-place-detail"
              class="absolute right-6 top-12 z-20 grid size-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white md:top-4"
              aria-label="상세 패널 닫기"
              @click="closePlaceOverlay"
            >
              <X :size="19" />
            </button>
            <div class="h-full overflow-y-auto">
            <div class="relative aspect-[16/10] bg-slate-100">
              <SafeImage :src="placeImage(selectedPlace, true)" :alt="selectedPlace.title" class="h-full w-full object-cover" />
              <div
                v-if="!hasPlaceImage(selectedPlace)"
                data-testid="place-detail-image-fallback"
                class="absolute inset-0 grid place-items-center bg-slate-950/50 px-8 text-center text-sm font-black text-white"
              >
                이미지 준비 중
              </div>
            </div>

            <div class="p-5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-black text-brand-600">{{ selectedPlace.category }}</span>
                <span v-if="Number(selectedPlace.reviewCount) > 0" class="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                  <Star :size="14" class="text-amber-400" fill="currentColor" />
                  <span class="font-black text-slate-800">{{ selectedPlace.rating.toFixed(1) }}</span>
                  <span>리뷰 {{ selectedPlace.reviewCount }}</span>
                </span>
                <span v-else class="text-xs font-bold text-slate-400">리뷰 없음</span>
              </div>

              <div class="mt-3 flex items-center justify-between gap-3">
                <h2 class="min-w-0 flex-1 text-2xl font-black text-slate-950">{{ selectedPlace.title }}</h2>
                <button
                  data-testid="place-detail-like"
                  class="grid size-9 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  :class="likedIds.has(selectedPlace.id) ? 'text-red-500' : ''"
                  aria-label="좋아요"
                  @click="toggleLike(selectedPlace)"
                >
                  <Heart :size="22" :fill="likedIds.has(selectedPlace.id) ? 'currentColor' : 'none'" />
                </button>
              </div>
              <p class="mt-2 flex min-w-0 items-start gap-1.5 text-sm font-bold leading-5 text-slate-500">
                <MapPin :size="16" class="mt-0.5 shrink-0 text-brand-500" />
                <span>{{ selectedPlace.location }}</span>
              </p>
              <p class="mt-4 text-sm font-semibold leading-6 text-slate-600">{{ selectedPlace.description }}</p>

              <div v-if="selectedPlace.tags.length" class="mt-4 flex flex-wrap gap-2">
                <span v-for="tag in selectedPlace.tags" :key="tag" class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                  # {{ tag }}
                </span>
              </div>

              <button
                :data-testid="`open-add-place-${selectedPlace.id}`"
                class="btn-primary mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm"
                @click="openAddModal(selectedPlace)"
              >
                <CalendarPlus :size="17" />
                내 여행 일정에 추가
              </button>

              <p v-if="detailMessage" class="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{{ detailMessage }}</p>

              <section data-testid="place-weather" class="mt-5 border-t border-slate-100 pt-5">
                <h3 class="text-base font-black text-slate-950">날씨</h3>
                <p v-if="weatherLoading" class="mt-3 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  날씨를 불러오는 중입니다.
                </p>
                <div v-else-if="weather?.available" class="mt-3 rounded-xl bg-brand-50 p-4">
                  <div class="flex items-center gap-3">
                    <span class="grid size-11 place-items-center rounded-xl bg-white text-brand-500 shadow-sm">
                      <component :is="weatherIcon(weather.skyStatus, weather.precipitationType)" :size="22" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p data-testid="today-weather-date" class="text-xs font-black text-brand-600">{{ todayWeatherDate }}</p>
                      <p class="mt-0.5 font-black text-slate-900">{{ weatherLabel(weather.skyStatus, weather.precipitationType) }}</p>
                      <p class="mt-1 text-xs font-bold text-slate-500">강수 {{ weather.precipitationProbability ?? '-' }}% · 습도 {{ weather.humidity ?? '-' }}%</p>
                    </div>
                    <strong class="text-xl font-black text-slate-950">{{ formatTemperature(weather.temperature) }}</strong>
                  </div>
                  <div v-if="futureWeatherForecasts.length" data-testid="future-weather-grid" class="mt-3 grid grid-cols-3 gap-2">
                    <div
                      v-for="forecast in futureWeatherForecasts"
                      :key="forecast.forecastDate || forecast.dayLabel || ''"
                      data-testid="future-weather-item"
                      class="rounded-lg bg-white p-2 text-center"
                    >
                      <p class="truncate text-[11px] font-black text-slate-500">{{ forecast.dayLabel || forecast.forecastDate }}</p>
                      <component :is="weatherIcon(forecast.skyStatus, forecast.precipitationType)" :size="17" class="mx-auto my-1 text-brand-500" />
                      <p class="text-[10px] font-bold text-blue-500">최저 {{ formatForecastTemperature(forecast.minTemperature) }}</p>
                      <p class="mt-0.5 text-[10px] font-black text-red-500">최고 {{ formatForecastTemperature(forecast.maxTemperature) }}</p>
                    </div>
                  </div>
                </div>
                <div v-else-if="weatherFailed" class="mt-3 rounded-xl bg-slate-50 p-4 text-center">
                  <p class="text-sm font-bold text-slate-500">
                    {{ weather?.message || '날씨 정보를 불러오지 못했습니다.' }}
                  </p>
                  <button
                    data-testid="retry-weather"
                    class="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="weatherLoading"
                    @click="retryWeather"
                  >
                    다시 시도
                  </button>
                </div>
                <p v-else class="mt-3 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  날씨 정보를 확인할 수 없습니다.
                </p>
              </section>

              <section data-testid="place-nearby-facilities" class="mt-5 border-t border-slate-100 pt-5">
                <h3 class="text-base font-black text-slate-950">가까운 편의시설</h3>
                <p v-if="facilitiesLoading" class="mt-3 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  주변 편의시설을 확인하는 중입니다.
                </p>
                <div v-else class="mt-3 grid gap-2">
                  <article v-for="item in nearbyFacilityItems" :key="item.type" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-500">
                      <component :is="item.icon" :size="17" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-black text-slate-400">{{ item.label }}</p>
                      <p class="mt-0.5 truncate text-sm font-black text-slate-800">{{ item.nearest?.facilityName || '주변에 없음' }}</p>
                    </div>
                    <span v-if="item.nearest" class="text-xs font-black text-brand-600">{{ formatDistance(item.nearest.distanceM) }}</span>
                  </article>
                </div>
              </section>

              <section data-testid="place-reviews" class="mt-5 border-t border-slate-100 pt-5">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-base font-black text-slate-950">리뷰</h3>
                  <button
                    data-testid="open-review-editor"
                    class="h-9 rounded-lg bg-brand-50 px-3 text-xs font-black text-brand-600 transition hover:bg-brand-100"
                    @click="showReviewModal = true"
                  >
                    {{ myReview ? '내 리뷰 수정' : '리뷰 작성' }}
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  <p v-if="reviewsLoading" class="py-4 text-center text-sm font-bold text-slate-400">리뷰를 불러오는 중입니다.</p>
                  <p v-else-if="!reviews.length" class="py-4 text-center text-sm font-bold text-slate-400">첫 리뷰를 남겨보세요.</p>
                  <article
                    v-for="item in paginatedReviews"
                    :key="item.reviewId"
                    :data-testid="`place-review-card-${item.reviewId}`"
                    class="rounded-lg border-b border-slate-100 bg-white px-1 py-3 last:border-b-0"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2">
                        <strong class="truncate text-sm font-black text-slate-900">{{ item.authorNickname }}</strong>
                        <div class="flex shrink-0 items-center gap-0.5 text-amber-400" :aria-label="`${item.rating}점`">
                          <Star
                            v-for="score in 5"
                            :key="score"
                            :size="13"
                            :fill="score <= item.rating ? 'currentColor' : 'none'"
                            :class="score <= item.rating ? '' : 'text-slate-200'"
                          />
                        </div>
                      </div>
                      <span v-if="item.mine" class="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-black text-brand-600">내 리뷰</span>
                    </div>
                    <p v-if="item.content" class="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{{ item.content }}</p>
                  </article>
                  <div v-if="reviewPageCount > 1" class="flex items-center justify-between pt-1">
                    <button
                      data-testid="previous-review-page"
                      class="h-8 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="reviewPage === 0"
                      @click="reviewPage -= 1"
                    >
                      이전
                    </button>
                    <span class="text-xs font-black text-slate-400">{{ reviewPage + 1 }} / {{ reviewPageCount }}</span>
                    <button
                      data-testid="next-review-page"
                      class="h-8 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="reviewPage >= reviewPageCount - 1"
                      @click="reviewPage += 1"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </section>
            </div>
            </div>
            </section>
          </Teleport>
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
      <div v-if="showReviewModal && selectedPlace" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4" @click.self="showReviewModal = false">
        <section data-testid="review-editor-modal" class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black text-slate-950">{{ myReview ? '내 리뷰 수정' : '리뷰 작성' }}</h2>
              <p class="mt-1 text-sm font-bold text-slate-500">{{ selectedPlace.title }}</p>
            </div>
            <button class="text-slate-500" aria-label="리뷰 모달 닫기" @click="showReviewModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="mt-5 flex items-center justify-center gap-1">
            <button
              v-for="score in 5"
              :key="score"
              type="button"
              class="text-slate-300 transition hover:scale-110 hover:text-amber-400"
              :class="score <= reviewRating ? 'text-amber-400' : ''"
              :aria-label="`${score}점 선택`"
              @click="reviewRating = score"
            >
              <Star :size="30" :fill="score <= reviewRating ? 'currentColor' : 'none'" />
            </button>
          </div>
          <textarea v-model="reviewText" rows="5" maxlength="1000" class="brand-input mt-5 w-full resize-none rounded-xl px-4 py-3 text-sm outline-none" placeholder="방문 후기를 남겨보세요." />
          <div class="mt-4 flex gap-2">
            <button v-if="myReview" class="h-11 rounded-lg bg-red-50 px-4 text-sm font-black text-red-500" :disabled="reviewSaving" @click="deletePlaceReview">삭제</button>
            <button class="btn-primary h-11 flex-1 rounded-lg text-sm" :disabled="reviewSaving" @click="savePlaceReview">
              {{ reviewSaving ? '저장 중...' : myReview ? '수정 완료' : '리뷰 등록' }}
            </button>
          </div>
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
