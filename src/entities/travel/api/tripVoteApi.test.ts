import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  castTripVoteBallot,
  closeTripVote,
  createAiSuggestionVote,
  getTripVote,
  VoteRequestError,
} from './tripVoteApi'

const vote = {
  voteId: 41,
  tripId: 1,
  creatorUserId: 10,
  title: 'AI 일정 제안 투표',
  status: 'OPEN',
  startedAt: '2026-06-24T10:00:00',
  endedAt: null,
  options: [
    { voteOptionId: 501, placeId: null, optionTitle: '찬성', description: null, sortOrder: 1, voteCount: 1 },
    { voteOptionId: 502, placeId: null, optionTitle: '반대', description: null, sortOrder: 2, voteCount: 0 },
  ],
  selectedOptionId: null,
  totalBallotCount: 1,
  eligibleVoterCount: 3,
  votedMemberCount: 1,
  allMembersVoted: false,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('tripVoteApi', () => {
  it('creates a vote from an AI suggestion without a request body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(vote), { status: 200 }),
    )

    await expect(createAiSuggestionVote('token', 1, 31)).resolves.toEqual(vote)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/1/ai/suggestions/31/vote'),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('loads, votes, and closes a trip vote', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => (
      new Response(JSON.stringify(vote), { status: 200 })
    ))

    await getTripVote('token', 1, 41)
    await castTripVoteBallot('token', 1, 41, 501)
    await closeTripVote('token', 1, 41)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/trips/1/votes/41'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/trips/1/votes/41/ballot'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ voteOptionId: 501 }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/api/trips/1/votes/41/close'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('preserves the backend conflict reason for close recovery decisions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'All trip members must vote before closing' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const error = await closeTripVote('token', 1, 41).catch((caught) => caught)

    expect(error).toBeInstanceOf(VoteRequestError)
    expect(error).toMatchObject({
      status: 409,
      serverMessage: 'All trip members must vote before closing',
    })
  })
})
