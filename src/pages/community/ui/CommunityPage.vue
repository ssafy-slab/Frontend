<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, Edit3, Globe2, Heart, MessageCircle, Search, SlidersHorizontal, User } from 'lucide-vue-next'
import {
  fetchCommunityPosts,
  resolveCommunityImageUrl,
  type CommunityPostSummary,
  type CommunitySort,
} from '@/entities/community/api/communityApi'
import { mockCommunityPosts, toMockCommunitySummary } from '@/entities/community/model/mockCommunity'

const props = defineProps<{
  accessToken?: string
}>()

const emit = defineEmits<{
  change: [view: string]
  openPost: [postId: number]
  saved: [message: string]
}>()

const categories = [
  { label: '전체', value: '' },
  { label: '장소 후기', value: 'PLACE_REVIEW' },
  { label: '여행 팁', value: 'TRAVEL_TIP' },
  { label: '질문', value: 'QUESTION' },
  { label: '자유게시판', value: 'FREE' },
]
const sortOptions: { label: string; value: CommunitySort }[] = [
  { label: '최신순', value: 'latest' },
  { label: '인기순', value: 'popular' },
  { label: '댓글순', value: 'comments' },
]

const selectedCategory = ref('')
const selectedSort = ref<CommunitySort>('latest')
const query = ref('')
const posts = ref<CommunityPostSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const sortOpen = ref(false)
const sortMenuRef = ref<HTMLElement | null>(null)
const fallbackImage = '/images/default-place.svg'

const selectedSortLabel = computed(() => sortOptions.find((option) => option.value === selectedSort.value)?.label ?? '최신순')

let requestId = 0

function getVisibleMockPosts() {
  const keyword = query.value.trim().toLowerCase()
  return mockCommunityPosts
    .filter((post) => !selectedCategory.value || post.category === selectedCategory.value)
    .filter((post) => {
      if (!keyword) return true
      return [post.title, post.content, post.authorNickname, post.placeName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
    .map(toMockCommunitySummary)
}

function sortCommunityPosts(items: CommunityPostSummary[]) {
  return [...items].sort((left, right) => {
    if (selectedSort.value === 'popular') return right.likeCount - left.likeCount
    if (selectedSort.value === 'comments') return right.commentCount - left.commentCount
    return String(right.createdAt).localeCompare(String(left.createdAt))
  })
}

async function loadPosts() {
  const currentRequestId = ++requestId
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await fetchCommunityPosts({
      category: selectedCategory.value || undefined,
      keyword: query.value.trim() || undefined,
      sort: selectedSort.value,
      page: 0,
      size: 30,
    }, props.accessToken)
    if (currentRequestId === requestId) {
      posts.value = sortCommunityPosts([...result, ...getVisibleMockPosts()])
    }
  } catch (error) {
    if (currentRequestId === requestId) {
      const fallbackPosts = getVisibleMockPosts()
      posts.value = fallbackPosts
      errorMessage.value = fallbackPosts.length ? '' : error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.'
    }
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label ?? value
}

function postImageUrl(imageUrl: string | null) {
  return imageUrl ? resolveCommunityImageUrl(imageUrl) : fallbackImage
}

function selectSort(value: CommunitySort) {
  selectedSort.value = value
  sortOpen.value = false
}

function closeSortMenu(event: MouseEvent) {
  if (!sortMenuRef.value?.contains(event.target as Node)) {
    sortOpen.value = false
  }
}

function openWrite() {
  if (!props.accessToken) {
    emit('saved', '로그인 후 글을 작성할 수 있습니다.')
    emit('change', 'login')
    return
  }
  emit('change', 'community-write')
}

watch([selectedCategory, selectedSort], loadPosts)
watch(query, () => {
  window.setTimeout(() => loadPosts(), 250)
})
onMounted(() => {
  document.addEventListener('mousedown', closeSortMenu)
  loadPosts()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeSortMenu)
})
</script>

<template>
  <section class="app-container py-6 md:py-8">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-black text-brand-500">Community</p>
        <h1 class="mt-1 flex items-center gap-2 text-2xl font-black text-slate-950">
          <Globe2 :size="28" class="text-brand-500" />
          여행기 & 플레이스
        </h1>
      </div>
      <button class="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm" @click="openWrite">
        <Edit3 :size="16" />
        글쓰기
      </button>
    </div>

    <section class="mb-5 rounded-xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
      <label class="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-brand-500 bg-slate-50 px-4 shadow-lg shadow-indigo-100/60">
        <Search :size="22" class="shrink-0 text-brand-500" />
        <input
          v-model="query"
          class="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-900 outline-none"
          placeholder="제목, 내용, 작성자, 여행지를 검색하세요"
        />
      </label>
      <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category.value"
            class="rounded-full px-3.5 py-2 text-sm font-black"
            :class="selectedCategory === category.value ? 'border border-brand-500 bg-brand-50 text-brand-500' : 'bg-slate-100 text-slate-950 hover:bg-brand-50'"
            @click="selectedCategory = category.value"
          >
            {{ category.label }}
          </button>
        </div>

        <div ref="sortMenuRef" class="relative w-fit">
          <button
            class="inline-flex h-10 min-w-32 items-center justify-between gap-2 rounded-full bg-slate-100 px-3.5 text-sm font-black text-slate-800 transition hover:bg-slate-200"
            type="button"
            :aria-expanded="sortOpen"
            @click="sortOpen = !sortOpen"
          >
            <span class="inline-flex items-center gap-2">
              <SlidersHorizontal :size="16" class="text-slate-600" />
              {{ selectedSortLabel }}
            </span>
            <ChevronDown :size="15" class="text-slate-500 transition" :class="sortOpen ? 'rotate-180' : ''" />
          </button>

          <Transition name="sort-menu">
            <div
              v-if="sortOpen"
              class="absolute right-0 z-30 mt-2 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl shadow-slate-200/70"
            >
              <button
                v-for="option in sortOptions"
                :key="option.value"
                class="block h-9 w-full px-3 text-left text-sm font-bold transition"
                :class="selectedSort === option.value ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'"
                type="button"
                @click="selectSort(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <p v-if="loading" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">
      {{ selectedSortLabel }} 게시글을 불러오는 중입니다.
    </p>
    <p v-else-if="errorMessage" class="rounded-xl bg-red-50 p-8 text-center text-sm font-bold text-red-600">
      {{ errorMessage }}
    </p>
    <div v-else-if="posts.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="post in posts"
        :key="post.postId"
        class="brand-card cursor-pointer overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-brand-500"
        @click="emit('openPost', post.postId)"
      >
        <img :src="postImageUrl(post.imageUrl)" :alt="post.title" class="h-48 w-full object-cover sm:h-52" />
        <div class="p-4">
          <p class="text-xs font-black text-brand-500">{{ categoryLabel(post.category) }}</p>
          <h2 class="mt-2 line-clamp-2 text-base font-black leading-snug text-slate-950">{{ post.title }}</h2>
          <p v-if="post.excerpt" class="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{{ post.excerpt }}</p>
          <p v-if="post.placeName" class="mt-3 text-xs font-black text-emerald-600"># {{ post.placeName }}</p>
          <div class="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
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
    </div>
    <p v-else class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">
      조건에 맞는 게시글이 없습니다.
    </p>
  </section>
</template>

<style scoped>
.sort-menu-enter-active,
.sort-menu-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.sort-menu-enter-from,
.sort-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
