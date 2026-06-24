# AI Analysis No-Result Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display an AI analysis no-result outcome in both the existing toast and the AI suggestion section without treating it as a system failure.

**Architecture:** Extend the REST and WebSocket response unions with the backend's no-result shapes. Keep the latest no-result notice as local state in `ScheduleDetailPage.vue`, derive safe Korean fallback text from the reason code, and clear that state when a new analysis begins or produces suggestions.

**Tech Stack:** Vue 3, TypeScript, Fetch API, WebSocket, Vitest, Vue Test Utils.

---

### Task 1: No-Result API and Socket Types

**Files:**
- Modify: `src/entities/travel/api/tripAiApi.ts`
- Modify: `src/entities/travel/api/tripAiApi.test.ts`
- Modify: `src/entities/chat/api/chatApi.ts`
- Modify: `src/entities/chat/api/chatApi.test.ts`

- [ ] **Step 1: Write failing type/response tests**

Add a manual analysis test that returns:

```ts
{
  analysisRunId: 12,
  triggerType: 'BUTTON',
  status: 'NO_RESULT',
  suggestions: [],
}
```

and assert `analyzeTripChat()` resolves with `status === 'NO_RESULT'` and an empty
suggestion list. Add a socket type fixture containing:

```ts
const message: ChatSocketMessage = {
  type: 'AI_ANALYSIS_NO_RESULT',
  tripId: 1,
  analysisRunId: 12,
  reasonCode: 'NO_SCHEDULE_CONTEXT',
  message: '메시지가 너무 적거나 일정 관련 내용이 없어 제안을 만들지 못했습니다.',
}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test -- src/entities/travel/api/tripAiApi.test.ts src/entities/chat/api/chatApi.test.ts
```

Expected: Type checking or assertions fail because the no-result response and
socket event are not represented.

- [ ] **Step 3: Add minimal response unions**

In `tripAiApi.ts`, introduce:

```ts
export type AiAnalysisStatus = 'SUCCEEDED' | 'NO_RESULT'

export type AiAnalysisResponse = {
  analysisRunId: number
  triggerType: AiAnalysisTriggerType
  status: AiAnalysisStatus
  suggestions: AiSuggestion[]
}
```

In `chatApi.ts`, add:

```ts
export type AiAnalysisNoResultReason =
  | 'INSUFFICIENT_MESSAGES'
  | 'NO_SCHEDULE_CONTEXT'

// Add to ChatSocketMessage:
{
  type: 'AI_ANALYSIS_NO_RESULT'
  tripId: number
  analysisRunId: number
  reasonCode: AiAnalysisNoResultReason
  message: string
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2. Expected: all focused API tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/entities/travel/api/tripAiApi.ts src/entities/travel/api/tripAiApi.test.ts src/entities/chat/api/chatApi.ts src/entities/chat/api/chatApi.test.ts
git commit -m "feat: support AI no-result responses"
```

### Task 2: Manual Analysis No-Result Feedback

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] **Step 1: Write a failing manual-analysis UI test**

Mock `analyzeTripChat()` with:

```ts
{
  analysisRunId: 12,
  triggerType: 'BUTTON',
  status: 'NO_RESULT',
  suggestions: [],
}
```

Click `analyze-trip-chat` and assert:

```ts
expect(wrapper.get('[data-testid="ai-no-result"]').text())
  .toContain('AI가 일정을 판단하지 못했습니다.')
expect(wrapper.emitted('saved')).toContainEqual([
  'AI가 일정을 판단하지 못했습니다.',
])
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm test -- src/pages/schedule/ui/ScheduleDetailPage.test.ts
```

Expected: FAIL because `ai-no-result` does not exist.

- [ ] **Step 3: Implement minimal manual no-result state**

Add page-local state:

```ts
type AiNoResultNotice = {
  analysisRunId: number
  reasonCode: AiAnalysisNoResultReason | null
  message: string
}

const aiNoResult = ref<AiNoResultNotice | null>(null)
const defaultAiNoResultMessage = 'AI가 일정을 판단하지 못했습니다.'
```

At the start of `requestAiAnalysis()`, clear `aiNoResult`. When
`result.status === 'NO_RESULT'`, set an empty suggestion list, clear the new
badge, store the default notice, and emit the same text through `saved`.
Successful results clear the notice and retain the current suggestion behavior.

Render the notice before the generic empty state:

```vue
<div
  v-else-if="aiNoResult"
  data-testid="ai-no-result"
  class="rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-900"
>
  <p class="font-black">AI가 일정을 판단하지 못했습니다.</p>
  <p v-if="aiNoResult.message !== defaultAiNoResultMessage" class="mt-1 font-semibold">
    {{ aiNoResult.message }}
  </p>
</div>
```

- [ ] **Step 4: Run the page tests and verify GREEN**

Run the command from Step 2. Expected: all page tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/schedule/ui/ScheduleDetailPage.vue src/pages/schedule/ui/ScheduleDetailPage.test.ts
git commit -m "feat: show manual AI no-result feedback"
```

### Task 3: WebSocket No-Result Feedback and Fallbacks

**Files:**
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.vue`
- Modify: `src/pages/schedule/ui/ScheduleDetailPage.test.ts`

- [ ] **Step 1: Write failing WebSocket behavior tests**

Add one current-trip test emitting:

```ts
{
  type: 'AI_ANALYSIS_NO_RESULT',
  tripId: 1,
  analysisRunId: 12,
  reasonCode: 'NO_SCHEDULE_CONTEXT',
  message: '메시지가 너무 적거나 일정 관련 내용이 없어 제안을 만들지 못했습니다.',
}
```

Assert pending suggestions are refreshed, the new-suggestion badge is absent,
the server message appears under `ai-no-result`, and `saved` emits that message.

Add a second test with `tripId: 2` and assert no refresh, notice, or toast occurs.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npm test -- src/pages/schedule/ui/ScheduleDetailPage.test.ts
```

Expected: FAIL because the socket handler ignores `AI_ANALYSIS_NO_RESULT`.

- [ ] **Step 3: Add fallback mapping and socket handling**

Add:

```ts
function aiNoResultMessage(
  reasonCode: AiAnalysisNoResultReason,
  message?: string,
) {
  if (message?.trim()) return message.trim()
  if (reasonCode === 'INSUFFICIENT_MESSAGES') {
    return '분석할 채팅 메시지가 충분하지 않습니다.'
  }
  return '채팅에서 일정 관련 내용을 찾지 못했습니다.'
}
```

Handle the current-trip event by selecting `PENDING`, clearing the new badge,
storing the notice, refreshing pending suggestions, and emitting the resolved
message. Return immediately so the event cannot enter the error flow.

- [ ] **Step 4: Run page tests and verify GREEN**

Run the command from Step 2. Expected: all page tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/schedule/ui/ScheduleDetailPage.vue src/pages/schedule/ui/ScheduleDetailPage.test.ts
git commit -m "feat: handle AI no-result socket events"
```

### Task 4: Full Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run all tests**

```powershell
npm test
```

Expected: all Vitest suites pass with zero failures.

- [ ] **Step 2: Run type checking and production build**

```powershell
npm run build
```

Expected: Vue TypeScript checking and Vite production build both exit with code
0.

- [ ] **Step 3: Inspect the final diff**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and only the intended implementation files are
changed.
