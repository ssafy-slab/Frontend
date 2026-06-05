<script setup lang="ts">
import { computed, ref } from 'vue'
import { Edit3, Globe2, Heart, Search, SlidersHorizontal, User } from 'lucide-vue-next'
import type { CommunityPost } from '@/entities/travel/model/travel'

const props = defineProps<{
  posts: CommunityPost[]
}>()

const emit = defineEmits<{
  change: [view: string]
}>()

const filters = ['전체', '베스트 일정', '포토 리뷰', '여행 꿀팁']
const selectedFilter = ref('전체')
const query = ref('')
const likedIds = ref(new Set<number>())

const visiblePosts = computed(() => {
  return props.posts.filter((post) => {
    const matchesFilter = selectedFilter.value === '전체' || post.category === selectedFilter.value
    const keyword = query.value.trim()
    const matchesQuery = !keyword || post.title.includes(keyword) || post.author.includes(keyword) || post.excerpt?.includes(keyword)
    return matchesFilter && matchesQuery
  })
})

function toggleLike(post: CommunityPost) {
  const next = new Set(likedIds.value)
  if (next.has(post.id)) next.delete(post.id)
  else next.add(post.id)
  likedIds.value = next
}
</script>

<template>
  <section class="app-container py-6 md:py-8">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="flex items-center gap-2 text-2xl font-black text-slate-950">
        <Globe2 :size="28" class="text-brand-500" />
        여행기 & 핫플레이스
      </h1>
      <button class="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm" @click="emit('change', 'community-write')">
        <Edit3 :size="16" />
        글쓰기
      </button>
    </div>

    <section class="mb-5 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
      <label class="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-brand-500 bg-slate-50 px-4 shadow-lg shadow-indigo-100/60 sm:min-h-16 sm:px-5">
        <Search :size="24" class="shrink-0 text-brand-500" />
        <input
          v-model="query"
          class="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-900 outline-none sm:text-lg"
          placeholder="궁금한 여행 후기, 장소, 작성자를 검색하세요"
        />
      </label>
      <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in filters"
            :key="filter"
            class="rounded-full px-3.5 py-2 text-sm font-black"
            :class="selectedFilter === filter ? 'border border-brand-500 bg-brand-50 text-brand-500' : 'bg-slate-100 text-slate-950 hover:bg-brand-50'"
            @click="selectedFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
        <button class="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-black text-slate-700">
          <SlidersHorizontal :size="16" />
          최신순
        </button>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="post in visiblePosts"
        :key="post.id"
        class="brand-card cursor-pointer overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-brand-500"
        @click="emit('change', 'community-detail')"
      >
        <img :src="post.image" :alt="post.title" class="h-36 w-full object-cover" />
        <div class="p-4">
          <p class="text-xs font-black" :class="post.category === '포토 리뷰' ? 'text-emerald-500' : 'text-brand-500'">
            {{ post.category }}
          </p>
          <h2 class="mt-2 text-base font-black leading-snug text-slate-950">{{ post.title }}</h2>
          <p v-if="post.excerpt" class="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{{ post.excerpt }}</p>
          <div class="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
            <span class="flex items-center gap-1"><User :size="14" /> {{ post.author }}</span>
            <button
              class="like-button flex items-center gap-1 rounded-full px-2 py-1 transition"
              :class="likedIds.has(post.id) ? 'liked bg-red-50 text-red-500' : 'hover:bg-slate-100 hover:text-red-500'"
              @click.stop="toggleLike(post)"
            >
              <Heart :size="14" :fill="likedIds.has(post.id) ? 'currentColor' : 'none'" />
              {{ post.likes + (likedIds.has(post.id) ? 1 : 0) }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-if="visiblePosts.length === 0" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">
      조건에 맞는 글이 없습니다.
    </p>
  </section>
</template>
