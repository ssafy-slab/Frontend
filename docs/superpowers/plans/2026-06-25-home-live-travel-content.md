# Home Live Travel Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page demo-ready with live tourist attractions, searchable rotating keywords, fixed hero attractions, and two polished mock community posts, while changing the backend GMS default model to `gpt-5.5`.

**Architecture:** Keep reusable fixed content and selection/fallback logic in focused entity model files. Home loads real tourist attractions through the existing place API and emits navigation intents; App owns cross-page state; Explore consumes a one-shot initial keyword; CommunityDetail resolves reserved negative IDs locally before using the API.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, Vue Test Utils, Spring Boot properties, existing REST clients.

---

### Task 1: Home content catalog and deterministic helpers

**Files:**
- Create: `src/entities/home/model/homeContent.ts`
- Create: `src/entities/home/model/homeContent.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
    expect(fallbackHotPlaces.every((item) => item.searchKeyword)).toBe(true)
    expect(heroSlides.every((item) => item.searchKeyword && item.image)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test and confirm missing-module failure**

Run: `pnpm test -- src/entities/home/model/homeContent.test.ts`

Expected: FAIL because `homeContent.ts` does not exist.

- [ ] **Step 3: Implement the seven keywords, four fallback attractions, hero slides, and Fisher-Yates selection**

The module exports typed `TrendingKeyword`, `HomeAttraction`, and `HeroSlide` records. `selectTrendingKeywords(random = Math.random)` copies and shuffles the seven-item catalog, then returns the first three. All user-facing Korean text is valid UTF-8.

- [ ] **Step 4: Run the focused test**

Run: `pnpm test -- src/entities/home/model/homeContent.test.ts`

Expected: PASS.

### Task 2: Live tourist-attraction home section

**Files:**
- Create: `src/pages/home/ui/HomePage.test.ts`
- Modify: `src/pages/home/ui/HomePage.vue`
- Modify: `src/entities/home/model/homeContent.ts`

- [ ] **Step 1: Write failing component tests**

Test that mounting HomePage:

```ts
expect(fetchPlaces).toHaveBeenCalledWith(
  { category: '관광명소', page: 0, size: 12 },
  undefined,
)
```

Also assert that a returned live place title renders and clicking its card emits `open-place`, while a rejected API call renders fallback attraction titles.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/pages/home/ui/HomePage.test.ts`

Expected: FAIL because HomePage still imports static `hotPlaces`.

- [ ] **Step 3: Implement live loading and fallback merge**

`HomePage.vue` accepts `accessToken?: string`, calls `fetchPlaces({ category: '관광명소', page: 0, size: 12 }, token)`, filters the response to tourist attractions, and fills a four-card base list from fallback content when necessary. It renders the repeated base list for the marquee. Live cards emit `open-place`; fallback cards emit `search-place`.

- [ ] **Step 4: Replace the hero and keyword UI**

Use `heroSlides` and the three selected keywords from Task 1. Hero slides emit `search-place` using their configured keyword. Keyword buttons emit `search-place`. Keep the hero on the right and preserve the timed carousel.

- [ ] **Step 5: Run focused tests**

Run: `pnpm test -- src/pages/home/ui/HomePage.test.ts src/entities/home/model/homeContent.test.ts`

Expected: PASS.

### Task 3: Home search navigation into Explore

**Files:**
- Modify: `src/pages/explore/ui/ExplorePage.test.ts`
- Modify: `src/pages/explore/ui/ExplorePage.vue`
- Create: `src/app/lib/homeNavigation.test.ts`
- Create: `src/app/lib/homeNavigation.ts`
- Modify: `src/app/App.vue`

- [ ] **Step 1: Write failing navigation-state tests**

```ts
expect(createHomeSearchState('제주')).toEqual({
  selectedPlace: null,
  exploreKeyword: '제주',
})
```

Add an Explore test mounting with `initialKeyword: '해수욕장'` and assert the first place request contains `{ keyword: '해수욕장', searchMode: 'tokenized' }`.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/app/lib/homeNavigation.test.ts src/pages/explore/ui/ExplorePage.test.ts`

Expected: FAIL because the helper and prop do not exist.

- [ ] **Step 3: Implement one-shot keyword consumption**

Add optional `initialKeyword` to Explore props and a `consumed-initial-keyword` emit. Before the initial `loadPlaces(0)`, copy the trimmed value into `keywordInput` and `keyword`. Watch subsequent prop changes and reload from page zero.

- [ ] **Step 4: Wire App and Home events**

App stores `requestedExploreKeyword`, passes `access-token` to Home, handles `search-place`, clears `selectedPlace`, changes to Explore, passes `initial-keyword`, and clears the request when Explore emits `consumed-initial-keyword`.

- [ ] **Step 5: Run focused tests**

Run: `pnpm test -- src/app/lib/homeNavigation.test.ts src/pages/explore/ui/ExplorePage.test.ts src/pages/home/ui/HomePage.test.ts`

Expected: PASS.

### Task 4: Replace community mocks and connect home cards

**Files:**
- Modify: `src/entities/community/model/mockCommunity.ts`
- Create: `src/entities/community/model/mockCommunity.test.ts`
- Modify: `src/pages/home/ui/HomePage.test.ts`
- Modify: `src/pages/home/ui/HomePage.vue`
- Modify: `src/app/App.vue`

- [ ] **Step 1: Write failing mock-content tests**

Assert exactly two mock posts exist, both use negative IDs, each has at least three content cells, and `findMockCommunityPost` resolves both.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/entities/community/model/mockCommunity.test.ts`

