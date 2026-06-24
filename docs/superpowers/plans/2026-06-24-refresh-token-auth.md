# Refresh Token Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the backend HttpOnly refresh-token cookie with startup restoration, automatic access-token rotation, one-time request retry, and server logout.

**Architecture:** A shared `authenticatedFetch` module owns refresh concurrency and retry mechanics. The Pinia auth store registers session callbacks, restores before app mount, and exposes async logout while existing domain API modules reuse the wrapper.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, Fetch API

---

### Task 1: Refresh API contract

**Files:**
- Modify: `src/entities/auth/api/authApi.test.ts`
- Modify: `src/entities/auth/api/authApi.ts`
- Modify: `src/entities/auth/api/oauthCallback.test.ts`
- Modify: `src/entities/auth/api/oauthCallback.ts`

- [ ] Add failing tests proving login/OAuth include credentials and refresh/logout include credentials plus `X-Refresh-Request`.
- [ ] Run the auth API tests and confirm failures are caused by missing cookie options/functions.
- [ ] Implement `refreshSession` and `logoutSession`, then make login/signup/OAuth cookie-aware.
- [ ] Run the auth API tests and confirm they pass.

### Task 2: Authenticated request retry

**Files:**
- Create: `src/shared/lib/authenticatedFetch.test.ts`
- Create: `src/shared/lib/authenticatedFetch.ts`

- [ ] Add failing tests for one-time retry, rotated Authorization headers, concurrent refresh coalescing, and failed-refresh session clearing.
- [ ] Run the focused test and confirm the wrapper is missing.
- [ ] Implement callback registration, refresh coalescing, credentials, and one retry.
- [ ] Run the focused test and confirm it passes.

### Task 3: Store lifecycle and startup restoration

**Files:**
- Create: `src/stores/auth.test.ts`
- Modify: `src/stores/auth.ts`
- Modify: `src/main.ts`
- Modify: `src/app/App.vue`

- [ ] Add failing store tests for restore success/failure and logout local cleanup.
- [ ] Implement wrapper callback registration, `restoreSession`, and async server logout.
- [ ] Restore the store before Vue mount and await logout in the app.
- [ ] Run store/auth tests.

### Task 4: Domain API migration

**Files:**
- Modify: `src/entities/auth/api/authApi.ts`
- Modify: `src/entities/chat/api/chatApi.ts`
- Modify: `src/entities/community/api/communityApi.ts`
- Modify: `src/entities/review/api/reviewApi.ts`
- Modify: `src/entities/travel/api/tripApi.ts`
- Modify: `src/entities/travel/api/tripAiApi.ts`
- Modify: `src/entities/travel/api/tripVoteApi.ts`

- [ ] Replace authenticated direct fetch calls with `authenticatedFetch`.
- [ ] Preserve existing endpoint-specific error messages and response parsing.
- [ ] Run all affected API tests.

### Task 5: Verification

**Files:**
- Verify all modified files.

- [ ] Run the full Vitest suite.
- [ ] Run Vue TypeScript checking.
- [ ] Run production build.
- [ ] Run Oxlint and ESLint.

