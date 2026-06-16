<script setup lang="ts">
import { CalendarPlus, ChevronDown, Clock3, Cloud, CloudRain, CloudSnow, CloudSun, Droplets, Fuel, Heart, LoaderCircle, Map as MapIcon, MessageSquareText, Pill, Share2, Star, Store, Sun, Thermometer, Umbrella, Vote, Wind, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { fetchPlaceNearbyFacilities, fetchPlaceWeather } from '@/entities/place/api/placeApi'
import type { NearbyFacilitiesResponse, NearbyFacilityType, PlaceWeather, PlaceWeatherForecast } from '@/entities/place/api/placeApi'
import { trips } from '@/entities/travel/model/travel'
import type { Place } from '@/entities/travel/model/travel'
import KakaoMap from '@/shared/ui/KakaoMap.vue'
import SafeImage from '@/shared/ui/SafeImage.vue'

const props = defineProps<{
  place: Place | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

const liked = ref(false)
const review = ref('')
const weather = ref<PlaceWeather | null>(null)
const nearbyFacilities = ref<NearbyFacilitiesResponse | null>(null)
const isWeatherLoading = ref(false)
const isNearbyFacilitiesLoading = ref(false)
const weatherMessage = ref('')
const nearbyFacilitiesMessage = ref('')
const showAddModal = ref(false)
const showMapModal = ref(false)
const showWeatherDetail = ref(false)
let nearbyFacilitiesRequestId = 0
const addMode = ref<'trip' | 'candidate'>('trip')
const addDraft = reactive({
  tripId: String(trips.find((trip) => trip.phase === 'upcoming')?.id ?? ''),
  time: '13:00',
  memo: '',
})
const reviews = ref([
  { author: '여행자민', text: '오전 시간대가 한적해서 사진 찍기 좋았어요.' },
  { author: '지수', text: '주차 가능 여부가 표시되어 있어서 일정 짜기 편했습니다.' },
])

const displayPlace = computed(() => props.place)
const mapMarkers = computed(() =>
  displayPlace.value
    ? [
        {
          id: displayPlace.value.id,
          title: displayPlace.value.title,
          position: displayPlace.value.coordinates,
        },
      ]
    : [],
)

const weatherItems = computed(() => {
  if (!weather.value?.available) return []
  return [
    {
      label: '강수 확률',
      value: formatPercent(weather.value.precipitationProbability),
      icon: Umbrella,
    },
    {
      label: '습도',
      value: formatPercent(weather.value.humidity),
      icon: Droplets,
    },
    {
      label: '풍속',
      value: formatWind(weather.value.windSpeed),
      icon: Wind,
    },
  ].filter((item) => item.value)
})

const currentWeatherIcon = computed(() => {
  if (!weather.value?.available) return CloudSun
  return dailyWeatherIcon(weather.value.skyStatus, weather.value.precipitationType)
})

const weatherDailyForecasts = computed(() => {
  if (!weather.value?.available) return []
  return weather.value.dailyForecasts ?? []
})

const weatherDetailGroups = computed(() => {
  if (!weather.value?.available) return []
  const forecastsByDate = new Map<string, PlaceWeatherForecast[]>()
  const forecasts = [...(weather.value.forecasts ?? [])].sort((left, right) => String(left.forecastAt).localeCompare(String(right.forecastAt)))

  for (const forecast of forecasts) {
    const dateKey = toForecastDateKey(forecast.forecastAt)
    if (!dateKey) continue
    forecastsByDate.set(dateKey, [...(forecastsByDate.get(dateKey) ?? []), forecast])
  }

  const dateKeys = [...forecastsByDate.keys()].sort().slice(0, 4)
  const baseDateKey = dateKeys[0] ?? ''

  return dateKeys.map((dateKey) => ({
    dateKey,
    label: weatherDetailDateLabel(dateKey, baseDateKey),
    forecasts: forecastsByDate.get(dateKey) ?? [],
  }))
})

const nearbyFacilityTypes: {
  type: NearbyFacilityType
  label: string
  icon: typeof Fuel
}[] = [
  { type: 'GAS_STATION', label: '주유소', icon: Fuel },
  { type: 'PHARMACY', label: '약국', icon: Pill },
  { type: 'CONVENIENCE_STORE', label: '편의점', icon: Store },
]

const nearbyFacilityItems = computed(() =>
  nearbyFacilityTypes.map((item) => {
    const group = nearbyFacilities.value?.groups.find((candidate) => candidate.facilityType === item.type)
    const facilities = group?.facilities ?? []
    const nearest = [...facilities].sort((left, right) => toDistance(left.distanceM) - toDistance(right.distanceM))[0] ?? null

    return {
      ...item,
      count: facilities.length,
      group,
      nearest,
      available: facilities.length > 0,
    }
  }),
)

function formatNumber(value: number | string | null) {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null
}

function formatTemperature(value: number | string | null) {
  const formatted = formatNumber(value)
  return formatted ? `${formatted}°C` : null
}

function formatTemperatureRange(min: number | string | null, max: number | string | null) {
  const minTemperature = formatTemperature(min)
  const maxTemperature = formatTemperature(max)
  if (minTemperature && maxTemperature) return `${minTemperature} / ${maxTemperature}`
  return minTemperature || maxTemperature || null
}

function formatPercent(value: number | null) {
  return value === null ? null : `${value}%`
}

function formatWind(value: number | string | null) {
  const formatted = formatNumber(value)
  return formatted ? `${formatted}m/s` : null
}

function formatDailyForecastTitle(value: string | null, dayLabel: string | null) {
  const label = displayDayLabel(dayLabel)
  if (!value) return label
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return label ? `${value} (${label})` : value
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(date)
  return label ? `${formattedDate} (${label})` : formattedDate
}

function formatWeatherDetailDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function formatForecastHour(value: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function toForecastDateKey(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weatherDetailDateLabel(dateKey: string, baseDateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  const baseDate = new Date(`${baseDateKey}T00:00:00`)
  if (Number.isNaN(date.getTime()) || Number.isNaN(baseDate.getTime())) return formatWeatherDetailDate(dateKey)

  const dayDiff = Math.round((date.getTime() - baseDate.getTime()) / 86_400_000)
  const labels = ['오늘', '내일', '모레', '글피']
  const suffix = dayDiff >= 0 && dayDiff < labels.length ? labels[dayDiff] : ''
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(date)

  return suffix ? `${formattedDate} (${suffix})` : formatWeatherDetailDate(dateKey)
}

function displayDayLabel(value: string | null) {
  if (!value) return ''
  const labels: Record<string, string> = {
    MONDAY: '월요일',
    TUESDAY: '화요일',
    WEDNESDAY: '수요일',
    THURSDAY: '목요일',
    FRIDAY: '금요일',
    SATURDAY: '토요일',
    SUNDAY: '일요일',
  }
  return labels[value] ?? value
}

function openWeatherDetail() {
  showWeatherDetail.value = true
}

function normalizeWeatherCode(value: string | number | null) {
  if (value === null) return null
  return String(value).trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function dailyWeatherIcon(skyStatus: string | number | null, precipitationType: string | number | null) {
  const precipitation = normalizeWeatherCode(precipitationType)
  if (precipitation && precipitation !== 'NONE' && precipitation !== '0') {
    if (precipitation.includes('SNOW') || precipitation === '3' || precipitation === '7') return CloudSnow
    if (precipitation.includes('SHOWER') || precipitation === '4') return CloudSun
    return CloudRain
  }

  const sky = normalizeWeatherCode(skyStatus)
  if (sky === 'CLEAR' || sky === 'SUNNY' || sky === 'SKY_1' || sky === '1') return Sun
  if (sky === 'MOSTLY_CLOUDY' || sky === 'PARTLY_CLOUDY' || sky === 'SKY_3' || sky === '3') return CloudSun
  return Cloud
}

function displaySkyStatus(value: string | number | null) {
  const labels: Record<string, string> = {
    '1': '맑음',
    '3': '구름많음',
    '4': '흐림',
    CLEAR: '맑음',
    SUNNY: '맑음',
    SKY_1: '맑음',
    MOSTLY_CLOUDY: '구름많음',
    PARTLY_CLOUDY: '구름많음',
    SKY_3: '구름많음',
    CLOUDY: '흐림',
    OVERCAST: '흐림',
    SKY_4: '흐림',
  }
  const normalized = normalizeWeatherCode(value)
  return normalized ? labels[normalized] ?? String(value) : null
}

function displayPrecipitationType(value: string | number | null) {
  const labels: Record<string, string> = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '4': '소나기',
    '5': '빗방울',
    '6': '빗방울눈날림',
    '7': '눈날림',
    NONE: '없음',
    PTY_0: '없음',
    RAIN: '비',
    PTY_1: '비',
    RAIN_SNOW: '비/눈',
    SLEET: '비/눈',
    PTY_2: '비/눈',
    SNOW: '눈',
    PTY_3: '눈',
    SHOWER: '소나기',
    SHOWERS: '소나기',
    PTY_4: '소나기',
    RAINDROP: '빗방울',
    DRIZZLE: '빗방울',
    PTY_5: '빗방울',
    RAINDROP_SNOW_FLURRY: '빗방울눈날림',
    RAIN_DROP_SNOW_FLURRY: '빗방울눈날림',
    PTY_6: '빗방울눈날림',
    SNOW_FLURRY: '눈날림',
    PTY_7: '눈날림',
  }
  const normalized = normalizeWeatherCode(value)
  return normalized ? labels[normalized] ?? String(value) : null
}

function displayWeatherState(skyStatus: string | number | null, precipitationType: string | number | null) {
  const precipitation = displayPrecipitationType(precipitationType)
  return [displaySkyStatus(skyStatus), precipitation && precipitation !== '없음' ? precipitation : null].filter(Boolean).join(' · ') || '맑음'
}

function toDistance(value: number | string | null) {
  if (value === null) return Number.POSITIVE_INFINITY
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function formatDistance(value: number | string | null) {
  const distance = toDistance(value)
  return Number.isFinite(distance) ? `${Math.round(distance)}m` : null
}

async function loadWeather(placeId: number) {
  isWeatherLoading.value = true
  weatherMessage.value = ''
  weather.value = null

  try {
    const result = await fetchPlaceWeather(placeId)
    weather.value = result
    weatherMessage.value = result.available ? '' : result.message || '날씨 정보를 불러올 수 없습니다.'
  } catch {
    weatherMessage.value = '날씨 정보를 불러올 수 없습니다.'
  } finally {
    isWeatherLoading.value = false
  }
}

async function loadNearbyFacilities(placeId: number) {
  const requestId = ++nearbyFacilitiesRequestId
  isNearbyFacilitiesLoading.value = true
  nearbyFacilitiesMessage.value = ''
  nearbyFacilities.value = null

  try {
    const result = await fetchPlaceNearbyFacilities(placeId, {
      limit: 10,
      types: nearbyFacilityTypes.map((item) => item.type),
    })

    if (requestId !== nearbyFacilitiesRequestId) return
    nearbyFacilities.value = result
    nearbyFacilitiesMessage.value = result.groups.length ? '' : '좌표 정보가 없어 주변 시설을 확인할 수 없습니다.'
  } catch {
    if (requestId !== nearbyFacilitiesRequestId) return
    nearbyFacilitiesMessage.value = '주변 시설 정보를 불러올 수 없습니다.'
  } finally {
    if (requestId === nearbyFacilitiesRequestId) {
      isNearbyFacilitiesLoading.value = false
    }
  }
}

function addReview() {
  const text = review.value.trim()
  if (!text) return
  reviews.value.unshift({ author: '나', text })
  review.value = ''
  emit('saved', '리뷰가 등록되었습니다.')
}

function openAddModal() {
  addMode.value = 'trip'
  showAddModal.value = true
}

function submitAddPlace() {
  if (!displayPlace.value) return
  const trip = trips.find((item) => String(item.id) === addDraft.tripId)
  const target = trip?.title ?? '선택한 일정'
  const message =
    addMode.value === 'trip'
      ? `${displayPlace.value.title}을(를) ${target} ${addDraft.time}에 추가했습니다.`
      : `${displayPlace.value.title}을(를) ${target} 팀 후보 투표로 올렸습니다.`

  showAddModal.value = false
  addDraft.memo = ''
  emit('saved', message)
}

watch(
  () => displayPlace.value?.id,
  (placeId) => {
    if (!placeId) return
    void loadWeather(placeId)
    void loadNearbyFacilities(placeId)
  },
  { immediate: true },
)

</script>

<template>
  <section v-if="displayPlace" class="app-container py-6 md:py-8">
    <button class="mb-5 text-sm font-black text-slate-500" @click="emit('change', 'explore')">← 탐색으로 돌아가기</button>

    <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="relative h-72 overflow-hidden bg-slate-200 sm:h-96 lg:h-[460px]">
          <SafeImage :src="displayPlace.detailImage || displayPlace.image" :alt="displayPlace.title" class="h-full w-full object-cover transition duration-700 hover:scale-105" />
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
              <Star :size="16" />
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

          <div class="mt-7 grid gap-3">
            <button class="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-lg text-base" @click="openAddModal">
              <CalendarPlus :size="17" />
              내 여행에 추가하기
            </button>
            <div class="grid gap-3 sm:grid-cols-2">
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="emit('saved', '공유 링크를 복사했습니다.')">
                <Share2 :size="17" />
                공유
              </button>
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700" @click="showMapModal = true">
                <MapIcon :size="17" />
                지도 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
      <section class="brand-card flex min-h-[520px] flex-col rounded-2xl p-5 lg:min-h-[760px]">
        <h2 class="mb-4 flex items-center gap-2 text-lg font-black text-slate-950">
          <MessageSquareText :size="20" class="text-brand-500" />
          리뷰 작성
        </h2>
        <div class="flex shrink-0 gap-3">
          <input v-model="review" class="brand-input h-11 min-w-0 flex-1 rounded-lg px-4 text-sm outline-none" placeholder="방문 팁이나 후기를 남겨보세요." @keyup.enter="addReview" />
          <button class="btn-primary h-11 rounded-lg px-5 text-sm" @click="addReview">등록</button>
        </div>
        <div class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <article v-for="item in reviews" :key="`${item.author}-${item.text}`" class="rounded-lg bg-slate-50 p-4">
            <p class="text-sm font-black text-slate-950">{{ item.author }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ item.text }}</p>
          </article>
        </div>
      </section>

      <aside class="space-y-4">
        <section class="brand-card rounded-2xl p-5">
          <h2 class="mb-4 text-lg font-black text-slate-950">날씨 정보</h2>
          <div v-if="isWeatherLoading" class="grid h-28 place-items-center rounded-lg bg-slate-50 text-sm font-black text-slate-500">
            <span class="inline-flex items-center gap-2">
              <LoaderCircle :size="17" class="animate-spin" />
              날씨를 불러오는 중
            </span>
          </div>
          <div v-else-if="weather?.available" class="grid gap-3 text-sm">
            <div class="rounded-lg bg-brand-50 px-3 py-3">
              <div class="flex items-center gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-brand-500 shadow-sm">
                  <component :is="currentWeatherIcon" :size="20" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-black text-brand-500">오늘 날씨</p>
                  <p class="mt-0.5 truncate font-black text-slate-900">{{ displayWeatherState(weather.skyStatus, weather.precipitationType) }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-lg font-black text-slate-950">{{ formatTemperature(weather.temperature) ?? '-' }}</p>
                  <p v-if="formatTemperature(weather.feelsLikeTemperature)" class="text-[11px] font-bold text-slate-500">체감 {{ formatTemperature(weather.feelsLikeTemperature) }}</p>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <p v-for="item in weatherItems" :key="item.label" class="rounded-lg bg-slate-50 px-2.5 py-2">
                <span class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <component :is="item.icon" :size="16" />
                  {{ item.label }}
                </span>
                <span class="mt-1 block font-black text-slate-800">{{ item.value }}</span>
              </p>
            </div>
            <div v-if="weatherDailyForecasts.length" class="mt-1 grid gap-2">
              <h3 class="flex items-center gap-2 pt-2 text-sm font-black text-slate-950">
                <Clock3 :size="16" class="text-brand-500" />
                일별 예보
              </h3>
              <article v-for="forecast in weatherDailyForecasts" :key="forecast.forecastDate ?? `${forecast.dayLabel}-${forecast.updatedAt}`" class="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div class="flex items-start gap-3">
                  <div class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-brand-500">
                    <component :is="dailyWeatherIcon(forecast.skyStatus, forecast.precipitationType)" :size="18" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-black text-brand-500">{{ formatDailyForecastTitle(forecast.forecastDate, forecast.dayLabel) }}</p>
                    <p class="mt-1 truncate font-black text-slate-900">{{ displayWeatherState(forecast.skyStatus, forecast.precipitationType) }}</p>
                  </div>
                  <span class="shrink-0 text-base font-black text-slate-950">{{ formatTemperatureRange(forecast.minTemperature, forecast.maxTemperature) ?? '-' }}</span>
                </div>
                <div class="mt-2 grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-500">
                  <span>강수 {{ formatPercent(forecast.precipitationProbability) ?? '-' }}</span>
                  <span>습도 {{ formatPercent(forecast.humidity) ?? '-' }}</span>
                  <span>풍속 {{ formatWind(forecast.windSpeed) ?? '-' }}</span>
                </div>
              </article>
            </div>
            <button
              v-if="weatherDetailGroups.length"
              class="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
              @click="openWeatherDetail"
            >
              <Clock3 :size="16" />
              시간대별 날씨 보기
            </button>
          </div>
          <div v-else class="rounded-lg bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">
            {{ weatherMessage || '날씨 정보를 불러올 수 없습니다.' }}
          </div>
        </section>
        <section v-if="false" class="brand-card rounded-2xl p-5">
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
        <section class="brand-card rounded-2xl p-5">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-slate-950">가장 가까운 주변 편의시설</h2>
              <p class="mt-1 text-xs font-bold text-slate-500">주유소 · 약국 · 편의점</p>
            </div>
            <span v-if="false" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">가까운 순</span>
          </div>

          <div v-if="isNearbyFacilitiesLoading" class="grid h-28 place-items-center rounded-lg bg-slate-50 text-sm font-black text-slate-500">
            <span class="inline-flex items-center gap-2">
              <LoaderCircle :size="17" class="animate-spin" />
              주변 시설 확인 중
            </span>
          </div>
          <div v-else class="grid gap-3 text-sm">
            <p v-if="nearbyFacilitiesMessage" class="rounded-lg bg-slate-50 p-4 font-bold leading-6 text-slate-500">
              {{ nearbyFacilitiesMessage }}
            </p>
            <article
              v-for="item in nearbyFacilityItems"
              :key="item.type"
              class="rounded-lg border px-3 py-3"
              :class="item.available ? 'border-blue-100 bg-blue-50/70' : 'border-slate-200 bg-slate-50'"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="inline-flex min-w-0 items-center gap-2 font-black text-slate-800">
                  <component :is="item.icon" :size="17" :class="item.available ? 'text-blue-600' : 'text-slate-400'" />
                  {{ item.label }}
                </span>
                <span
                  class="shrink-0 rounded-full px-2.5 py-1 text-xs font-black"
                  :class="item.available ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'"
                >
                  {{ item.available ? '있음' : '없음' }}
                </span>
              </div>
              <p v-if="item.nearest" class="mt-2 truncate text-xs font-bold text-slate-600">
                {{ item.nearest.facilityName }}
                <span v-if="formatDistance(item.nearest.distanceM)"> · {{ formatDistance(item.nearest.distanceM) }}</span>
              </p>
              <p v-else class="mt-2 text-xs font-bold text-slate-500">반경 안에 확인된 시설이 없습니다.</p>
            </article>
          </div>
        </section>
        <section class="brand-card relative h-72 cursor-pointer overflow-hidden rounded-2xl p-0" @click="showMapModal = true">
          <KakaoMap
            class="pointer-events-none absolute inset-0"
            :center="displayPlace.coordinates"
            :markers="mapMarkers"
            :selected-marker-id="displayPlace.id"
            :level="5"
          />
          <p class="absolute left-4 top-4 z-10 w-fit rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
            위치 지도
          </p>
          <div class="absolute bottom-4 left-4 right-4 z-10 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
            <p class="text-xs font-black text-brand-500">{{ displayPlace.category }}</p>
            <h3 class="mt-1 text-base font-black text-slate-950">{{ displayPlace.title }}</h3>
            <p class="mt-1 text-xs font-bold text-slate-500">{{ displayPlace.location }}</p>
          </div>
        </section>
      </aside>
    </div>

    <Transition name="modal-fade">
      <div v-if="showAddModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black text-slate-950">여행에 추가하기</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">{{ displayPlace.title }}을(를) 추가할 방식을 선택하세요.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showAddModal = false">
              <X :size="22" />
            </button>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button
              class="rounded-xl border p-4 text-left transition"
              :class="addMode === 'trip' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @click="addMode = 'trip'"
            >
              <CalendarPlus :size="20" />
              <span class="mt-2 block text-sm font-black">일정에 바로 추가</span>
              <span class="mt-1 block text-xs font-bold text-slate-500">시간을 지정해 내 일정에 넣습니다.</span>
            </button>
            <button
              class="rounded-xl border p-4 text-left transition"
              :class="addMode === 'candidate' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @click="addMode = 'candidate'"
            >
              <Vote :size="20" />
              <span class="mt-2 block text-sm font-black">팀 후보로 올리기</span>
              <span class="mt-1 block text-xs font-bold text-slate-500">팀원이 투표할 장소 후보로 등록합니다.</span>
            </button>
          </div>

          <div class="mt-4 space-y-3">
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
            <label v-if="addMode === 'trip'" class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">방문 시간</span>
              <input v-model="addDraft.time" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="addDraft.memo" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :placeholder="addMode === 'trip' ? '예: 노을 시간에 방문' : '예: 첫날 저녁 후보'" />
            </label>
          </div>

          <button class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="submitAddPlace">
            {{ addMode === 'trip' ? '선택한 일정에 추가' : '팀 후보로 등록' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showWeatherDetail" class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" @click.self="showWeatherDetail = false">
        <section class="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div class="min-w-0">
              <p class="text-xs font-black text-brand-500">날씨 상세</p>
              <h2 class="mt-1 truncate text-xl font-black text-slate-950">{{ displayPlace.title }}</h2>
              <p class="mt-1 text-xs font-bold text-slate-500">날짜별 시간대 예보</p>
            </div>
            <button class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="닫기" @click="showWeatherDetail = false">
              <X :size="20" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            <div class="space-y-4">
              <section v-for="group in weatherDetailGroups" :key="group.dateKey" class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-black text-slate-950">{{ group.label }}</p>
                    <p class="mt-0.5 text-xs font-bold text-slate-500">{{ formatWeatherDetailDate(group.dateKey) }}</p>
                  </div>
                  <span class="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">{{ group.forecasts.length }}개 예보</span>
                </div>
                <div class="overflow-hidden rounded-lg border border-slate-100">
                  <article
                    v-for="forecast in group.forecasts"
                    :key="forecast.forecastAt ?? `${forecast.temperature}-${forecast.updatedAt}`"
                    class="grid grid-cols-[56px_1fr_64px] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[64px_1fr_72px_126px]"
                  >
                    <span class="text-xs font-black text-brand-500">{{ formatForecastHour(forecast.forecastAt) }}</span>
                    <div class="flex min-w-0 items-center gap-3">
                      <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-brand-500">
                        <component :is="dailyWeatherIcon(forecast.skyStatus, forecast.precipitationType)" :size="18" />
                      </span>
                      <span class="min-w-0 truncate text-sm font-black text-slate-900">{{ displayWeatherState(forecast.skyStatus, forecast.precipitationType) }}</span>
                    </div>
                    <span class="text-right text-sm font-black text-slate-950">{{ formatTemperature(forecast.temperature) ?? '-' }}</span>
                    <div class="col-span-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 sm:col-span-1">
                      <span>강수 {{ formatPercent(forecast.precipitationProbability) ?? '-' }}</span>
                      <span>습도 {{ formatPercent(forecast.humidity) ?? '-' }}</span>
                      <span>{{ formatWind(forecast.windSpeed) ?? '-' }}</span>
                    </div>
                  </article>
                </div>
              </section>
              </div>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showMapModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
        <section class="modal-panel w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 class="text-lg font-black text-slate-950">지도 보기</h2>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ displayPlace.title }} · {{ displayPlace.location }}</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showMapModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="relative h-[360px] overflow-hidden bg-slate-100">
            <KakaoMap
              class="absolute inset-0"
              :center="displayPlace.coordinates"
              :markers="mapMarkers"
              :selected-marker-id="displayPlace.id"
              :level="4"
            />
            <div class="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <p class="text-xs font-black text-brand-500">{{ displayPlace.category }}</p>
              <h3 class="mt-1 text-base font-black text-slate-950">{{ displayPlace.title }}</h3>
              <p class="mt-1 text-xs font-bold text-slate-500">{{ displayPlace.location }}</p>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
