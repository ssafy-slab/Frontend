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
  }) => KakaoMarkerInstance
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

function renderMarkers() {
  if (!map || !window.kakao?.maps) return

  const currentMap = map
  clearMarkers()
  props.markers.forEach((marker) => {
    const markerInstance = new window.kakao!.maps.Marker({
      map: currentMap,
      position: toKakaoLatLng(marker.position),
      title: marker.title,
      zIndex: marker.id === props.selectedMarkerId ? 10 : 1,
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
