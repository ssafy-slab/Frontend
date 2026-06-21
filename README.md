# SLAP Frontend

여행지를 탐색하고 일정을 관리하며 리뷰를 공유하는 SLAP 서비스의 Vue 프론트엔드입니다.

## 주요 기능

- 지도 기반 여행지 탐색
- 카테고리·시/도·시/군/구·키워드 필터
- 추천순·리뷰 많은 순·평점 높은 순 정렬
- 여행 카드의 평균 별점과 리뷰 수 표시
- 여행지 상세 날씨·주변 시설·지도 정보
- 1~5점 별점 리뷰 등록·수정·삭제
- 마이페이지 내 리뷰 목록과 10개 단위 페이지 이동
- 이메일·OAuth 로그인, 프로필·비밀번호 관리
- 여행 일정과 커뮤니티 화면

## 기술 스택

- Vue 3
- TypeScript
- Vite 8
- Pinia
- Tailwind CSS 4
- Vitest, Vue Test Utils

## 환경 설정

`.env.example`을 `.env`로 복사하고 값을 설정합니다.

```env
VITE_KAKAO_MAP_APP_KEY=your_kakao_javascript_app_key
VITE_API_BASE_URL=http://localhost:8080
```

## 설치와 실행

```sh
corepack pnpm install
corepack pnpm dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

## 검사 명령

```sh
corepack pnpm test
corepack pnpm run type-check
corepack pnpm run build-only
corepack pnpm run lint
```

전체 프로덕션 빌드는 타입 검사와 Vite 빌드를 함께 실행합니다.

```sh
corepack pnpm build
```

## 리뷰 기능

- 여행지 상세에서 별점을 선택하고 선택적으로 후기를 작성합니다.
- 사용자당 장소별 리뷰는 하나이며 기존 리뷰는 수정하거나 삭제할 수 있습니다.
- 마이페이지 `내 리뷰` 탭에서 작성한 리뷰를 최신순으로 확인합니다.
- 리뷰가 10개를 초과하면 이전·페이지 번호·다음 방식으로 이동합니다.
- 리뷰 카드 전체를 클릭하면 해당 여행지 상세로 이동합니다.

## 여행지 정렬

탐색 패널에서 다음 정렬을 선택할 수 있습니다.

- 추천순: 평균 별점과 리뷰 수를 함께 반영
- 리뷰 많은 순
- 평점 높은 순

정렬을 선택하지 않거나 선택한 항목을 다시 누르면 기존 일반 순서를 사용합니다.

## 백엔드 연동

기본 API 주소는 `VITE_API_BASE_URL`이며 주요 연동 경로는 다음과 같습니다.

```text
GET    /api/places
GET    /api/places/{placeId}
GET    /api/places/{placeId}/weather
GET    /api/places/{placeId}/nearby-facilities
GET    /api/places/{placeId}/reviews
POST   /api/places/{placeId}/reviews
PUT    /api/places/{placeId}/reviews/me
DELETE /api/places/{placeId}/reviews/me
GET    /api/users/me/reviews
```

## 주요 디렉터리

```text
src
├─ app
├─ pages
├─ widgets
├─ features
├─ entities
├─ shared
└─ stores
```
