export function createHomeSearchState(keyword: string) {
  return {
    selectedPlace: null,
    exploreKeyword: keyword.trim(),
  }
}
