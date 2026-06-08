<script setup lang="ts">
import { CalendarDays, Home, MessageSquareText, Search } from 'lucide-vue-next'

defineProps<{
  activeView: string
}>()

const emit = defineEmits<{
  change: [view: string]
}>()

const navItems = [
  { label: '홈', view: 'home', icon: Home },
  { label: '탐색', view: 'explore', icon: Search },
  { label: '일정', view: 'schedule', icon: CalendarDays },
  { label: '커뮤니티', view: 'community', icon: MessageSquareText },
]

function isActive(view: string, activeView: string) {
  if (view === 'schedule') return activeView.startsWith('schedule')
  if (view === 'community') return activeView.startsWith('community')
  return activeView === view
}
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden" aria-label="모바일 빠른 이동">
    <div class="mx-auto grid max-w-md grid-cols-4 gap-1">
      <button
        v-for="item in navItems"
        :key="item.view"
        class="flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black transition"
        :class="isActive(item.view, activeView) ? 'bg-brand-50 text-brand-500' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
        @click="emit('change', item.view)"
      >
        <component :is="item.icon" :size="20" :stroke-width="isActive(item.view, activeView) ? 2.8 : 2.3" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
