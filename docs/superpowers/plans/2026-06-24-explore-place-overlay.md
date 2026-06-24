# Explore Place Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Explore's separate place-detail navigation with a map overlay panel.

**Architecture:** Keep selection and detail state inside `ExplorePage`. A selected list item or marker opens a scrollable panel over the unchanged map; category filters hide while open, while the all-pins action remains in the map toolbar.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Overlay interaction

**Files:**
- Modify: `src/pages/explore/ui/ExplorePage.vue`
- Test: `src/pages/explore/ui/ExplorePage.test.ts`

- [ ] Add a failing test proving a place opens an overlay without emitting `openPlace`.
- [ ] Add assertions that category filters hide and the all-pins action remains available.
- [ ] Implement the overlay, close action, and all-pins reset.
- [ ] Run `pnpm test -- src/pages/explore/ui/ExplorePage.test.ts`.
- [ ] Run `pnpm build`.
