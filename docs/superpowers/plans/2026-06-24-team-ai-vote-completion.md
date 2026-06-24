# Team AI Vote Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep team AI suggestion votes open until all accepted members vote and safely auto-close them for owners and editors.

**Architecture:** Extend the existing vote API type and error boundary, then centralize vote closing and refresh behavior in `ScheduleDetailPage.vue`. Reuse local component state, existing API modules, toast events, and modal styling.

**Tech Stack:** Vue 3, TypeScript, Fetch API, Vitest, Vue Test Utils.

---

### Task 1: Vote API Contract and Conflict Details

**Files:**
- Modify: `src/entities/travel/api/tripVoteApi.ts`
- Modify: `src/entities/travel/api/tripVoteApi.test.ts`

- [ ] Add failing tests for participation fields and a typed 409 error containing the backend response message.
- [ ] Run `vitest` for `tripVoteApi.test.ts` and confirm the new assertions fail.
- [ ] Add the four response fields and `VoteRequestError`.
- [ ] Re-run the focused API test.

### Task 2: Participation UI

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] Add a failing test for `투표 완료 n/m`, the waiting message, and disabled close.
- [ ] Render participation progress and disable interactions during ballot/close operations.
- [ ] Re-run the focused component test.

### Task 3: Automatic Close and Refresh

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] Add failing tests for owner/editor automatic close and non-editor no-auto-close.
- [ ] Introduce a guarded `closeVoteAndRefresh` function and call it from the ballot response path.
- [ ] Verify vote detail, AI suggestions, and schedules reload after closure.

### Task 4: 409 Recovery

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] Add failing tests for all-members-required, already-closed, and schedule-conflict responses.
- [ ] Reload vote detail after close conflicts and classify the result without false completion.
- [ ] Re-run focused tests.

### Task 5: Verification

**Files:**
- No new files.

- [ ] Run the complete test suite.
- [ ] Run TypeScript checking.
- [ ] Run Oxlint and ESLint.
- [ ] Run the production build.

