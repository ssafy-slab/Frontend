import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInviteCode, createTrip, deleteScheduleItem, deleteTrip, fetchTripMembers, fetchTrips, joinTrip, updateTripMemberRole } from './tripApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('tripApi', () => {
  it('loads trips with authentication and maps members for the schedule cards', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            tripId: 9,
            ownerUserId: 3,
            title: 'Busan trip',
            description: 'Summer vacation',
            tripType: 'TEAM',
            startDate: '2026-07-01',
            endDate: '2026-07-03',
            status: 'PLANNING',
            createdAt: '2026-06-22T10:00:00',
            updatedAt: '2026-06-22T10:00:00',
            members: [
              { userId: 3, nickname: 'owner', memberRole: 'OWNER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T10:00:00' },
              { userId: 4, nickname: 'friend', memberRole: 'MEMBER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T10:00:00' },
            ],
          },
        ]),
        { status: 200 },
      ),
    )

    const trips = await fetchTrips('token')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    )
    expect(trips[0]).toMatchObject({
      id: 9,
      title: 'Busan trip',
      destination: '팀 여행',
      period: '2026-07-01 - 2026-07-03',
      members: ['ow', 'fr'],
      tripType: 'TEAM',
      ownerUserId: 3,
      phase: 'upcoming',
    })
  })

  it('sends documented trip mutation requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      if (String(input).includes('/invite-code')) return new Response(JSON.stringify({ tripId: 9, inviteCode: 'ABCD1234' }), { status: 200 })
      return new Response(
        JSON.stringify({
          tripId: 9,
          ownerUserId: 3,
          title: 'Busan trip',
          description: 'Summer vacation',
          tripType: 'TEAM',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
          status: 'PLANNING',
          createdAt: '2026-06-22T10:00:00',
          updatedAt: '2026-06-22T10:00:00',
        }),
        { status: init?.method === 'POST' ? 201 : 200 },
      )
    })

    await createTrip('token', { title: 'Busan trip', description: 'Summer vacation', tripType: 'TEAM', startDate: '2026-07-01', endDate: '2026-07-03' })
    await deleteTrip('token', 9)
    await createInviteCode('token', 9)
    await joinTrip('token', 'abcd1234')
    await deleteScheduleItem('token', 9, 7)

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/trips'), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/trips/9'), expect.objectContaining({ method: 'DELETE' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/trips/9/invite-code'), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(4, expect.stringContaining('/api/trips/join'), expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(5, expect.stringContaining('/api/trips/9/schedules/7'), expect.objectContaining({ method: 'DELETE' }))
  })

  it('loads trip members and updates a member role with documented endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PATCH') {
        return new Response(
          JSON.stringify({ userId: 20, nickname: 'member', memberRole: 'VIEWER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' }),
          { status: 200 },
        )
      }
      return new Response(
        JSON.stringify([
          { userId: 10, nickname: 'owner', memberRole: 'OWNER', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T10:00:00' },
          { userId: 20, nickname: 'member', memberRole: 'EDITOR', inviteStatus: 'ACCEPTED', joinedAt: '2026-06-22T11:00:00' },
        ]),
        { status: 200 },
      )
    })

    const members = await fetchTripMembers('token', 9)
    const updated = await updateTripMemberRole('token', 9, 20, 'VIEWER')

    expect(members).toHaveLength(2)
    expect(updated.memberRole).toBe('VIEWER')
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/trips/9/members'), expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/trips/9/members/20/role'), expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ memberRole: 'VIEWER' }),
    }))
  })
})
