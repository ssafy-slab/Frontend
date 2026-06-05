<script setup lang="ts">
import { reactive } from 'vue'
import { ArrowLeft, ChevronDown, ImagePlus, Send } from 'lucide-vue-next'
import type { CommunityPost } from '@/entities/travel/model/travel'

const emit = defineEmits<{
  change: [view: string]
  createPost: [post: CommunityPost]
}>()

const form = reactive({
  category: '여행 꿀팁',
  title: '',
  excerpt: '',
})

function submitPost() {
  if (!form.title.trim()) return

  emit('createPost', {
    id: Date.now(),
    category: form.category,
    title: form.title.trim(),
    author: '나',
    likes: 0,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    excerpt: form.excerpt.trim() || '새로 작성한 여행 이야기입니다.',
  })
}
</script>

<template>
  <section class="app-container max-w-3xl py-6 md:py-8">
    <button class="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'community')">
      <ArrowLeft :size="16" />
      커뮤니티로 돌아가기
    </button>

    <article class="brand-card rounded-2xl p-5 sm:p-7">
      <div class="mb-6">
        <h1 class="text-2xl font-black text-slate-950">커뮤니티 글쓰기</h1>
        <p class="mt-2 text-sm font-semibold text-slate-500">여행 일정, 핫플레이스, 팁을 다른 사용자와 공유해보세요.</p>
      </div>

      <div class="grid gap-5">
        <label class="block">
          <span class="mb-2 block text-sm font-black text-slate-950">카테고리</span>
          <span class="relative inline-flex w-full items-center">
            <select v-model="form.category" class="brand-input h-11 w-full appearance-none rounded-lg px-3 pr-9 text-sm outline-none">
              <option>베스트 일정</option>
              <option>포토 리뷰</option>
              <option>여행 꿀팁</option>
            </select>
            <ChevronDown :size="17" class="pointer-events-none absolute right-3 text-slate-600" />
          </span>
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-black text-slate-950">제목</span>
          <input v-model="form.title" class="brand-input h-11 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 제주 렌터카 체크 포인트" />
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-black text-slate-950">내용</span>
          <textarea v-model="form.excerpt" class="brand-input min-h-52 w-full resize-none rounded-lg px-3 py-3 text-sm leading-6 outline-none" placeholder="공유하고 싶은 여행 이야기를 적어주세요." />
        </label>

        <button class="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600">
          <ImagePlus :size="16" />
          대표 이미지 데모 적용
        </button>
      </div>

      <div class="mt-7 flex justify-end gap-2">
        <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="emit('change', 'community')">
          취소
        </button>
        <button class="btn-primary inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm" @click="submitPost">
          <Send :size="16" />
          등록하기
        </button>
      </div>
    </article>
  </section>
</template>
