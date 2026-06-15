import { defineStore } from 'pinia'

const defaultFallbackImage = '/images/default-place.svg'

export const usePlaceImageStore = defineStore('placeImages', {
  state: () => ({
    brokenUrls: [] as string[],
  }),
  getters: {
    isBroken:
      (state) =>
      (url?: string | null): boolean =>
        Boolean(url && state.brokenUrls.includes(url)),
  },
  actions: {
    markBroken(url?: string | null) {
      if (!url || url === defaultFallbackImage || this.brokenUrls.includes(url)) return
      this.brokenUrls.push(url)
    },
    resolveImage(candidates: Array<string | null | undefined>, fallback = defaultFallbackImage) {
      return candidates.find((url) => Boolean(url && !this.isBroken(url))) ?? fallback
    },
  },
})
