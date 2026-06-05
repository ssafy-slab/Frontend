<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Heart, Map, User } from 'lucide-vue-next'

const emit = defineEmits<{
  change: [view: string]
}>()

const liked = ref(false)
</script>

<template>
  <section class="app-container max-w-[880px] py-8">
    <button class="mb-5 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'community')">← 목록으로 돌아가기</button>

    <article class="brand-card rounded-2xl p-5 sm:p-8">
      <span class="inline-flex rounded-full bg-brand-500 px-3 py-1.5 text-xs font-black text-white">베스트 일정</span>
      <h1 class="mt-5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        부모님 모시고 가기 좋은 제주 3박 4일 코스 공유합니다!
      </h1>
      <div class="mt-5 flex flex-col gap-2 border-b border-slate-200 pb-6 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span class="flex items-center gap-2"><User :size="16" /> 트래블러 · 2시간 전</span>
        <span>조회수 1,420 · 좋아요 {{ liked ? 125 : 124 }}</span>
      </div>

      <div class="mt-6 space-y-6 text-base font-semibold leading-8 text-slate-700">
        <p>
          안녕하세요! 이번 연휴에 부모님을 모시고 제주도에 다녀왔습니다.
          많이 걷지 않고 편안하게 풍경을 즐길 수 있는 코스 위주로 일정을 짰는데 부모님께서 정말 만족하셨어요.
        </p>
        <img
          src="https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80"
          alt="서울 야경"
          class="h-72 w-full rounded-xl object-cover sm:h-[420px]"
        />
        <p>
          특히 2일차에 방문했던 <strong class="font-black text-slate-950">비자림</strong>은 숲길이 평탄해서 걷기 너무 좋았습니다.
          주변 식당도 깔끔한 곳이 많으니 제 일정표 참고하셔서 즐거운 가족 여행 되시길 바랍니다.
        </p>

        <div class="grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4 sm:grid-cols-[96px_1fr]">
          <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80" alt="비자림" class="size-24 rounded-lg object-cover" />
          <div>
            <h3 class="font-black text-slate-950">천년의 숲 비자림</h3>
            <p class="mt-2 text-sm text-slate-500">제주시 구좌읍 비자숲길 55</p>
            <button class="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-slate-950">
              <Map :size="15" />
              지도 보기
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button
          class="like-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition"
          :class="liked ? 'liked bg-red-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'"
          @click="liked = !liked"
        >
          <Heart :size="16" :fill="liked ? 'currentColor' : 'none'" />
          좋아요 {{ liked ? 125 : 124 }}
        </button>
        <button class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800">
          <Copy :size="16" />
          내 일정으로 복사하기
        </button>
      </div>

      <section class="mt-8 border-t border-slate-200 pt-8">
        <h2 class="mb-5 text-lg font-black text-slate-950">댓글 <span class="text-brand-500">12</span></h2>
        <div class="mb-5 flex items-center gap-3">
          <span class="grid size-9 place-items-center rounded-full bg-slate-300 text-sm font-black text-slate-600">Me</span>
          <input class="brand-input h-11 min-w-0 flex-1 rounded-lg px-4 text-sm outline-none" placeholder="칭찬과 격려의 댓글을 남겨주세요." />
          <button class="h-11 rounded-lg bg-brand-500 px-5 text-sm font-black text-white">등록</button>
        </div>
        <div class="space-y-4">
          <div class="flex gap-3">
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">U</span>
            <div class="flex-1 rounded-lg bg-slate-100 p-4">
              <div class="mb-2 flex justify-between text-sm font-bold text-slate-500">
                <strong class="text-slate-950">바다바라기</strong>
                <span>1시간 전</span>
              </div>
              <p class="text-sm text-slate-700">좋은 정보 감사합니다. 혹시 비자림 갈 때 주말 주차는 붐비지 않았나요?</p>
            </div>
          </div>
          <div class="ml-8 flex gap-3 sm:ml-12">
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">M</span>
            <div class="flex-1 rounded-lg border-2 border-brand-500 bg-white p-4">
              <div class="mb-2 flex justify-between text-sm font-bold text-slate-500">
                <strong class="text-slate-950">트래블러 <span class="rounded bg-brand-500 px-2 py-1 text-xs text-white">작성자</span></strong>
                <span>45분 전</span>
              </div>
              <p class="text-sm text-slate-700">@바다바라기 저는 토요일 오전 10시쯤 갔는데 여유 있었습니다.</p>
            </div>
          </div>
        </div>
      </section>
    </article>
  </section>
</template>
