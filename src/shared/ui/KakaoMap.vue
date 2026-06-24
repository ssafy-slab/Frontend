<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type LatLngLiteral = {
  lat: number
  lng: number
}

type MapMarker = {
  id: number | string
  title: string
  position: LatLngLiteral
  category?: string
}

type KakaoMapInstance = {
  setCenter: (position: KakaoLatLngInstance) => void
  setLevel: (level: number) => void
}

type KakaoMarkerInstance = {
  setMap: (map: KakaoMapInstance | null) => void
}

type KakaoLatLngInstance = object

type KakaoMapsApi = {
  load: (callback: () => void) => void
  LatLng: new (lat: number, lng: number) => KakaoLatLngInstance
  Map: new (container: HTMLElement, options: { center: KakaoLatLngInstance; level: number }) => KakaoMapInstance
  Marker: new (options: {
    map: KakaoMapInstance
    position: KakaoLatLngInstance
    title: string
    zIndex: number
    image?: object
  }) => KakaoMarkerInstance
  MarkerImage: new (src: string, size: object, options: { offset: object }) => object
  Size: new (width: number, height: number) => object
  Point: new (x: number, y: number) => object
  event: {
    addListener: (target: KakaoMarkerInstance, eventName: 'click', callback: () => void) => void
  }
}

type KakaoApi = {
  maps: KakaoMapsApi
}

const props = withDefaults(defineProps<{
  center: LatLngLiteral
  markers?: MapMarker[]
  selectedMarkerId?: number | string | null
  level?: number
}>(), {
  markers: () => [],
  selectedMarkerId: null,
  level: 5,
})

const emit = defineEmits<{
  markerClick: [marker: MapMarker]
}>()

const mapEl = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

let map: KakaoMapInstance | null = null
let markerInstances: KakaoMarkerInstance[] = []
let scriptPromise: Promise<void> | null = null
const sdkLoadTimeoutMs = 8000

const appKey = computed(() => import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined)

declare global {
  interface Window {
    kakao?: KakaoApi
  }
}

