<script setup lang="ts">
type User = {
  email: string
  nickname: string
}

defineProps<{
  currentUser: User | null
}>()

const emit = defineEmits<{
  change: [view: string]
}>()
</script>

<template>
  <section class="app-container py-6 md:py-8">
    <div class="mb-5">
      <p class="text-sm font-black text-brand-500">MY PAGE</p>
      <h1 class="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">내 정보 관리</h1>
    </div>

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside class="brand-card h-fit rounded-xl p-5">
        <div class="grid size-16 place-items-center rounded-full bg-brand-100 text-xl font-black text-brand-600">
          {{ currentUser?.nickname?.slice(0, 1) ?? '여' }}
        </div>
        <h2 class="mt-4 text-xl font-black text-slate-950">{{ currentUser?.nickname ?? '여행자' }}</h2>
        <p class="mt-1 text-sm font-semibold text-slate-500">{{ currentUser?.email ?? '로그인 후 이용할 수 있습니다.' }}</p>
        <button v-if="!currentUser" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="emit('change', 'login')">
          로그인하러 가기
        </button>
      </aside>

      <section class="brand-card rounded-xl p-5">
        <h2 class="text-lg font-black text-slate-950">기본 정보</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">닉네임</span>
            <input class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :value="currentUser?.nickname ?? '여행자'" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">이메일</span>
            <input class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :value="currentUser?.email ?? ''" placeholder="email@example.com" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">선호 여행 타입</span>
            <select class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none">
              <option>맛집 중심</option>
              <option>자연/힐링</option>
              <option>도시 산책</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">알림 설정</span>
            <select class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none">
              <option>이메일과 앱 알림</option>
              <option>앱 알림만</option>
              <option>알림 끄기</option>
            </select>
          </label>
        </div>

        <div class="mt-6 border-t border-slate-200 pt-5">
          <h3 class="font-black text-slate-950">활동 요약</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">내 일정</p>
              <p class="mt-1 text-2xl font-black text-slate-950">2</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">저장한 장소</p>
              <p class="mt-1 text-2xl font-black text-slate-950">8</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">커뮤니티 글</p>
              <p class="mt-1 text-2xl font-black text-slate-950">3</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700">취소</button>
          <button class="btn-primary h-10 rounded-lg px-5 text-sm">저장하기</button>
        </div>
      </section>
    </div>
  </section>
</template>
