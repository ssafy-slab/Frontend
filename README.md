# SLAP Frontend

Vue 3, Vite, Pinia 기반의 SLAP 여행 서비스 프론트엔드입니다.

## 주요 기능

- 탐색 탭에서 여행지 목록 조회
- 카테고리, 시/도, 시/군/구, 키워드 기반 여행지 검색
- 여행지 상세 화면에서 이미지, 지도, 날씨 정보 표시
- 이미지 URL이 없거나 깨진 경우 기본 이미지로 대체

## 환경 변수

`.env.example`을 `.env`로 복사한 뒤 값을 채웁니다.

```sh
cp .env.example .env
```

```env
VITE_KAKAO_MAP_APP_KEY=your_kakao_javascript_app_key
VITE_API_BASE_URL=http://localhost:8080
```

- `VITE_KAKAO_MAP_APP_KEY`: Kakao JavaScript 앱 키
- `VITE_API_BASE_URL`: 백엔드 API 주소

## 실행

```sh
pnpm install
pnpm dev
```

기본 개발 서버는 `http://localhost:5173`입니다.

## 빌드

```sh
pnpm build
```

이 명령은 `vue-tsc` 타입 체크와 Vite 프로덕션 빌드를 함께 실행합니다.

## 백엔드 연동

백엔드는 기본적으로 `http://localhost:8080`에서 실행된다고 가정합니다.

탐색/상세 화면에서 사용하는 주요 API는 다음과 같습니다.

- `GET /api/places`
- `GET /api/places/filters`
- `GET /api/places/{placeId}`
- `GET /api/places/{placeId}/weather`

날씨 정보는 프론트에서 외부 API를 직접 호출하지 않고, 백엔드의 weather API를 통해 가져옵니다.
