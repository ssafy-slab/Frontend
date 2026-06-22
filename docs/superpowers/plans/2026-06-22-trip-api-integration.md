# Trip API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the travel planning screens to the documented Trip API while preserving UI-only features that are not in the API document.

**Architecture:** Add a focused Trip API module that maps backend trip DTOs into the existing `Trip` view model. Update schedule list and detail pages to call documented endpoints for trips, invite codes, joins, and schedule deletion only.

**Tech Stack:** Vue 3, TypeScript, Pinia auth token, Vitest, Fetch API.

---

### Task 1: Trip API Module

**Files:**
- Create: `src/entities/travel/api/tripApi.ts`
- Create: `src/entities/travel/api/tripApi.test.ts`
- Modify: `src/entities/travel/model/travel.ts`

- [ ] Write tests for fetching, creating, deleting, invite code creation, join, and mapping `TripListResponse.members`.
- [ ] Run `pnpm vitest run src/entities/travel/api/tripApi.test.ts` and verify the tests fail because the module does not exist.
- [ ] Implement the API module with authenticated `fetch` calls and DTO-to-view mapping.
- [ ] Run the same test and verify it passes.

### Task 2: Schedule List Screen

**Files:**
- Modify: `src/pages/schedule/ui/SchedulePage.vue`
- Modify: `src/app/App.vue`

- [ ] Load trips from `GET /api/trips` when an access token exists.
- [ ] Use `POST /api/trips` for new trips and `DELETE /api/trips/{tripId}` for deletion.
- [ ] Add invite-code join flow using `POST /api/trips/join`.
- [ ] Keep local mock trips when unauthenticated or when API loading fails.
- [ ] Pass `accessToken` from `App.vue`.

### Task 3: Schedule Detail Screen

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/app/App.vue`

- [ ] Pass `accessToken` into the detail page.
- [ ] Use `POST /api/trips/{tripId}/invite-code` for TEAM trip invite code creation.
- [ ] Use `DELETE /api/trips/{tripId}/schedules/{scheduleItemId}` for schedule deletion when the item has an API id.
- [ ] Preserve chat, voting, checklist, and member-management UI that is not documented in the Trip API.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run the focused trip API test.
- [ ] Run `pnpm type-check`.
- [ ] Run `pnpm build`.
