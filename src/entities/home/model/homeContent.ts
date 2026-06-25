export type TrendingKeyword = {
  label: string
  query: string
}

export type HomeAttraction = {
  title: string
  description: string
  image: string
  searchKeyword: string
}

export type HeroSlide = HomeAttraction & {
  placeId: number
  caption: string
}

export const trendingKeywordCatalog: TrendingKeyword[] = [
  { label: '#제주', query: '제주' },
  { label: '#부산', query: '부산' },
  { label: '#서울', query: '서울' },
  { label: '#강릉', query: '강릉' },
  { label: '#해수욕장', query: '해수욕장' },
  { label: '#전망대', query: '전망대' },
  { label: '#한옥', query: '한옥' },
]

export const fallbackHotPlaces: HomeAttraction[] = [
  {
    title: '성산일출봉',
    description: '제주의 바다와 분화구를 한눈에 담는 대표 명소',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '성산일출봉',
  },
  {
    title: '해운대 해수욕장',
    description: '도심과 바다가 이어지는 부산의 클래식한 풍경',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '해운대',
  },
  {
    title: '북촌한옥마을',
    description: '서울의 오래된 골목과 한옥을 천천히 걷는 시간',
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '북촌한옥마을',
  },
  {
    title: '안목해변',
    description: '커피 향과 동해의 수평선을 함께 만나는 강릉',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '안목해변',
  },
  {
    title: '경복궁',
    description: '서울 한복판에서 만나는 조선 왕조의 대표 궁궐',
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '경복궁',
  },
  {
    title: '감천문화마을',
    description: '산복도로와 바다가 어우러진 부산의 색색 골목',
    image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '감천문화마을',
  },
  {
    title: '남산서울타워',
    description: '서울 도심과 야경을 한눈에 내려다보는 전망 명소',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '남산서울타워',
  },
  {
    title: '오죽헌',
    description: '고즈넉한 정원과 전통 건축이 아름다운 강릉 명소',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '오죽헌',
  },
  {
    title: '광안리해수욕장',
    description: '광안대교와 함께 즐기는 부산의 대표 야경',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '광안리해수욕장',
  },
  {
    title: '제주 비자림',
    description: '오래된 비자나무 사이를 천천히 걷는 숲길',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1000&q=85',
    searchKeyword: '비자림',
  },
]

export const heroSlides: HeroSlide[] = [
  {
    placeId: 8,
    title: '경복궁',
    caption: '서울 한복판에서 만나는 가장 웅장한 조선의 시간',
    description: '고궁의 지붕선과 북악산 풍경이 이어지는 서울 대표 관광지',
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=1600&q=90',
    searchKeyword: '경복궁',
  },
  {
    placeId: 8802,
    title: '해운대해수욕장',
    caption: '도시의 에너지와 푸른 바다가 만나는 부산',
    description: '긴 백사장과 부산의 스카이라인을 함께 즐기는 대표 해변',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=90',
    searchKeyword: '해운대해수욕장',
  },
  {
    placeId: 9127,
    title: '부산 감천문화마을',
    caption: '산복도로를 따라 펼쳐지는 부산의 다채로운 골목',
    description: '알록달록한 집과 바다 전망이 이어지는 부산의 문화마을',
    image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1600&q=90',
    searchKeyword: '감천문화마을',
  },
  {
    placeId: 38974,
    title: '비자림',
    caption: '오래된 나무 사이에서 만나는 제주의 깊은 숨',
    description: '수백 년 된 비자나무와 이끼길을 천천히 걷는 제주 숲',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=90',
    searchKeyword: '비자림',
  },
  {
    placeId: 41004,
    title: '남이섬',
    caption: '계절마다 다른 색으로 채워지는 강 위의 섬',
    description: '메타세쿼이아 길과 강변 산책을 즐기는 가평 대표 관광지',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1600&q=90',
    searchKeyword: '남이섬',
  },
]

export function selectTrendingKeywords(random: () => number = Math.random) {
  const shuffled = [...trendingKeywordCatalog]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]!
    shuffled[index] = shuffled[swapIndex]!
    shuffled[swapIndex] = current
  }
  return shuffled.slice(0, 3)
}
