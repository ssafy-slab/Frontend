type TripInviteTarget = {
  tripType?: string | null
}

export function canInviteTripMembers(trip: TripInviteTarget | null) {
  return trip?.tripType?.toUpperCase() === 'TEAM'
}

export function getTripTypeLabel(tripType: string | null | undefined) {
  if (tripType?.toUpperCase() === 'TEAM') return '팀 여행'
  return '개인 여행'
}
