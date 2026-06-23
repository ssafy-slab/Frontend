# AI Schedule Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent chat-based AI schedule suggestions below the existing trip chat.

**Architecture:** A focused authenticated API module owns the AI endpoints and types. `ScheduleDetailPage.vue` owns UI state, reacts to the existing websocket, refreshes backend-owned suggestion lists after every mutation, and refreshes schedules after apply operations.

**Tech Stack:** Vue 3, TypeScript, Fetch API, WebSocket, Vitest, Vue Test Utils, Tailwind CSS.

---

### Task 1: AI Suggestion API

**Files:**
- Create: `src/entities/travel/api/tripAiApi.ts`
- Create: `src/entities/travel/api/tripAiApi.test.ts`

- [ ] Write failing tests for analysis, list, individual apply/reject, bulk apply/reject, auth headers, and status-specific errors.
- [ ] Run `pnpm vitest run src/entities/travel/api/tripAiApi.test.ts` and confirm failure because the module is missing.
- [ ] Implement the documented types and authenticated request functions.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: WebSocket Event Type

**Files:**
- Modify: `src/entities/chat/api/chatApi.ts`
- Modify: `src/entities/chat/api/chatApi.test.ts`

- [ ] Add a failing type/behavior test for the AI analysis completion event shape.
- [ ] Extend `ChatSocketMessage` with `AI_ANALYSIS_COMPLETED`.
- [ ] Run the focused chat API test.

### Task 3: Suggestion UI and State

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] Write failing tests for the initial empty state and initial pending suggestion fetch.
- [ ] Add the always-visible section, analysis request input, loading state, and status filters.
- [ ] Write failing tests for immediate analysis results and websocket-triggered refresh.
- [ ] Add analysis and websocket handlers.
- [ ] Write failing tests for individual apply/reject and nullable place navigation.
- [ ] Add card actions and refresh schedules after apply.
- [ ] Write failing tests for grouped bulk apply/reject.
- [ ] Add grouped run controls and per-operation disabled states.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run focused AI API and schedule page tests.
- [ ] Run the full Vitest suite.
- [ ] Run `pnpm type-check`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.

