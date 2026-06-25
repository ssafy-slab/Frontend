import { describe, expect, it } from 'vitest'
import {
  fallbackHotPlaces,
  heroSlides,
  selectTrendingKeywords,
  trendingKeywordCatalog,
} from './homeContent'

describe('home content', () => {
  it('selects three unique keywords from the seven-entry catalog', () => {
    const selected = selectTrendingKeywords(() => 0.25)

    expect(trendingKeywordCatalog).toHaveLength(7)
    expect(selected).toHaveLength(3)
    expect(new Set(selected.map((item) => item.query)).size).toBe(3)
  })

  it('provides navigable fallback and hero attractions', () => {
    expect(fallbackHotPlaces).toHaveLength(10)
    expect(fallbackHotPlaces.every((item) => item.searchKeyword)).toBe(true)
    expect(heroSlides.every((item) => item.searchKeyword && item.image)).toBe(true)
  })
})
