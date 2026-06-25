# Home Live Travel Content Design

## Goal

Replace the home screen's disconnected sample content with a demo-ready mixture of live place data and intentional fixed content, while preserving reliable navigation during a functional demonstration.

## Scope

This change covers:

- Changing the backend GMS default model from `gpt-4.1-mini` to `gpt-5.5`.
- Loading home hot places from the real place API.
- Making home trending keywords open the explore page with a working search.
- Replacing the right-side hero carousel with polished, fixed tourist-attraction content linked to real places when available.
- Replacing the existing community samples with two new mock popular posts and navigable mock detail content.

It does not add a new database table, a new backend home API, analytics-based rankings, or a community seed-data migration.

## Data Sources

### Hot Places

The home page requests places with the tourist-attraction category filter and a bounded page size. It does not apply review-count, rating, or recommendation sorting.

The UI keeps only records that belong to the tourist-attraction category. API images are displayed through the existing place-image resolver. If the request fails, returns no usable tourist attractions, or returns too few items for the carousel, the remaining slots are filled with fixed fallback tourist-attraction cards.

Live cards retain their real `placeId` and open the existing place detail flow. Fallback cards use a configured real place ID when that ID is available; otherwise they launch a keyword search for the attraction so the card remains functional without pretending that an unknown database ID is valid.

### Trending Keywords

Seven fixed keyword definitions are maintained in a home-content model. Each definition contains:

- A display label.
- The actual search query sent to the explore page.
- A fallback label suitable for the current database vocabulary.

On each home component mount, three distinct keywords are selected using a shuffle-and-slice helper. The selected set remains stable while the user stays on that home mount. Returning to the home page remounts the component and selects a new set.

The keywords will target broad, likely searchable concepts supported by the existing tokenized place search, such as 제주, 부산, 서울, 강릉, 해수욕장, 전망대, and 한옥. The exact Korean strings are stored as UTF-8 source text and covered by tests.

Clicking a keyword emits a dedicated search event. The app stores the requested keyword, navigates to Explore, and passes it as a prop. Explore copies the prop into its input and active keyword state, resets pagination, and immediately loads matching results.

### Hero Carousel

The large image carousel remains on the right side of the home hero.

It uses fixed, polished tourist-attraction slides chosen for demo stability. Each slide includes:

- Attraction name.
- Short Korean caption.
- High-quality fixed image URL.
- Search keyword.
- Optional preferred real place ID.

The carousel attempts to resolve preferred IDs through the existing place API. When a preferred ID cannot be loaded, clicking the slide navigates to Explore and runs its search keyword. This keeps the visual content fixed while maintaining a truthful, functional path into real data.

### Community Popular Posts

The current community samples are deleted and replaced by two new mock popular posts designed specifically for the home demo.

Each mock post includes:

- A reserved negative ID to avoid collision with backend post IDs.
- Category, title, author, excerpt, image, and popularity counts.
- Full mock detail content, including text and image cells compatible with the existing community detail presentation.

Clicking a home mock post opens the existing community detail view with the negative ID. The detail page resolves negative IDs from the mock-content model and skips the community API request. Positive IDs continue to use the API without behavioral changes.

The mock detail page remains read-only: like, edit, delete, and comment mutations are hidden or disabled for mock posts. Navigation back to the community list remains available.

## Component and State Changes

### Home Page

`HomePage.vue` becomes responsible for loading and presenting home content:

- Accepts the current access token for optional authenticated place data.
- Loads filtered tourist attractions on mount.
- Selects three random trending keywords on mount.
- Shows a loading state while the initial place request is pending.
- Uses fallback cards when the live request cannot fully populate the section.
- Emits `search-place` with a keyword.
- Emits `open-community-post` with a mock post ID.

The existing unrelated travel mock arrays are no longer imported by the home page.

### App Navigation

`App.vue` owns a `requestedExploreKeyword` state alongside `selectedPlace`.

- `openExploreSearch(keyword)` clears the selected place, stores the keyword, and switches to Explore.
- Home keyword, fallback hot-place, and unresolved hero clicks use this function.
- Explore receives `initial-keyword`.
- The keyword is cleared after Explore acknowledges it, preventing stale searches on later visits.
- Home mock community post clicks reuse `openCommunityPost(postId)`.

### Explore Page

`ExplorePage.vue` accepts an optional `initialKeyword`.

When it receives a non-empty keyword:

- It updates `keywordInput` and `keyword`.
- It clears selected place state.
- It resets the page to zero.
- It invokes the existing place-loading path.
- It emits an acknowledgement after consuming the request.

This is additive and does not alter manual search behavior.

### Community Detail Page

`CommunityDetailPage.vue` checks the shared mock-post resolver before calling the API.

- A matching negative ID is transformed into the detail page's existing view model.
- API calls for detail, comments, and mutations are skipped.
- Read-only mock state controls action visibility.
- Unknown negative IDs show the normal not-found state.

## Error and Empty States

- Place API failure: show fallback tourist-attraction cards; do not expose an error toast during the home demo.
- Partial live result: merge live cards first, then fallback cards without duplicate titles.
- Hero preferred place lookup failure: launch keyword search.
- Explore keyword search failure: preserve the existing Explore error handling.
- Unknown mock community ID: render the existing community-not-found experience.
- Image load failure: use the existing default/fallback image behavior.

## Backend Model Configuration

`Backend/src/main/resources/application.properties` changes:

```properties
ai.gms.model=${GMS_MODEL:gpt-5.5}
```

The environment variable continues to override the default. No claim is made that OpenAI's public API exposes this identifier; this project sends it through SSAFY GMS as explicitly requested.

## Testing

Frontend tests cover:

- The keyword selector returns three unique entries from the seven-entry catalog.
- Home requests places with the tourist-attraction category and without a sort value.
- Home renders live API results and opens their real place detail.
- Home fills with fallback attractions after API failure.
- Clicking a keyword emits the search keyword.
- App navigation passes a home keyword into Explore.
- Explore consumes the initial keyword and performs the corresponding API search.
- Clicking each mock popular post opens its matching mock detail.
- Mock community details do not call the API and do not expose mutation controls.

Backend verification covers:

- The configured default model value is `gpt-5.5`.
- Existing backend compilation and relevant AI tests remain green.

## Success Criteria

- Both repositories remain on `dev`.
- The home hot-place section is sourced from tourist-attraction API data when available.
- No review-based sorting is sent for the home hot-place request.
- Three of seven working keywords appear per home visit and immediately search Explore when clicked.
- The right hero stays visually fixed and always leads to a real place or a real search.
- Two newly written popular-post mocks open complete, read-only mock detail pages.
- API failure still leaves the home page visually complete and navigable.
- Frontend tests, type-check/build, and relevant backend verification pass.
