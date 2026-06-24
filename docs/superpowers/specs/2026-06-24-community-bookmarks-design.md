# Community Bookmarks Design

## Goal

Add a bookmark action to community list/detail views and a bookmarked-posts tab to the profile without mixing bookmark state with likes.

## Design

- Extend `CommunityPostSummary` with required `bookmarkedByMe`.
- Add bookmark create/delete and my-bookmarks fetch functions to the existing community API module.
- Use optimistic local updates on list/detail pages, guarded by a per-post or page-level pending state. Roll back and emit the existing `saved` toast event on failure.
- Redirect unauthenticated bookmark clicks to the existing login view after showing a login notice.
- Add a profile bookmarks tab. Fetch page 0 when the profile mounts, use the existing token and button pagination style, and remove an unbookmarked item immediately.
- Reuse the existing community detail navigation by emitting `openPost` from the profile and wiring it in `App.vue`.

## Error and Pagination Behavior

- Bookmark mutations accept only `204 No Content`; failures preserve the previous UI state.
- Profile requests use `page` and `size=20`. Previous/next controls are derived from the current page and whether the returned page is full because the API returns a plain array.
- A failed profile fetch keeps the bookmarks tab open and shows the API error.

