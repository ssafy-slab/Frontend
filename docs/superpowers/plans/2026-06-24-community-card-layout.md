# Community Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every community list card an identical structure and show every thumbnail in the same edge-to-edge image frame without gray letterboxing.

**Architecture:** Keep the change local to the existing community list component. Add a focused component test for the CSS layout contract, then update Tailwind utility classes so the card, body, optional content rows, footer, and image frame have stable dimensions and alignment.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS utilities, Vitest, Vue Test Utils

---

## File Structure

- Create `src/pages/community/ui/CommunityPage.test.ts`: mounts the list with a deterministic API post and verifies the card/image layout contract.
- Modify `src/pages/community/ui/CommunityPage.vue`: applies the fixed thumbnail frame, edge-to-edge crop, equal-height card body, reserved optional rows, and bottom-aligned footer.

### Task 1: Lock the card layout contract with a component test

**Files:**
- Create: `src/pages/community/ui/CommunityPage.test.ts`
- Test: `src/pages/community/ui/CommunityPage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommunityPage from './CommunityPage.vue'

const { fetchCommunityPosts } = vi.hoisted(() => ({
  fetchCommunityPosts: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    fetchCommunityPosts,
  }
})

vi.mock('@/entities/community/model/mockCommunity', () => ({
  mockCommunityPosts: [],
  toMockCommunitySummary: vi.fn(),
}))

describe('CommunityPage card layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCommunityPosts.mockResolvedValue([{
      postId: 1,
      category: 'TRAVEL_TIP',
      title: 'Uniform card',
      excerpt: null,
      imageUrl: 'https://example.com/card.jpg',
      placeId: null,
      placeName: null,
      authorNickname: 'traveler',
      viewCount: 1,
      likeCount: 2,
      commentCount: 3,
      mine: false,
      createdAt: '2026-06-24T00:00:00',
    }])
  })

  it('uses a fixed edge-to-edge image frame and bottom-aligned card footer', async () => {
    const wrapper = mount(CommunityPage)
    await flushPromises()

    const card = wrapper.get('[data-testid="community-card"]')
    const imageFrame = wrapper.get('[data-testid="community-card-image"]')
    const image = imageFrame.get('img')
    const body = wrapper.get('[data-testid="community-card-body"]')
    const footer = wrapper.get('[data-testid="community-card-footer"]')

    expect(card.classes()).toEqual(expect.arrayContaining(['flex', 'h-full', 'flex-col']))
    expect(imageFrame.classes()).toEqual(expect.arrayContaining(['h-52', 'overflow-hidden']))
    expect(imageFrame.classes()).not.toContain('bg-slate-100')
    expect(image.classes()).toEqual(expect.arrayContaining(['h-full', 'w-full', 'object-cover']))
    expect(image.classes()).not.toContain('object-contain')
    expect(body.classes()).toEqual(expect.arrayContaining(['flex', 'flex-1', 'flex-col']))
    expect(footer.classes()).toContain('mt-auto')
    expect(wrapper.get('[data-testid="community-card-excerpt"]').classes()).toContain('min-h-10')
    expect(wrapper.get('[data-testid="community-card-place"]').classes()).toContain('min-h-4')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
pnpm test -- src/pages/community/ui/CommunityPage.test.ts
```

Expected: FAIL because the card layout test IDs and required fixed layout classes do not exist yet.

- [ ] **Step 3: Commit the failing test**

```powershell
git add src/pages/community/ui/CommunityPage.test.ts
git commit -m "test: define community card layout"
```

### Task 2: Apply the unified card and image layout

**Files:**
- Modify: `src/pages/community/ui/CommunityPage.vue`
- Test: `src/pages/community/ui/CommunityPage.test.ts`

- [ ] **Step 1: Update the community card markup**

Replace the list card markup with the following layout classes and stable optional rows:

```vue
<article
  v-for="post in posts"
  :key="post.postId"
  data-testid="community-card"
  class="brand-card flex h-full cursor-pointer flex-col overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-brand-500"
  @click="emit('openPost', post.postId)"
>
  <div data-testid="community-card-image" class="h-52 w-full shrink-0 overflow-hidden">
    <img :src="postImageUrl(post.imageUrl)" :alt="post.title" class="h-full w-full object-cover" />
  </div>
  <div data-testid="community-card-body" class="flex flex-1 flex-col p-4">
    <p class="text-xs font-black text-brand-500">{{ categoryLabel(post.category) }}</p>
    <h2 class="mt-2 line-clamp-2 min-h-11 text-base font-black leading-snug text-slate-950">{{ post.title }}</h2>
    <p data-testid="community-card-excerpt" class="mt-2 line-clamp-2 min-h-10 text-xs font-semibold text-slate-500">
      {{ post.excerpt || '' }}
    </p>
    <p data-testid="community-card-place" class="mt-3 min-h-4 text-xs font-black text-emerald-600">
      {{ post.placeName ? `# ${post.placeName}` : '' }}
    </p>
    <div data-testid="community-card-footer" class="mt-auto flex items-center justify-between pt-4 text-xs font-bold text-slate-500">
      <span class="flex min-w-0 items-center gap-1">
        <User :size="14" />
        <span class="truncate">{{ post.authorNickname }}</span>
      </span>
      <span class="flex items-center gap-3">
        <span class="flex items-center gap-1"><Heart :size="14" /> {{ post.likeCount }}</span>
        <span class="flex items-center gap-1"><MessageCircle :size="14" /> {{ post.commentCount }}</span>
      </span>
    </div>
  </div>
</article>
```

- [ ] **Step 2: Run the focused test and verify success**

Run:

```powershell
pnpm test -- src/pages/community/ui/CommunityPage.test.ts
```

Expected: PASS with one community card layout test.

- [ ] **Step 3: Run related community tests**

Run:

```powershell
pnpm test -- src/pages/community/ui
```

Expected: All community page, detail, and editor tests pass.

- [ ] **Step 4: Run the production build**

Run:

```powershell
pnpm build
```

Expected: Type checking and Vite production build both complete successfully.

- [ ] **Step 5: Commit the implementation**

```powershell
git add src/pages/community/ui/CommunityPage.vue src/pages/community/ui/CommunityPage.test.ts
git commit -m "fix: unify community card layout"
```
