import { describe, expect, it } from 'vitest'
import { canInviteTripMembers, getTripTypeLabel } from './tripAccess'

describe('canInviteTripMembers', () => {
  it('allows member invites only for team trips', () => {
    expect(canInviteTripMembers({ tripType: 'TEAM' })).toBe(true)
    expect(canInviteTripMembers({ tripType: 'team' })).toBe(true)
    expect(canInviteTripMembers({ tripType: 'PERSONAL' })).toBe(false)
    expect(canInviteTripMembers({ tripType: null })).toBe(false)
    expect(canInviteTripMembers(null)).toBe(false)
  })
})

describe('getTripTypeLabel', () => {
  it('converts api trip type values to Korean display labels', () => {
    expect(getTripTypeLabel('TEAM')).toBe('팀 여행')
    expect(getTripTypeLabel('team')).toBe('팀 여행')
    expect(getTripTypeLabel('PERSONAL')).toBe('개인 여행')
    expect(getTripTypeLabel('personal')).toBe('개인 여행')
    expect(getTripTypeLabel(null)).toBe('개인 여행')
  })
})
