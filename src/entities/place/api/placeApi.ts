import type { Place } from '@/entities/travel/model/travel'
import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'
import { authenticatedFetch } from '@/shared/lib/authenticatedFetch'

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
  searchMode?: 'tokenized'
  sort?: 'recommended' | 'reviewCount' | 'rating'
  page?: number
  size?: number
}

export type PlaceWeatherForecast = {
  temperature: number | string | null
  precipitationProbability: number | null
  humidity: number | null
  windSpeed: number | string | null
  precipitationType: string | number | null
  skyStatus: string | number | null
  precipitationOneHour: string | null
  forecastAt: string | null
  updatedAt: string | null
}

export type PlaceDailyWeatherForecast = {
  forecastDate: string | null
  dayLabel: string | null
  minTemperature: number | string | null
  maxTemperature: number | string | null
  precipitationProbability: number | null
  humidity: number | null
  windSpeed: number | string | null
  precipitationType: string | number | null
  skyStatus: string | number | null
  updatedAt: string | null
}

export type PlaceWeather = PlaceWeatherForecast & {
  available: boolean
  message: string | null
  feelsLikeTemperature: number | string | null
  forecasts: PlaceWeatherForecast[]
  dailyForecasts: PlaceDailyWeatherForecast[]
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
  averageRating: number | string | null
  reviewCount: number | string | null
  likedByMe: boolean
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

export const defaultPlaceImage = '/images/default-place.svg'
export const fallbackPlaceImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=75',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=75',
  'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=900&q=75',
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=75',
]

export function resolvePlaceDisplayImage(place: Place, detail = false) {
  const candidates = [place.detailImage, place.thumbnailImage, place.image]
  const hasActualImage = candidates.some((image) =>
    Boolean(image && image !== defaultPlaceImage && !image.endsWith(defaultPlaceImage)),
  )
  if (hasActualImage) {
    return detail ? place.detailImage || place.image : place.thumbnailImage || place.image
  }
  return fallbackPlaceImages[Math.abs(place.id) % fallbackPlaceImages.length]
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, apiBaseUrl)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson<T>(url: string, token?: string): Promise<T> {
  const response = await authenticatedFetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
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
    rating: toNumber(item.averageRating, 0),
    reviewCount: String(toNumber(item.reviewCount, 0)),
    liked: item.likedByMe,
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

export async function fetchPlaces(params: PlaceSearchParams, token?: string): Promise<PlacePage> {
  const data = await requestJson<PlacePageApiResponse>(buildUrl('/api/places', params), token)
  return {
    ...data,
    content: data.content.map(toPlace),
  }
}

export async function fetchPlace(placeId: number, token?: string): Promise<Place> {
  return toPlace(await requestJson<PlaceApiItem>(buildUrl(`/api/places/${placeId}`), token))
}

export async function likePlace(placeId: number, token: string) {
  const response = await authenticatedFetch(buildUrl(`/api/places/${placeId}/like`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`여행지 좋아요 처리에 실패했습니다. (${response.status})`)
}

export async function unlikePlace(placeId: number, token: string) {
  const response = await authenticatedFetch(buildUrl(`/api/places/${placeId}/like`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`여행지 좋아요 해제에 실패했습니다. (${response.status})`)
}

export async function fetchMyLikedPlaces(token: string, page = 0, size = 20): Promise<Place[]> {
  const data = await requestJson<PlaceApiItem[]>(
    buildUrl('/api/users/me/liked-places', { page: Math.max(0, page), size: Math.min(50, Math.max(1, size)) }),
    token,
  )
  return data.map(toPlace)
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
