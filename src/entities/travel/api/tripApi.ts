import type { Trip } from '@/entities/travel/model/travel'
import { getTripTypeLabel } from '@/entities/travel/model/tripAccess'

export type TripMemberResponse = {
  userId: number
  nickname: string
  memberRole: TripMemberRole
  inviteStatus: string
  joinedAt: string
}

export type TripMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER' | 'MEMBER'

export type TripResponse = {
  tripId: number
  ownerUserId: number
  title: string
  description: string | null
  tripType: string | null
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type TripListResponse = TripResponse & {
  members: TripMemberResponse[]
}

export type TripPayload = {
  title: string
  description?: string | null
  tripType?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type InviteCodeResponse = {
  tripId: number
  inviteCode: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
const fallbackTripImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'

function authHeaders(token: string, json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  }
}

async function requestWithToken<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl).toString(), {
    ...options,
    headers: {
      ...authHeaders(token, Boolean(options.body)),
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 400) throw new Error('입력한 여행 정보를 다시 확인해주세요.')
    if (response.status === 401) throw new Error('로그인이 필요합니다.')
    if (response.status === 403) throw new Error('이 여행을 수정할 권한이 없습니다.')
    if (response.status === 404) throw new Error('여행 정보를 찾을 수 없습니다.')
    if (response.status === 409) throw new Error('초대 코드 생성에 실패했습니다. 다시 시도해주세요.')
    throw new Error(`여행 API 요청에 실패했습니다. (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) return `${startDate} - ${endDate}`
  if (startDate) return `${startDate} - 종료일 미정`
  if (endDate) return `시작일 미정 - ${endDate}`
  return '일정 미정'
}

function getPhase(endDate: string | null): Trip['phase'] {
  if (!endDate) return 'upcoming'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${endDate}T00:00:00`).getTime() < today.getTime() ? 'past' : 'upcoming'
}

function getDday(startDate: string | null) {
  if (!startDate) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(`${startDate}T00:00:00`)
  const days = Math.ceil((start.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return undefined
  if (days === 0) return 'D-Day'
  return `D-${days}`
}

function toInitial(nickname: string) {
  const trimmed = nickname.trim()
  return trimmed ? trimmed.slice(0, 2) : '?'
}

export function toTrip(item: TripResponse | TripListResponse): Trip {
  const members = 'members' in item ? item.members.map((member) => toInitial(member.nickname)) : []
  const tripType = item.tripType || 'PERSONAL'

  return {
    id: item.tripId,
    tripId: item.tripId,
    ownerUserId: item.ownerUserId,
    title: item.title,
    destination: getTripTypeLabel(tripType),
    period: formatPeriod(item.startDate, item.endDate),
    description: item.description || '여행 설명이 없습니다.',
    image: fallbackTripImage,
    members: members.length ? members : ['나'],
    status: item.status,
    tripType: item.tripType,
    startDate: item.startDate,
    endDate: item.endDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dday: getDday(item.startDate),
    phase: getPhase(item.endDate),
  }
}

export async function fetchTrips(token: string) {
  const data = await requestWithToken<TripListResponse[]>('/api/trips', token)
  return data.map(toTrip)
}

export async function createTrip(token: string, payload: TripPayload) {
  return toTrip(await requestWithToken<TripResponse>('/api/trips', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  }))
}

export async function deleteTrip(token: string, tripId: number) {
  return requestWithToken<void>(`/api/trips/${tripId}`, token, { method: 'DELETE' })
}

export async function createInviteCode(token: string, tripId: number) {
  return requestWithToken<InviteCodeResponse>(`/api/trips/${tripId}/invite-code`, token, { method: 'POST' })
}

export async function joinTrip(token: string, inviteCode: string) {
  return toTrip(await requestWithToken<TripResponse>('/api/trips/join', token, {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  }))
}

export async function fetchTripMembers(token: string, tripId: number) {
  return requestWithToken<TripMemberResponse[]>(`/api/trips/${tripId}/members`, token, { method: 'GET' })
}

export async function updateTripMemberRole(token: string, tripId: number, memberUserId: number, memberRole: 'EDITOR' | 'VIEWER') {
  return requestWithToken<TripMemberResponse>(`/api/trips/${tripId}/members/${memberUserId}/role`, token, {
    method: 'PATCH',
    body: JSON.stringify({ memberRole }),
  })
}

export async function deleteScheduleItem(token: string, tripId: number, scheduleItemId: number) {
  return requestWithToken<void>(`/api/trips/${tripId}/schedules/${scheduleItemId}`, token, { method: 'DELETE' })
}
