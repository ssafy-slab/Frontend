export type Place = {
  id: number
  title: string
  location: string
  category: string
  rawCategory?: string
  description: string
  image: string
  rating: number
  reviewCount: string
  tags: string[]
  liked?: boolean
  aiPick?: boolean
  marker: {
    top: string
    left: string
  }
  coordinates: {
    lat: number
    lng: number
  }
  address?: string
  regionId?: number
  regionName?: string
  regionFullName?: string
}

export type Trip = {
  id: number
  title: string
  destination: string
  period: string
  description: string
  image: string
  members: string[]
  status: string
  dday?: string
  phase: 'upcoming' | 'past'
}

export type CommunityPost = {
  id: number
  category: string
  title: string
  author: string
  likes: number
  image: string
  excerpt?: string
}

export const hotKeywords = ['#제주도 흑돼지', '#강릉 차박', '#부산 요트']

export const places: Place[] = [
  {
    id: 1,
    title: '애월 카페거리',
    location: '제주시 애월읍',
    category: '카페',
    description: '바다와 노을을 함께 즐기기 좋은 카페 코스입니다.',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80',
    rating: 4.8,
    reviewCount: '2,130',
    tags: ['#오션뷰', '#디저트', '#주차가능'],
    marker: { top: '30%', left: '29%' },
    coordinates: { lat: 33.5565, lng: 126.7959 },
  },
  {
    id: 2,
    title: '숙성도 노형본점',
    location: '제주시 노형동',
    category: '음식점',
    description: '웨이팅은 길지만 만족도가 높은 제주 흑돼지 맛집입니다.',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
    rating: 4.9,
    reviewCount: '5,420',
    tags: ['#흑돼지', '#웨이팅필수'],
    liked: true,
    marker: { top: '42%', left: '48%' },
    coordinates: { lat: 33.5116, lng: 126.526 },
  },
  {
    id: 3,
    title: '성산일출봉',
    location: '제주 서귀포시',
    category: '관광명소',
    description: '아침 산책과 일출을 함께 챙기기 좋은 자연 경관입니다.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    rating: 4.7,
    reviewCount: '8,900',
    tags: ['#자연경관', '#유네스코'],
    marker: { top: '54%', left: '68%' },
    coordinates: { lat: 33.458, lng: 126.9425 },
  },
  {
    id: 4,
    title: '서울 북촌 한옥마을',
    location: '서울 종로구',
    category: '관광명소',
    description: '전통 체험과 골목 산책을 함께 즐기는 도심 코스입니다.',
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=900&q=80',
    rating: 4.6,
    reviewCount: '4,210',
    tags: ['#한옥', '#산책'],
    aiPick: true,
    marker: { top: '62%', left: '82%' },
    coordinates: { lat: 37.5826, lng: 126.983 },
  },
]

export const hotPlaces = [
  {
    title: '부산 광안리 해변 투어',
    description: '야경이 아름다운 2박 3일 코스',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80',
    aiPick: true,
  },
  {
    title: '제주 서귀포 힐링 여행',
    description: '자연과 함께하는 쉼',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    aiPick: false,
  },
  {
    title: '강릉 카페거리 & 오죽헌',
    description: '커피 향 가득한 당일치기',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    aiPick: true,
  },
  {
    title: '서울 북촌 한옥마을',
    description: '도심 속 전통 체험',
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=900&q=80',
    aiPick: false,
  },
]

export const trips: Trip[] = [
  {
    id: 1,
    title: '나홀로 강릉 커피 투어',
    destination: '강릉',
    period: '2024.10.21 - 10.22',
    description: '안목해변 카페거리와 초당순두부 코스',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    members: ['나'],
    status: 'AI가 일정 조율 중',
    phase: 'upcoming',
  },
  {
    id: 2,
    title: '제주도 먹방 원정대',
    destination: '제주도',
    period: '2024.11.15 - 11.17',
    description: '흑돼지부터 딱새우까지, 끊임없이 먹는 2박 3일',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=900&q=80',
    members: ['나', '지수', '민수'],
    status: '투표 진행 중',
    dday: 'D-15',
    phase: 'upcoming',
  },
  {
    id: 3,
    title: '부산 야경 산책',
    destination: '부산',
    period: '2024.08.02 - 08.04',
    description: '광안리와 해운대 카페거리를 묶은 여름 여행',
    image: 'https://images.unsplash.com/photo-1506812574058-fc75fa93fead?auto=format&fit=crop&w=900&q=80',
    members: ['나', '예진'],
    status: '여행 완료',
    phase: 'past',
  },
]

export const posts: CommunityPost[] = [
  {
    id: 1,
    category: '베스트 일정',
    title: '부모님 모시고 가기 좋은 제주 3박 4일',
    author: '트래블러',
    likes: 124,
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80',
    excerpt: '많이 걷지 않아도 풍경을 즐길 수 있는 가족 여행 코스입니다.',
  },
  {
    id: 2,
    category: '포토 리뷰',
    title: '북촌 한옥마을 숨겨진 포토스팟 공유',
    author: '사진작가김',
    likes: 89,
    image: 'https://images.unsplash.com/photo-1506816561089-5cc37b3aa9b0?auto=format&fit=crop&w=900&q=80',
    excerpt: '주말 오전에 가면 사람이 적고 골목 사진이 잘 나옵니다.',
  },
]
