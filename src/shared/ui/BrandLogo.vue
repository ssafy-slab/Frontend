<script setup lang="ts">
defineProps<{
  compact?: boolean
}>()
</script>

<template>
  <span class="inline-flex items-center font-black tracking-[-0.03em] text-slate-950" :class="compact ? 'text-xl' : 'text-2xl'">
    이짝<span class="text-brand-500">워뗘</span>
  </span>
</template>