function loadKakaoMapSdk() {
  if (window.kakao?.maps) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    if (!appKey.value) {
      reject(new Error('VITE_KAKAO_MAP_APP_KEY is not set.'))
      return
    }

    const loadMaps = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Maps SDK was loaded, but kakao.maps is unavailable. Check the JavaScript key and registered domain.'))
        return
      }

      window.kakao.maps.load(resolveOnce)
    }

    const timeoutId = window.setTimeout(() => {
      reject(new Error('Kakao Maps SDK loading timed out. Check network access, JavaScript key, and registered domain.'))
    }, sdkLoadTimeoutMs)

    const resolveOnce = () => {
      window.clearTimeout(timeoutId)
      resolve()
    }

    const rejectOnce = (error: Error) => {
      window.clearTimeout(timeoutId)
      reject(error)
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]')
    if (existingScript) {
      if (window.kakao?.maps) {
        window.kakao.maps.load(resolveOnce)
        return
      }

      existingScript.addEventListener('load', loadMaps, { once: true })
      existingScript.addEventListener('error', () => rejectOnce(new Error('Failed to load Kakao Maps SDK.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.dataset.kakaoMapSdk = 'true'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey.value}&autoload=false`
    script.async = true
    script.onload = loadMaps
    script.onerror = () => rejectOnce(new Error('Failed to load Kakao Maps SDK.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

function toKakaoLatLng(position: LatLngLiteral) {
  return new window.kakao!.maps.LatLng(position.lat, position.lng)
}

function clearMarkers() {
  markerInstances.forEach((marker) => marker.setMap(null))
  markerInstances = []
}

function markerIcon(category = '') {
  if (category.includes('음식')) return '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3m0 0v7"/>'
  if (category.includes('관광')) return '<path d="m3 10 9-7 9 7M5 10v10M9 10v10M15 10v10M19 10v10M3 20h18"/>'
  if (category.includes('쇼핑')) return '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0"/>'
  if (category.includes('레저') || category.includes('스포츠')) return '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m6 17 4-9 4 9M9 10h6M14 8h3"/>'
  if (category.includes('숙박')) return '<path d="M2 20v-8M2 16h20M6 12V6h5a3 3 0 0 1 3 3v3M22 20v-6a2 2 0 0 0-2-2h-6"/>'
  if (category.includes('문화')) return '<circle cx="13.5" cy="6.5" r=".5" fill="white"/><circle cx="17.5" cy="10.5" r=".5" fill="white"/><circle cx="8.5" cy="7.5" r=".5" fill="white"/><path d="M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-2.5a1.5 1.5 0 0 0 0 3H17c1 0 2 1 2 2 0 2-3 2-7 2Z"/>'
  return '<path d="m12 3-1.8 4.7L5.5 9.5l4.7 1.8L12 16l1.8-4.7 4.7-1.8-4.7-1.8ZM5 16l-.8 2.2L2 19l2.2.8L5 22l.8-2.2L8 19l-2.2-.8Z"/>'
}

function markerImage(marker: MapMarker, selected: boolean) {
  const width = selected ? 54 : 48
  const height = selected ? 62 : 56
  const scale = selected ? 1.125 : 1
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 48 56">
      <defs>
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#0f172a" flood-opacity=".28"/>
        </filter>
      </defs>
      <g transform="translate(24 25) scale(${scale}) translate(-24 -25)" filter="url(#shadow)">
        <path d="M24 3C13.5 3 5 11.2 5 21.5 5 36 24 52 24 52s19-16 19-30.5C43 11.2 34.5 3 24 3Z"
          fill="${selected ? '#4f46e5' : '#6366f1'}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
        <g transform="translate(14 12) scale(.84)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${markerIcon(marker.category)}
        </g>
      </g>
    </svg>`
  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  return new window.kakao!.maps.MarkerImage(
    src,
    new window.kakao!.maps.Size(width, height),
    { offset: new window.kakao!.maps.Point(width / 2, height) },
  )
}

function renderMarkers() {
  if (!map || !window.kakao?.maps) return

  const currentMap = map
  clearMarkers()
  props.markers.forEach((marker) => {
    const selected = marker.id === props.selectedMarkerId
    const markerInstance = new window.kakao!.maps.Marker({
      map: currentMap,
      position: toKakaoLatLng(marker.position),
      title: marker.title,
      zIndex: selected ? 10 : 1,
      image: markerImage(marker, selected),
    })

    window.kakao!.maps.event.addListener(markerInstance, 'click', () => {
      emit('markerClick', marker)
    })

    markerInstances.push(markerInstance)
  })
}

function moveCenter() {
  if (!map || !window.kakao?.maps) return
  map.setCenter(toKakaoLatLng(props.center))
}

function updateLevel() {
  if (!map) return
  map.setLevel(props.level)
}

async function createMap() {
  try {
    status.value = 'loading'
    await loadKakaoMapSdk()
    await nextTick()

    if (!mapEl.value) return

    map = new window.kakao!.maps.Map(mapEl.value, {
      center: toKakaoLatLng(props.center),
      level: props.level,
    })

    renderMarkers()
    status.value = 'ready'
  } catch (error) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'Kakao map is unavailable.'
  }
}

watch(() => props.center, moveCenter, { deep: true })
watch(() => props.level, updateLevel)
watch(() => [props.markers, props.selectedMarkerId], renderMarkers, { deep: true })

onMounted(createMap)

onBeforeUnmount(() => {
  clearMarkers()
  map = null
})
</script>

<template>
  <div class="relative h-full min-h-[280px] w-full overflow-hidden bg-slate-100">
    <div ref="mapEl" class="h-full min-h-[280px] w-full" />
    <div v-if="status !== 'ready'" class="absolute inset-0 grid place-items-center bg-slate-100 px-5 text-center">
      <p class="text-sm font-black text-slate-500">
        {{ status === 'loading' ? '카카오맵을 불러오는 중입니다.' : errorMessage }}
      </p>
    </div>
  </div>
</template>
