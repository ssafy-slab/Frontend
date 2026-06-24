# Team AI Vote Completion Design

## Goal

Keep a team AI suggestion vote open until every accepted trip member has voted, then let an owner or editor close it automatically and refresh all affected UI state.

## Architecture

- Extend the existing `VoteResponse` contract in `tripVoteApi.ts`.
- Preserve HTTP status and backend response text in a typed vote request error so `409 Conflict` can be classified.
- Keep vote state in `ScheduleDetailPage.vue`; do not add a store or polling mechanism.
- Use the ballot response as the immediate source of truth. When it reports `OPEN`, `allMembersVoted: true`, and the user can edit the trip, call the existing close endpoint through one guarded close-and-refresh function.

## User Interface

- Show `투표 완료 {votedMemberCount}/{eligibleVoterCount}` in the AI vote modal.
- Disable vote choices and close actions while a ballot or close request is running.
- Disable manual close while `allMembersVoted` is false.
- Show `모든 팀원이 투표하면 종료됩니다.` while waiting for remaining members.
- Keep the modal open after closure and display the refreshed `CLOSED` vote state.

## Conflict Handling

- If close returns a 409 indicating all members have not voted, reload the vote and keep it open without a failure toast.
- If close returns an already-closed 409, reload the vote. If it is now `CLOSED`, treat the operation as successful and refresh AI suggestions and schedules.
- Other 409 responses remain schedule/state conflicts: reload the vote, keep it open, and show the existing conflict message.

## Refresh Contract

After a successful or concurrently completed close:

1. Reload the vote detail.
2. Reload the current AI suggestion status list.
3. Reload trip schedules.

## Testing

- API tests cover the new fields and typed 409 response details.
- Component tests cover progress display, disabled close, automatic close, non-editor behavior, duplicate blocking, already-closed recovery, pre-completion recovery, and schedule conflict behavior.

