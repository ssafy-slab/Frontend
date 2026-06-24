# AI Analysis No-Result UI Design

## Goal

When AI analysis cannot produce schedule suggestions, clearly tell the user that
the analysis completed without a result. Keep this outcome separate from system
failures and their existing retry flow.

## Supported Responses

- WebSocket event:
  - `type`: `AI_ANALYSIS_NO_RESULT`
  - `tripId`: trip receiving the result
  - `analysisRunId`: completed analysis run
  - `reasonCode`: `INSUFFICIENT_MESSAGES` or `NO_SCHEDULE_CONTEXT`
  - `message`: user-facing explanation from the server
- Manual analysis response:
  - `status`: `NO_RESULT`
  - `suggestions`: empty array

The existing successful response with suggestions and all existing failure
responses retain their current behavior.

## UI Behavior

- Show the no-result message through the existing `saved` toast event so users
  receive immediate feedback.
- Persist the same message in the AI suggestion section, replacing the generic
  empty-suggestion text until another analysis starts, succeeds, or the trip is
  reset.
- Prefix the server message with `AI가 일정을 판단하지 못했습니다.` when a
  concise heading is needed in the section.
- If the server message is missing, map the reason code to a Korean fallback:
  - `INSUFFICIENT_MESSAGES`: `분석할 채팅 메시지가 충분하지 않습니다.`
  - `NO_SCHEDULE_CONTEXT`: `채팅에서 일정 관련 내용을 찾지 못했습니다.`
- Do not display the no-result state as an error and do not trigger the existing
  failure or retry behavior.

## State and Event Handling

- Extend `ChatSocketMessage` with the `AI_ANALYSIS_NO_RESULT` event.
- Extend `AiAnalysisResponse` to support `SUCCEEDED | NO_RESULT`.
- Add page-local no-result state containing the analysis run ID, reason code,
  and display message.
- Ignore WebSocket no-result events for other trips.
- On a current-trip no-result event:
  - select the pending suggestion filter;
  - clear the new-suggestion badge;
  - store and display the no-result message;
  - refresh pending suggestions to keep the UI synchronized;
  - emit the message through the existing toast.
- On manual `NO_RESULT`, clear suggestions and store and display the no-result
  message.
- Clear the no-result state when a new analysis starts or when a successful
  analysis with suggestions arrives.

## Testing

- API and type tests cover the `NO_RESULT` manual response shape.
- Page tests verify manual no-result section text and toast feedback.
- Page tests verify WebSocket no-result handling for the current trip.
- Page tests verify no-result events for another trip are ignored.
- Existing success, failure, suggestion refresh, and retry tests must continue
  to pass.
