# Refresh Token Authentication Design

## Goal

Use the backend HttpOnly refresh-token cookie to restore sessions, rotate access tokens, retry expired authenticated requests once, and invalidate refresh tokens during logout.

## Architecture

- Keep refresh tokens exclusively in the backend-managed `slap_refresh_token` cookie.
- Add a shared authenticated fetch wrapper that attaches the latest access token, sends credentials, coalesces concurrent refresh attempts, and retries one `401` response once.
- Let the auth store own the reactive login state while the shared wrapper publishes refreshed or cleared sessions through a small callback registration API.
- Restore the session before mounting Vue so protected-view routing starts with the correct authentication state.

## Request Rules

- Login, signup, OAuth ticket exchange, refresh, and logout send `credentials: 'include'`.
- Refresh and logout include `X-Refresh-Request: true`.
- A failed refresh clears local authentication and leaves the original request as unauthorized.
- Logout always clears local authentication, even if the server request fails.

