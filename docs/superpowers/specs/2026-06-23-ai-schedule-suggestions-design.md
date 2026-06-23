# AI Schedule Suggestions Design

## Goal

Show chat-derived AI schedule suggestions directly below the trip chat, persist them through the backend API, and let users apply or reject individual suggestions or an entire analysis run.

## Architecture

- Add `src/entities/travel/api/tripAiApi.ts` for AI analysis and suggestion REST APIs.
- Extend the existing chat socket event union with `AI_ANALYSIS_COMPLETED`.
- Keep suggestion UI state local to `ScheduleDetailPage.vue`, matching the page's existing schedule, checklist, member, and chat state pattern.
- Re-fetch suggestions after analysis, websocket completion, apply, reject, and bulk actions. Re-fetch schedules after apply actions.

## User Interface

- Render an always-visible `AI 일정 제안` section immediately below the chat panel.
- Show `아직 도착한 AI 일정 제안이 없습니다.` when the selected status has no suggestions.
- Provide an additional-request input and an `AI 일정 분석` button.
- Show status filters for `PENDING`, `APPLIED`, and `REJECTED`.
- Group cards by `analysisRunId`; pending groups expose bulk apply and reject controls.
- Each card shows date, time, title, place name, region hint, summary, reason, and status.
- Enable place detail navigation only when `suggestedPlaceId` is present. Otherwise show a DB-unlinked informational label while keeping schedule application available.
- Use the existing `saved` event for success and error toast messages.

## State and Concurrency

- Track suggestions, selected status, loading, analysis, per-card apply/reject IDs, bulk processing run ID, new-suggestion badge, and error separately.
- Disable only the operation currently in progress. Applying or rejecting one card does not block unrelated cards.
- Ignore websocket analysis events for other trips.

## Error Handling

- Translate documented HTTP statuses into concise Korean user messages in the API module.
- On `409`, refresh suggestions and schedules so the UI follows server state.
- Keep the last successfully loaded list visible when a mutation fails.

## Testing

- API tests verify paths, methods, authorization, optional analysis payload, and error translation.
- page tests verify the empty state, immediate analysis results, websocket refresh, individual actions, bulk actions, schedule refresh, status filters, and nullable place IDs.

