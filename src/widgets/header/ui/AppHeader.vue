<script setup lang="ts">
import BrandLogo from '@/shared/ui/BrandLogo.vue'

type User = {
  email: string
  nickname: string
}

defineProps<{
  activeView: string
  currentUser: User | null
}>()

const emit = defineEmits<{
  change: [view: string]
  logout: []
}>()

const navItems = [
  { label: '홈', view: 'home' },
  { label: '탐색', view: 'explore' },
  { label: '일정', view: 'schedule' },
  { label: '커뮤니티', view: 'community' },
]

function isActive(view: string, activeView: string) {
  if (view === 'schedule') return activeView.startsWith('schedule')
  if (view === 'community') return activeView.startsWith('community')
  return activeView === view
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
    <div class="app-container grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4">
      <button class="text-left" @click="emit('change', 'home')">
        <BrandLogo compact />
      </button>

      <nav class="hidden h-full items-center justify-center gap-7 md:flex">
        <button
          v-for="item in navItems"
          :key="item.view"
          class="relative h-full px-1 text-sm font-black transition-colors lg:text-base"
          :class="isActive(item.view, activeView) ? 'text-brand-500' : 'text-slate-600 hover:text-brand-500'"
          @click="emit('change', item.view)"
        >
          {{ item.label }}
          <span
            v-if="isActive(item.view, activeView)"
            class="absolute inset-x-0 bottom-0 mx-auto h-1 w-full rounded-t-full bg-brand-500"
          />
        </button>
      </nav>

      <div class="flex items-center justify-end gap-2">
        <template v-if="currentUser">
          <span class="hidden max-w-28 truncate text-xs font-extrabold text-slate-700 sm:block">{{ currentUser.nickname }}님</span>
          <button class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-200" @click="emit('logout')">
            로그아웃
          </button>
        </template>
        <template v-else>
          <button
            class="rounded-lg px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-100 sm:text-sm"
            :class="activeView === 'login' ? 'bg-slate-100' : ''"
            @click="emit('change', 'login')"
          >
            로그인
          </button>
          <button class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 sm:text-sm" @click="emit('change', 'signup')">
            회원가입
          </button>
        </template>
      </div>
    </div>
  </header>
</template>
