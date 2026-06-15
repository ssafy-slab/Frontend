import type { Place } from '@/entities/travel/model/travel'

export type PlaceCategory = {
  value: string
  label: string
  count: number
}

export type RegionFilter = {
  regionId: number
  regionName: string
  regionFullName: string
  regionLevel: number
  parentRegionId: number | null
  placeCount: number
}

export type PlaceFilters = {
  categories: PlaceCategory[]
  regions: RegionFilter[]
}

export type PlaceSearchParams = {
  category?: string
  regionId?: number
  keyword?: string
  page?: number
  size?: number
}

export type PlaceWeather = {
  available: boolean
  message: string | null
  temperature: number | string | null
  feelsLikeTemperature: number | string | null
  precipitationProbability: number | null
  humidity: number | null
  windSpeed: number | string | null
  precipitationType: string | null
  skyStatus: string | null
  precipitationOneHour: string | null
  updatedAt: string | null
}

export type NearbyFacilityType = 'GAS_STATION' | 'PHARMACY' | 'CONVENIENCE_STORE'

export type NearbyFacility = {
  facilityId: number
  facilityType: NearbyFacilityType
  categoryGroupCode: string
  categoryName: string | null
  facilityName: string
  phone: string | null
  address: string | null
  roadAddress: string | null
  latitude: number | string | null
  longitude: number | string | null
  placeUrl: string | null
  distanceM: number | string | null
}

export type NearbyFacilityGroup = {
  facilityType: NearbyFacilityType
  categoryGroupCode: string
  label: string
  cached: boolean
  facilities: NearbyFacility[]
}

export type NearbyFacilitiesResponse = {
  placeId: number
  searchRadiusM: number
  groups: NearbyFacilityGroup[]
}

export type NearbyFacilitiesParams = {
  radiusM?: number
  limit?: number
  types?: NearbyFacilityType[]
}

type PlaceApiItem = {
  placeId: number
  placeName: string
  category: string | null
  regionId: number
  regionName: string
  regionFullName: string
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  description: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  displayImageUrl: string | null
  thumbnailImageUrl: string | null
  detailImageUrl: string | null
}

type PlacePageApiResponse = {
  content: PlaceApiItem[]
  totalElements: number
  page: number
  size: number
  hasNext: boolean
}

export type PlacePage = Omit<PlacePageApiResponse, 'content'> & {
  content: Place[]
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
export const defaultPlaceImage = '/images/default-place.svg'

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, apiBaseUrl)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API 요청에 실패했습니다. (${response.status})`)
  }
  return response.json() as Promise<T>
}

function toNumber(value: number | string | null, fallback: number) {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function displayCategory(category: string | null) {
  if (category === '레포츠') return '레저스포츠'
  return category || '기타'
}

function toPlace(item: PlaceApiItem): Place {
  const thumbnailImage = item.thumbnailImageUrl || item.displayImageUrl || item.thumbnailUrl || item.imageUrl || defaultPlaceImage
  const detailImage = item.detailImageUrl || item.imageUrl || item.displayImageUrl || item.thumbnailUrl || defaultPlaceImage

  return {
    id: item.placeId,
    title: item.placeName,
    location: item.regionFullName || item.regionName || item.address || '',
    category: displayCategory(item.category),
    rawCategory: item.category || '',
    description: item.description || item.address || '등록된 설명이 없습니다.',
    image: thumbnailImage,
    thumbnailImage,
    detailImage,
    rating: 0,
    reviewCount: '0',
    tags: [displayCategory(item.category), item.regionName].filter(Boolean),
    marker: { top: '50%', left: '50%' },
    coordinates: {
      lat: toNumber(item.latitude, 37.5665),
      lng: toNumber(item.longitude, 126.978),
    },
    address: item.address || '',
    regionId: item.regionId,
    regionName: item.regionName,
    regionFullName: item.regionFullName,
  }
}

export async function fetchPlaces(params: PlaceSearchParams): Promise<PlacePage> {
  const data = await requestJson<PlacePageApiResponse>(buildUrl('/api/places', params))
  return {
    ...data,
    content: data.content.map(toPlace),
  }
}

export async function fetchPlaceFilters(): Promise<PlaceFilters> {
  return requestJson<PlaceFilters>(buildUrl('/api/places/filters'))
}

export async function fetchPlaceWeather(placeId: number): Promise<PlaceWeather> {
  return requestJson<PlaceWeather>(buildUrl(`/api/places/${placeId}/weather`))
}

export async function fetchPlaceNearbyFacilities(placeId: number, params: NearbyFacilitiesParams = {}): Promise<NearbyFacilitiesResponse> {
  return requestJson<NearbyFacilitiesResponse>(
    buildUrl(`/api/places/${placeId}/nearby-facilities`, {
      radiusM: params.radiusM,
      limit: params.limit,
      types: params.types?.join(','),
    }),
  )
}
