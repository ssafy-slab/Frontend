import { describe, expect, it } from 'vitest'
import { createHomeSearchState } from './homeNavigation'

describe('home search navigation', () => {
  it('clears a selected place and stores the requested keyword', () => {
    expect(createHomeSearchState(' 제주 ')).toEqual({
      selectedPlace: null,
      exploreKeyword: '제주',
    })
  })
})
