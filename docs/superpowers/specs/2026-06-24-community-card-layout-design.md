# Community Card Layout Design

## Goal

Make every community list card use the same visual structure and display every thumbnail in an equally sized frame without gray letterboxing.

## Scope

This change applies to the community post list in `CommunityPage.vue`. Community post detail images keep their current uncropped presentation because the detail view is intended to show the full uploaded image rather than a uniform thumbnail.

## Card Layout

Each card uses a full-height vertical flex layout with three stable sections:

1. A fixed-height thumbnail frame.
2. A flexible content section containing category, title, excerpt, and place.
3. A footer containing author, like count, and comment count.

The grid stretches cards in the same row to equal height. The card body fills the available height, and the footer is anchored to the bottom. Title and excerpt remain clamped to two lines. Space is reserved for optional excerpt and place rows so cards do not shift when those values are missing.

## Image Treatment

The thumbnail frame is `208px` high at all supported card breakpoints. The image fills both dimensions using `object-cover`, removing the current gray side or top/bottom space caused by `object-contain`. The existing fallback image remains in use when a post has no image.

Cropping is centered by default. No gray background is exposed behind successfully loaded images.

## Responsive Behavior

The existing one-, two-, and three-column grid breakpoints remain unchanged. Thumbnail height and internal card spacing stay consistent across breakpoints so cards retain the same rhythm as columns change.

## Verification

Add component tests that verify:

- Cards use a full-height flex layout.
- Thumbnail frames have one fixed height.
- Thumbnail images use `object-cover` and not `object-contain`.
- Card bodies reserve stable content rows and keep the footer at the bottom.

Run the focused community page tests, then the frontend test suite or build check.
