<script setup lang="ts">
defineProps<{
  compact?: boolean
}>()
</script>

<template>
  <span class="inline-flex items-center gap-2 font-black tracking-[-0.03em] text-slate-950">
    <span
      class="grid place-items-center rounded-xl bg-brand-500 text-white shadow-sm shadow-indigo-200"
      :class="compact ? 'size-8 text-base' : 'size-10 text-xl'"
    >
      워
    </span>
    <span :class="compact ? 'text-xl' : 'text-2xl'">
      이짝<span class="text-brand-500">워뗘</span>
    </span>
  </span>
</template>