Expected: FAIL because the current mocks do not satisfy the new content requirements.

- [ ] **Step 3: Replace existing mock posts**

Create two polished posts:

1. A sunrise-to-market Busan itinerary with multiple text/image cells.
2. A quiet Jeju forest-and-coast route with multiple text/image cells.

Use new negative IDs, Korean copy, high-quality fixed images, realistic counts, and read-only mock comments.

- [ ] **Step 4: Connect Home to mock detail**

Home renders summaries derived from `mockCommunityPosts` and emits `open-community-post(postId)`. App routes that event through the existing `openCommunityPost`.

- [ ] **Step 5: Run focused tests**

Run: `pnpm test -- src/entities/community/model/mockCommunity.test.ts src/pages/home/ui/HomePage.test.ts`

Expected: PASS.

### Task 5: Enforce read-only mock community details

**Files:**
- Modify: `src/pages/community/ui/CommunityDetailPage.test.ts`
- Modify: `src/pages/community/ui/CommunityDetailPage.vue`

- [ ] **Step 1: Write failing read-only test**

Mount with the first negative mock ID. Assert `fetchCommunityPost` and `fetchCommunityComments` are not called, the mock title renders, and controls marked `data-testid="post-like-button"` and `data-testid="comment-composer"` do not exist.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/pages/community/ui/CommunityDetailPage.test.ts`

Expected: FAIL because mock posts still show like/comment controls.

- [ ] **Step 3: Implement mock read-only state**

Add `isMockPost = computed(() => Boolean(findMockCommunityPost(post.value?.postId)))`. Hide post mutations, like button, comment composer, reply controls, and comment edit/delete controls when true. Keep existing mock loading and back navigation.

- [ ] **Step 4: Run focused test**

Run: `pnpm test -- src/pages/community/ui/CommunityDetailPage.test.ts`

Expected: PASS.

### Task 6: Change backend model default

**Files:**
- Modify: `..\Backend\src\main\resources\application.properties`

- [ ] **Step 1: Change the overridable default**

```properties
ai.gms.model=${GMS_MODEL:gpt-5.5}
```

- [ ] **Step 2: Verify configuration and compile**

Run: `rg -n "ai\\.gms\\.model" src/main/resources/application.properties`

Expected: exactly `ai.gms.model=${GMS_MODEL:gpt-5.5}`.

Run: `mvn compile`

Expected: BUILD SUCCESS.

### Task 7: Full verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run frontend test suite**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

Run: `pnpm build`

Expected: type-check and Vite build exit 0.

- [ ] **Step 3: Run backend compile**

Run: `mvn compile`

Expected: BUILD SUCCESS.

- [ ] **Step 4: Inspect git state**

Run in both repositories: `git status -sb` and `git diff --check`.

Expected: both repositories are on `dev`; no whitespace errors; only intended files are modified.

### Task 8: Fixed famous-attraction hero and random hot places

**Files:**
- Modify: `..\Backend\src\main\java\com\ssafy\ssafy_slap\place\dto\PlaceSearchRequest.java`
- Modify: `..\Backend\src\main\resources\mapper\place\PlaceMapper.xml`
- Modify: `..\Backend\src\test\java\com\ssafy\ssafy_slap\place\service\PlaceServiceTest.java`
- Modify: `..\Backend\src\test\java\com\ssafy\ssafy_slap\place\mapper\PlaceMapperXmlTest.java`
- Modify: `src/entities/place/api/placeApi.ts`
- Modify: `src/entities/home/model/homeContent.ts`
- Modify: `src/entities/home/model/homeContent.test.ts`
- Modify: `src/pages/home/ui/HomePage.vue`
- Modify: `src/pages/home/ui/HomePage.test.ts`

- [ ] Add failing backend tests for `sort=random` normalization and `ORDER BY RAND()`.
- [ ] Implement the explicit backend random sort without changing existing default ordering.
- [ ] Add failing frontend tests for the random home request and five fixed famous attraction IDs.
- [ ] Load the five hero places by ID, use their original `detailImage`, and open their real details.
- [ ] Keep fixed captions and fallback search/image behavior for failed hero requests.
- [ ] Run frontend tests/build and backend targeted tests/compile.

### Task 9: Explore weather retry

**Files:**
- Modify: `src/pages/explore/ui/ExplorePage.vue`
- Modify: `src/pages/explore/ui/ExplorePage.test.ts`

- [ ] Add a failing test where weather rejects, the retry button appears, and clicking it calls only the weather API again.
- [ ] Extract weather loading into an isolated `loadWeather(placeId)` function with loading/error state.
- [ ] Render a concise unavailable message and `다시 시도` button for rejected or unavailable weather.
- [ ] Verify retry success replaces the failure state with weather content.
- [ ] Run the focused Explore test, full frontend tests, and frontend build.
