import { apiBaseUrl } from '@/shared/lib/apiBaseUrl'

export type VoteStatus = 'OPEN' | 'CLOSED' | string

export type VoteOptionResponse = {
  voteOptionId: number
  placeId: number | null
  optionTitle: string
  description: string | null
  sortOrder: number
  voteCount: number
}

export type VoteResponse = {
  voteId: number
  tripId: number
  creatorUserId: number
  title: string
  status: VoteStatus
  startedAt: string
  endedAt: string | null
  options: VoteOptionResponse[]
  selectedOptionId: number | null
  totalBallotCount: number
  eligibleVoterCount: number
  votedMemberCount: number
  allMembersVoted: boolean
}

export class VoteRequestError extends Error {
  status: number
  serverMessage: string

  constructor(status: number, message: string, serverMessage = '') {
    super(message)
    this.name = 'VoteRequestError'
    this.status = status
    this.serverMessage = serverMessage
  }
}

function getVoteErrorMessage(status: number) {
  if (status === 400) return '이 여행에서는 요청한 투표 작업을 할 수 없습니다.'
  if (status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  if (status === 403) return '투표를 관리할 권한이 없습니다.'
  if (status === 404) return '투표를 찾지 못했습니다.'
  if (status === 409) return '투표 또는 제안 상태가 변경되었거나 일정 시간이 충돌합니다. 최신 상태를 확인해 주세요.'
  return `투표 요청을 처리하지 못했습니다. (${status})`
}

async function readServerMessage(response: Response) {
  const text = await response.text()
  if (!text) return ''
  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: unknown }
    if (typeof parsed.message === 'string') return parsed.message
    if (typeof parsed.error === 'string') return parsed.error
  } catch {
    return text
  }
  return text
}

async function requestVote(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(new URL(path, apiBaseUrl).toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new VoteRequestError(
      response.status,
      getVoteErrorMessage(response.status),
      await readServerMessage(response),
    )
  }
  return response.json() as Promise<VoteResponse>
}

export function createAiSuggestionVote(token: string, tripId: number, suggestionId: number) {
  return requestVote(`/api/trips/${tripId}/ai/suggestions/${suggestionId}/vote`, token, {
    method: 'POST',
  })
}

export function getTripVote(token: string, tripId: number, voteId: number) {
  return requestVote(`/api/trips/${tripId}/votes/${voteId}`, token)
}

export function castTripVoteBallot(token: string, tripId: number, voteId: number, voteOptionId: number) {
  return requestVote(`/api/trips/${tripId}/votes/${voteId}/ballot`, token, {
    method: 'PUT',
    body: JSON.stringify({ voteOptionId }),
  })
}

export function closeTripVote(token: string, tripId: number, voteId: number) {
  return requestVote(`/api/trips/${tripId}/votes/${voteId}/close`, token, {
    method: 'PATCH',
  })
}
